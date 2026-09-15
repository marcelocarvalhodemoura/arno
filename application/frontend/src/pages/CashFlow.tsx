import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  YOUTH_BRANCHES,
  type BranchId,
  type FinancialProject,
  type Member,
  type MemberAccount,
  type MemberGuardian,
  type MovementType,
  type PaymentMethod,
  type Transaction,
  type TxNature,
  type TxPaymentStatus,
  type TxType,
} from "@shared";
import PageHeader from "../components/PageHeader";
import IdentifyPaymentsGuide from "../components/IdentifyPaymentsGuide";
import Modal from "../components/Modal";
import StatCard, { Badge } from "../components/StatCard";
import RecordStamp from "../components/RecordStamp";
import PageLoader from "../components/PageLoader";
import FetchOverlay from "../components/FetchOverlay";
import ListingResults from "../components/ListingResults";
import SubmitButton from "../components/SubmitButton";
import FilterBar from "../components/FilterBar";
import Pager from "../components/Pager";
import IconButton from "../components/IconButton";
import { AnimatePresence } from "framer-motion";
import { FaCheck, FaClock, FaPen, FaTag, FaTrashAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../api/client";
import {
  brl,
  chartMoney,
  formatDate,
  methodLabel,
  monthLabel,
  natureLabel,
  originLabel,
  settlementLabel,
  settlementOf,
  signedClass,
  typeLabel,
} from "../lib/format";
import { formatMoney, maskMoney, parseMoney } from "../lib/masks";
import { formClass, submitAttempt } from "../lib/form";
import { matchesQuery, usePagedList } from "../lib/listing";
import { dateInPeriod, periodRange, usePeriod } from "../lib/period";
import { useFetch } from "../lib/useFetch";
import {
  clearIdentifyFlag,
  isUnidentifiedName,
  natureForTypeName,
  readIdentifyFlag,
} from "../lib/movement";

type Flow = {
  opening: number;
  closing: number;
  months: { month: string; income: number; expense: number; net: number; balance: number }[];
};

type StampUser = { id: string; name: string; username: string } | null;

type MemberOption = Member & { accounts: MemberAccount[]; guardians?: MemberGuardian[] };

type TxView = Transaction & {
  movementType: MovementType | null;
  member: Member | null;
  account: MemberAccount | null;
  guardian: MemberGuardian | null;
  createdByUser: StampUser;
  updatedByUser: StampUser;
};

function blankForm(year: number, month: number) {
  return {
    date: dateInPeriod(year, month),
    type: "income" as TxType,
    nature: "variable" as TxNature,
    movementTypeId: "",
    description: "",
    amount: "",
    branch: "grupo" as BranchId,
    method: "pix" as PaymentMethod,
    paymentStatus: "paid" as TxPaymentStatus,
    memberId: "",
    memberAccountId: "",
    memberGuardianId: "",
    projectId: "",
  };
}

export default function CashFlow() {
  const { role } = useAuth();
  const toast = useToast();
  const showChart = role === "admin";
  const { year, month, setYear, setMonth } = usePeriod();
  const { from, to } = periodRange(year, month);
  const flow = useFetch<Flow>(`/reports/cashflow?from=${from}&to=${to}`);
  const txs = useFetch<TxView[]>(`/transactions?from=${from}&to=${to}`);
  const yearTxs = useFetch<TxView[]>(month ? `/transactions?from=${year}-01-01&to=${year}-12-31` : null);
  const types = useFetch<MovementType[]>("/movement-types");
  const members = useFetch<MemberOption[]>("/members");
  const projects = useFetch<FinancialProject[]>(`/projects?year=${year || 2026}`);
  const [open, setOpen] = useState(false);
  const [identifying, setIdentifying] = useState<TxView | null>(null);
  const [identifyQueue, setIdentifyQueue] = useState<string[]>([]);
  const [identifyIndex, setIdentifyIndex] = useState(0);
  const pendingIdentify = useRef(readIdentifyFlag());
  const [editing, setEditing] = useState<TxView | null>(null);
  const [form, setForm] = useState(() => blankForm(year, month));
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TxType | "">("");
  const [natureFilter, setNatureFilter] = useState<TxNature | "">("");
  const [branchFilter, setBranchFilter] = useState<BranchId | "">("");
  const [movementFilter, setMovementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"paid" | "pending" | "overdue" | "">("");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const chart = useMemo(
    () =>
      (flow.data?.months ?? []).map((m) => ({
        name: monthLabel(m.month),
        Saldo: m.balance,
        Entradas: m.income,
        Saídas: m.expense,
      })),
    [flow.data],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (txs.data ?? []).filter((t) => {
      if (typeFilter && t.type !== typeFilter) return false;
      if (natureFilter && t.nature !== natureFilter) return false;
      if (branchFilter && t.branch !== branchFilter) return false;
      if (movementFilter === "__unidentified__") {
        if (!isUnidentifiedName(t.movementType?.name)) return false;
      } else if (movementFilter && t.movementTypeId !== movementFilter) {
        return false;
      }
      const settlement = settlementOf(t.paymentStatus, t.date);
      if (statusFilter && settlement !== statusFilter) return false;
      if (term) {
        if (
          !matchesQuery(term, [
            t.description,
            t.movementType?.name,
            t.member?.name,
            t.guardian?.name,
            t.guardian?.relationship,
            t.account?.holderName,
            t.createdByUser?.name,
            t.updatedByUser?.name,
            originLabel(t.origin),
            BRANCH_LABELS[t.branch],
            settlementLabel(settlement),
          ])
        ) {
          return false;
        }
      }
      return true;
    });
  }, [txs.data, query, typeFilter, natureFilter, branchFilter, movementFilter, statusFilter]);

  const unidentified = useMemo(() => {
    const source = month ? (yearTxs.data ?? []) : (txs.data ?? []);
    return [...source]
      .filter((item) => isUnidentifiedName(item.movementType?.name))
      .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
  }, [month, yearTxs.data, txs.data]);

  const identifyTypes = useMemo(() => {
    if (!identifying) return [];
    return (types.data ?? []).filter(
      (item) =>
        item.active &&
        !isUnidentifiedName(item.name) &&
        (item.direction === "both" || item.direction === identifying.type),
    );
  }, [types.data, identifying]);

  const listing = usePagedList(
    filtered,
    [query, typeFilter, natureFilter, branchFilter, movementFilter, statusFilter, from, to].join("|"),
  );

  const selectedMember = (members.data ?? []).find((m) => m.id === form.memberId);
  const selectedGuardians = selectedMember?.role === "jovem" ? (selectedMember.guardians ?? []) : [];
  const allowedTypes = useMemo(() => {
    const list = (types.data ?? []).filter(
      (item) => item.active && (item.direction === "both" || item.direction === form.type),
    );
    const current = (types.data ?? []).find((item) => item.id === form.movementTypeId);
    if (current && !list.some((item) => item.id === current.id)) {
      return [current, ...list];
    }
    return list;
  }, [types.data, form.type, form.movementTypeId]);

  function onMemberChange(memberId: string) {
    const member = (members.data ?? []).find((m) => m.id === memberId);
    const primary = member?.accounts.find((a) => a.isPrimary && a.active) ?? member?.accounts[0];
    const firstGuardian = member?.role === "jovem" ? member.guardians?.[0]?.id ?? "" : "";
    setForm({
      ...form,
      memberId,
      memberAccountId: primary?.id ?? "",
      memberGuardianId: firstGuardian,
      branch: member?.branch ?? form.branch,
    });
  }

  function closeForm() {
    setOpen(false);
    setIdentifying(null);
    setIdentifyQueue([]);
    setIdentifyIndex(0);
    setEditing(null);
    setForm(blankForm(year, month));
    setError(null);
    setAttempted(false);
  }

  function showIdentify(tx: TxView) {
    const stamp = tx.date.slice(0, 10);
    const nextYear = Number(stamp.slice(0, 4));
    const nextMonth = Number(stamp.slice(5, 7));
    if (nextYear && nextMonth && (nextYear !== year || nextMonth !== month)) {
      setYear(nextYear);
      setMonth(nextMonth);
    }
    setOpen(false);
    setEditing(null);
    setIdentifying(tx);
    setForm({
      date: stamp,
      type: tx.type,
      nature: tx.nature,
      movementTypeId: "",
      description: tx.description,
      amount: formatMoney(tx.amount),
      branch: tx.branch,
      method: tx.method,
      paymentStatus: tx.paymentStatus ?? "paid",
      memberId: tx.memberId ?? "",
      memberAccountId: tx.memberAccountId ?? "",
      memberGuardianId: tx.memberGuardianId ?? "",
      projectId: tx.projectId ?? "",
    });
    setError(null);
    setAttempted(false);
  }

  function startIdentifyQueue(list: TxView[], fromId?: string) {
    if (!list.length) return;
    const start = fromId ? Math.max(0, list.findIndex((item) => item.id === fromId)) : 0;
    const queue = list.slice(start);
    setIdentifyQueue(queue.map((item) => item.id));
    setIdentifyIndex(0);
    showIdentify(queue[0]!);
  }

  function skipIdentify() {
    const nextIndex = identifyIndex + 1;
    const nextId = identifyQueue[nextIndex];
    const next = unidentified.find((item) => item.id === nextId) ?? (txs.data ?? []).find((item) => item.id === nextId);
    if (!next) {
      closeForm();
      toast.success("Não há mais lançamentos para identificar neste lote.");
      return;
    }
    setIdentifyIndex(nextIndex);
    showIdentify(next);
  }

  function openCreate() {
    setIdentifying(null);
    setIdentifyQueue([]);
    setEditing(null);
    setForm(blankForm(year, month));
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function openEdit(tx: TxView) {
    setIdentifying(null);
    setIdentifyQueue([]);
    setEditing(tx);
    setForm({
      date: tx.date.slice(0, 10),
      type: tx.type,
      nature: tx.nature,
      movementTypeId: tx.movementTypeId,
      description: tx.description,
      amount: formatMoney(tx.amount),
      branch: tx.branch,
      method: tx.method,
      paymentStatus: tx.paymentStatus ?? "paid",
      memberId: tx.memberId ?? "",
      memberAccountId: tx.memberAccountId ?? "",
      memberGuardianId: tx.memberGuardianId ?? "",
      projectId: tx.projectId ?? "",
    });
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  async function onSave(e: FormEvent) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    const amount = parseMoney(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    const payload = {
      ...form,
      amount,
      memberId: form.memberId || null,
      memberAccountId: form.memberAccountId || null,
      memberGuardianId: form.memberGuardianId || null,
      projectId: form.projectId || null,
    };
    try {
      if (editing) {
        await api(`/transactions/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Lançamento alterado com sucesso.");
      } else {
        await api("/transactions", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            memberId: form.memberId || undefined,
            memberAccountId: form.memberAccountId || undefined,
            memberGuardianId: form.memberGuardianId || undefined,
            projectId: form.projectId || undefined,
          }),
        });
        toast.success("Lançamento cadastrado com sucesso.");
      }
      closeForm();
      void Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o lançamento");
    } finally {
      setSaving(false);
    }
  }

  async function onIdentify(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    if (!identifying) return;
    const movement = (types.data ?? []).find((item) => item.id === form.movementTypeId);
    if (!movement || isUnidentifiedName(movement.name)) {
      setError("Escolha o tipo de movimentação");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/transactions/${identifying.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          movementTypeId: movement.id,
          nature: natureForTypeName(movement.name),
          branch: form.branch,
          memberId: form.memberId || null,
          memberGuardianId: form.memberGuardianId || null,
        }),
      });
      const nextId = identifyQueue[identifyIndex + 1];
      const next = unidentified.find((item) => item.id === nextId);
      if (next) {
        setIdentifyIndex((index) => index + 1);
        showIdentify(next);
        toast.success("Tipo definido. Confira o próximo lançamento.");
      } else {
        closeForm();
        toast.success("Lançamento identificado.");
      }
      void Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível identificar o lançamento");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    await api(`/transactions/${id}`, { method: "DELETE" });
    toast.success("Lançamento excluído com sucesso.");
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  async function setPaymentStatus(tx: TxView, paymentStatus: TxPaymentStatus) {
    await api(`/transactions/${tx.id}`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus }),
    });
    toast.success(
      paymentStatus === "paid"
        ? "Lançamento conciliado com sucesso."
        : "Lançamento marcado como pendente.",
    );
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  useEffect(() => {
    if (!pendingIdentify.current || !unidentified.length) return;
    pendingIdentify.current = false;
    clearIdentifyFlag();
    startIdentifyQueue(unidentified);
  }, [unidentified]);

  const data = flow.data;
  if (!data) {
    if (flow.error) return <p className="error">{flow.error}</p>;
    return <PageLoader label="Carregando fluxo de caixa…" />;
  }

  const refreshing = (flow.loading || txs.loading) && Boolean(flow.data);
  const periodIncome = data.months.reduce((s, m) => s + m.income, 0);
  const periodExpense = data.months.reduce((s, m) => s + m.expense, 0);

  return (
    <div>
      <PageHeader
        kicker="Fluxo de caixa"
        title="Entradas e saídas"
        subtitle="Lançamentos do caixa com conciliação: pago em verde, pendente em amarelo e vencido em vermelho. Linhas do extrato sem tipo entram como não identificadas para classificar na sequência."
        actions={
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            Lançamento manual
          </button>
        }
      />

      <IdentifyPaymentsGuide />

      {unidentified.length ? (
        <article className="card identify-banner">
          <div>
            <strong>
              {unidentified.length === 1
                ? "1 lançamento sem tipo definido"
                : `${unidentified.length} lançamentos sem tipo definido`}
            </strong>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Vieram do extrato e ainda não têm tipo de movimentação. Identifique um a um: tipo, associado e ramo.
            </p>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => startIdentifyQueue(unidentified)}>
            Identificar agora
          </button>
        </article>
      ) : null}

      <FetchOverlay active={refreshing} label="Atualizando lançamentos…">
      <div className="grid-stats">
        <StatCard title="Saldo inicial" value={brl(data.opening)} hint="Antes do período" />
        <StatCard title="Entradas no período" value={brl(periodIncome)} tone="pos" />
        <StatCard title="Saídas no período" value={brl(periodExpense)} tone="neg" />
        <StatCard title="Saldo atual" value={brl(data.closing)} />
      </div>

      {showChart ? (
        <article className="card chart-card" style={{ marginTop: 16 }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="saldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0c2d6b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0c2d6b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,45,107,.12)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={chartMoney} />
              <Area type="monotone" dataKey="Saldo" stroke="#0c2d6b" fill="url(#saldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      ) : null}

      <article className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Lançamentos</h3>
        <FilterBar>
          <label className="field">
            <span>Buscar</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Descrição, associado, tipo…"
            />
          </label>
          <label className="field">
            <span>Entrada / saída</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TxType | "")}>
              <option value="">Todas</option>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </select>
          </label>
          <label className="field">
            <span>Natureza</span>
            <select
              value={natureFilter}
              onChange={(e) => setNatureFilter(e.target.value as TxNature | "")}
            >
              <option value="">Todas</option>
              <option value="fixed">Fixa</option>
              <option value="variable">Variável</option>
            </select>
          </label>
          <label className="field">
            <span>Ramo</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value as BranchId | "")}
            >
              <option value="">Todos</option>
              {ALL_BRANCHES.map((id) => (
                <option key={id} value={id}>
                  {BRANCH_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo de movimentação</span>
            <select value={movementFilter} onChange={(e) => setMovementFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="__unidentified__">Não identificado</option>
              {(types.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Conciliação</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "paid" | "pending" | "overdue" | "")}
            >
              <option value="">Todas</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="overdue">Vencido</option>
            </select>
          </label>
        </FilterBar>

        <ListingResults
          fetching={refreshing}
          filtering={listing.busy}
          fetchLabel="Atualizando lançamentos…"
        >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Lançamento</th>
                <th>Tipo</th>
                <th>Ramo</th>
                <th>Natureza</th>
                <th>Conciliação</th>
                <th className="num">Valor</th>
                <th className="cell-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listing.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">
                    Nenhum lançamento com esses filtros.
                  </td>
                </tr>
              ) : (
                listing.pageRows.map((t) => {
                  const settlement = settlementOf(t.paymentStatus, t.date);
                  const unidentifiedRow = isUnidentifiedName(t.movementType?.name);
                  return (
                  <tr key={t.id} className={`is-${settlement}${unidentifiedRow ? " is-unidentified" : ""}`}>
                    <td>{formatDate(t.date)}</td>
                    <td>
                      <strong>{t.description}</strong>
                      <div className="muted">
                        {t.member ? `${t.member.name} · ` : ""}
                        {t.guardian ? `${t.guardian.name} (${t.guardian.relationship}) · ` : ""}
                        {t.account ? `${t.account.holderName} · ` : ""}
                        {methodLabel(t.method)}
                      </div>
                      <RecordStamp
                        origin={t.origin}
                        createdAt={t.createdAt}
                        createdBy={t.createdByUser}
                        updatedAt={t.updatedAt}
                        updatedBy={t.updatedByUser}
                      />
                    </td>
                    <td>
                      <Badge kind={t.type}>{t.movementType?.name ?? "—"}</Badge>
                    </td>
                    <td>
                      <span className="branch-dot" style={{ background: colorOf(t.branch) }} />{" "}
                      {BRANCH_LABELS[t.branch]}
                    </td>
                    <td>
                      <Badge kind={t.nature}>{natureLabel(t.nature)}</Badge>
                    </td>
                    <td>
                      <Badge kind={settlement}>{settlementLabel(settlement)}</Badge>
                    </td>
                    <td className={`num ${signedClass(t.type === "income" ? t.amount : -t.amount)}`}>
                      {t.type === "income" ? "+" : "−"} {brl(t.amount)}
                    </td>
                    <td className="cell-actions">
                      {unidentifiedRow ? (
                        <IconButton label="Identificar tipo" onClick={() => startIdentifyQueue(unidentified, t.id)}>
                          <FaTag />
                        </IconButton>
                      ) : null}
                      {settlement === "paid" ? (
                        <IconButton
                          label="Marcar como pendente"
                          onClick={() => void setPaymentStatus(t, "pending")}
                        >
                          <FaClock />
                        </IconButton>
                      ) : (
                        <IconButton
                          label="Marcar como pago"
                          tone="success"
                          onClick={() => void setPaymentStatus(t, "paid")}
                        >
                          <FaCheck />
                        </IconButton>
                      )}
                      <IconButton label="Alterar lançamento" onClick={() => openEdit(t)}>
                        <FaPen />
                      </IconButton>
                      <IconButton label="Excluir lançamento" tone="danger" onClick={() => void remove(t.id)}>
                        <FaTrashAlt />
                      </IconButton>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pager
          total={listing.total}
          fromRow={listing.fromRow}
          toRow={listing.toRow}
          pageSize={listing.pageSize}
          currentPage={listing.currentPage}
          pageCount={listing.pageCount}
          onPageSize={listing.setPageSize}
          onPage={listing.setPage}
        />
        </ListingResults>
      </article>
      </FetchOverlay>

      <AnimatePresence>
      {open ? (
        <Modal title={editing ? "Alterar lançamento" : "Lançamento manual"} onClose={closeForm}>
          <form onSubmit={onSave} className={formClass("form-grid", attempted)} noValidate>
            {error ? <div className="error wide">{error}</div> : null}
            <label className="field">
              <span>Vencimento</span>
              <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="field">
              <span>Situação</span>
              <select
                required
                value={form.paymentStatus}
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as TxPaymentStatus })}
              >
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
              </select>
            </label>
            <label className="field">
              <span>Entrada ou saída</span>
              <select
                required
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as TxType, movementTypeId: "" })
                }
              >
                <option value="income">Entrada</option>
                <option value="expense">Saída</option>
              </select>
            </label>
            <div className="field">
              <span>
                Conta fixa ou variável
                <abbr className="req" title="Obrigatório">
                  *
                </abbr>
              </span>
              <div className="flag-row">
                <button
                  type="button"
                  className={`flag ${form.nature === "fixed" ? "is-on" : ""}`}
                  onClick={() => setForm({ ...form, nature: "fixed" })}
                >
                  Fixa
                </button>
                <button
                  type="button"
                  className={`flag ${form.nature === "variable" ? "is-on" : ""}`}
                  onClick={() => setForm({ ...form, nature: "variable" })}
                >
                  Variável
                </button>
              </div>
            </div>
            <label className="field">
              <span>Tipo de movimentação</span>
              <select
                required
                value={form.movementTypeId}
                onChange={(e) => setForm({ ...form, movementTypeId: e.target.value })}
              >
                <option value="">Selecione</option>
                {allowedTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {!t.active ? " (inativo)" : ""}
                    {t.direction !== "both" && t.direction !== form.type ? " · direção diferente" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field wide">
              <span>Descrição</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                minLength={2}
              />
            </label>
            <label className={`field${attempted && !(parseMoney(form.amount) > 0) ? " is-invalid" : ""}`}>
              <span>Valor (R$)</span>
              <input
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: maskMoney(e.target.value) })}
                placeholder="0,00"
                required
              />
            </label>
            <label className="field">
              <span>Ramo</span>
              <select required value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value as BranchId })}>
                {ALL_BRANCHES.map((id) => (
                  <option key={id} value={id}>
                    {BRANCH_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Associado (opcional)</span>
              <select value={form.memberId} onChange={(e) => onMemberChange(e.target.value)}>
                <option value="">Sem associado</option>
                {(members.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {BRANCH_LABELS[m.branch]}
                  </option>
                ))}
              </select>
            </label>
            {selectedMember?.role === "jovem" ? (
              <label className="field">
                <span>Responsável</span>
                <select
                  value={form.memberGuardianId}
                  onChange={(e) => setForm({ ...form, memberGuardianId: e.target.value })}
                >
                  <option value="">Não informar</option>
                  {selectedGuardians.map((guardian) => (
                    <option key={guardian.id} value={guardian.id}>
                      {guardian.name} · {guardian.relationship}
                    </option>
                  ))}
                </select>
                {selectedGuardians.length === 0 ? (
                  <span className="muted">Cadastre o responsável no associado para vincular neste lançamento.</span>
                ) : null}
              </label>
            ) : null}
            <label className="field">
              <span>Conta do pagamento</span>
              <select
                value={form.memberAccountId}
                onChange={(e) => setForm({ ...form, memberAccountId: e.target.value })}
                disabled={!selectedMember}
              >
                <option value="">Não informar</option>
                {(selectedMember?.accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.holderName} · {a.relationship}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Projeto financeiro</span>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              >
                <option value="">Nenhum</option>
                {(projects.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Meio</span>
              <select required value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
                <option value="pix">Pix</option>
                <option value="transfer">Transferência</option>
                <option value="cash">Dinheiro</option>
                <option value="card">Cartão</option>
                <option value="other">Outro</option>
              </select>
            </label>
            <p className="muted wide">
              Natureza: {natureLabel(form.nature)} · {typeLabel(form.type)}
              {selectedMember ? ` · ${selectedMember.name}` : ""}
            </p>
            <div className="modal-actions wide">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>
                Cancelar
              </button>
              <SubmitButton busy={saving} busyLabel={editing ? "Salvando…" : "Lançando…"}>
                {editing ? "Salvar alteração" : "Lançar"}
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}
      {identifying ? (
        <Modal
          title={
            identifyQueue.length > 1
              ? `Identificar lançamento · ${identifyIndex + 1} de ${identifyQueue.length}`
              : "Identificar lançamento"
          }
          onClose={closeForm}
        >
          <form onSubmit={(event) => void onIdentify(event)} className={formClass("form-grid", attempted)} noValidate>
            {error ? <div className="error wide">{error}</div> : null}
            <p className="muted wide">
              {formatDate(identifying.date)} · {typeLabel(identifying.type)} · {brl(identifying.amount)}
              <br />
              {identifying.description}
            </p>
            <label className="field wide">
              <span>
                Tipo de movimentação
                <abbr className="req" title="Obrigatório">
                  *
                </abbr>
              </span>
              <select
                required
                value={form.movementTypeId}
                onChange={(e) => {
                  const movement = (types.data ?? []).find((item) => item.id === e.target.value);
                  setForm({
                    ...form,
                    movementTypeId: e.target.value,
                    nature: movement ? natureForTypeName(movement.name) : form.nature,
                  });
                }}
              >
                <option value="">Selecione o tipo</option>
                {identifyTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Associado (opcional)</span>
              <select value={form.memberId} onChange={(e) => onMemberChange(e.target.value)}>
                <option value="">Sem associado</option>
                {(members.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {BRANCH_LABELS[m.branch]}
                  </option>
                ))}
              </select>
            </label>
            {selectedMember?.role === "jovem" ? (
              <label className="field">
                <span>Responsável</span>
                <select
                  value={form.memberGuardianId}
                  onChange={(e) => setForm({ ...form, memberGuardianId: e.target.value })}
                >
                  <option value="">Não informar</option>
                  {selectedGuardians.map((guardian) => (
                    <option key={guardian.id} value={guardian.id}>
                      {guardian.name} · {guardian.relationship}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>Ramo</span>
              <select
                required
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value as BranchId })}
              >
                {ALL_BRANCHES.map((id) => (
                  <option key={id} value={id}>
                    {BRANCH_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted wide">
              Natureza: {natureLabel(form.nature)} · {typeLabel(form.type)}
              {selectedMember ? ` · ${selectedMember.name}` : ""}
            </p>
            <div className="modal-actions wide">
              {identifyQueue.length > 1 ? (
                <button className="btn btn-ghost" type="button" onClick={skipIdentify} disabled={saving}>
                  Pular
                </button>
              ) : (
                <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>
                  Cancelar
                </button>
              )}
              <SubmitButton busy={saving} busyLabel="Identificando…">
                Identificar
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}
      </AnimatePresence>
    </div>
  );
}

function colorOf(branch: BranchId): string {
  if (branch === "grupo") return "#0c2d6b";
  return YOUTH_BRANCHES.find((b) => b.id === branch)?.color ?? "#0c2d6b";
}
