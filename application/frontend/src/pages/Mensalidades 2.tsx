import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BRANCH_LABELS,
  YOUTH_BRANCHES,
  type MensalidadeCell,
  type MensalidadeReport,
  type MensalidadeRow,
  type MemberRole,
  type MemberStatus,
  type YouthBranchId,
} from "@shared";
import PageHeader from "../components/PageHeader";
import StatCard, { Badge } from "../components/StatCard";
import PageLoader from "../components/PageLoader";
import FetchOverlay from "../components/FetchOverlay";
import ListingResults from "../components/ListingResults";
import FilterBar from "../components/FilterBar";
import Pager from "../components/Pager";
import Modal from "../components/Modal";
import SubmitButton from "../components/SubmitButton";
import { AnimatePresence } from "framer-motion";
import { brl, formatDate, MONTHS, roleLabel, settlementLabel, todayISO } from "../lib/format";
import { matchesQuery, usePagedList } from "../lib/listing";
import { usePeriod } from "../lib/period";
import { useFetch } from "../lib/useFetch";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

const SHORT_MONTHS = ["Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const SCOUT_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function Mensalidades() {
  const navigate = useNavigate();
  const toast = useToast();
  const { year, month, setMonth } = usePeriod();
  const list = useFetch<MensalidadeReport>(`/mensalidades?year=${year}`);
  const channels = useFetch<{ email: boolean; whatsapp: boolean }>("/notify/status");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<YouthBranchId | "">("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "">("active");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "">("");
  const [picked, setPicked] = useState<{ row: MensalidadeRow; cell: MensalidadeCell } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dueDayDraft, setDueDayDraft] = useState("");
  const today = todayISO();
  const currentMonth = Number(today.slice(5, 7));
  const currentYear = Number(today.slice(0, 4));
  const chargeMonth = SCOUT_MONTHS.includes(month) ? month : SCOUT_MONTHS.includes(currentMonth) ? currentMonth : 3;

  const rows = list.data?.rows ?? [];
  const months = list.data?.months ?? [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const dueDay = list.data?.dueDay ?? 10;

  useEffect(() => {
    if (list.data?.dueDay) setDueDayDraft(String(list.data.dueDay));
  }, [list.data?.dueDay]);
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (branch && row.branch !== branch) return false;
        if (statusFilter && row.memberStatus !== statusFilter) return false;
        if (roleFilter && row.role !== roleFilter) return false;
        return matchesQuery(query, [row.name, BRANCH_LABELS[row.branch], roleLabel(row.role), `dia ${row.dueDay}`]);
      }),
    [rows, branch, statusFilter, roleFilter, query],
  );
  const listing = usePagedList(filtered, [query, branch, statusFilter, roleFilter, year].join("|"));
  const summary = useMemo(() => {
    const totals = { paid: 0, pending: 0, overdue: 0, openAmount: 0, paidAmount: 0 };
    for (const row of filtered) {
      for (const cell of row.cells) {
        if (cell.status === "paid") {
          totals.paid += 1;
          totals.paidAmount += cell.amount;
        } else if (cell.status === "pending") {
          totals.pending += 1;
          totals.openAmount += cell.amount;
        } else if (cell.status === "overdue") {
          totals.overdue += 1;
          totals.openAmount += cell.amount;
        }
      }
    }
    return totals;
  }, [filtered]);

  function openMonth(target: number) {
    setMonth(target);
    navigate("/fluxo");
  }

  async function notify(kind: "charge" | "receipt", transactionIds?: string[], targetMonth?: number) {
    setBusy(true);
    try {
      const result = await api<{ queued: number; sent: number; failed: number; skipped: number }>(
        "/mensalidades/notify",
        {
          method: "POST",
          body: JSON.stringify({
            year,
            kind,
            month: targetMonth,
            transactionIds,
          }),
        },
      );
      const parts = [
        result.queued ? `${result.queued} na fila` : "",
        result.sent ? `${result.sent} enviado(s)` : "",
        result.skipped ? `${result.skipped} sem contato` : "",
        result.failed ? `${result.failed} falhou(aram)` : "",
      ].filter(Boolean);
      toast.success(parts.length ? `${parts.join(" · ")}.` : "Nada a disparar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível disparar");
    } finally {
      setBusy(false);
    }
  }

  async function saveDueDay() {
    const next = Number(dueDayDraft);
    if (!Number.isInteger(next) || next < 1 || next > 31) {
      toast.error("Informe um dia entre 1 e 31.");
      return;
    }
    setBusy(true);
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ mensalidadeDueDay: next }),
      });
      toast.success("Dia de vencimento atualizado.");
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o vencimento");
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(transactionId: string) {
    setBusy(true);
    try {
      await api(`/transactions/${transactionId}`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: "paid", notifyReceipt: true }),
      });
      toast.success("Mensalidade marcada como paga. Comprovante entra na fila se houver contato.");
      setPicked(null);
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar como paga");
    } finally {
      setBusy(false);
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando mensalidades…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Mensalidades"
        title={`Ano escoteiro ${year}`}
        subtitle={`Março a dezembro. Vencimento todo dia ${dueDay}. Não sócios pagam a taxa extra e o acréscimo de pontualidade; sócios do Lindóia pagam só a base.`}
        actions={
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            onClick={() => void notify("charge", undefined, chargeMonth)}
          >
            Cobrar {MONTHS[chargeMonth - 1]}
          </button>
        }
      />

      <div className="grid-stats" style={{ marginBottom: 18 }}>
        <StatCard title="Pagas" value={String(summary.paid)} hint={brl(summary.paidAmount)} tone="pos" />
        <StatCard title="Pendentes" value={String(summary.pending)} hint="Ainda no prazo" />
        <StatCard title="Vencidas" value={String(summary.overdue)} hint={`Passou o dia ${dueDay}`} tone="neg" />
        <StatCard title="Em aberto" value={brl(summary.openAmount)} hint="Pendente + vencido" />
      </div>

      <FetchOverlay active={list.loading} label="Atualizando mensalidades…">
        <article className="card">
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, ramo ou dia de vencimento…"
              />
            </label>
            <label className="field">
              <span>Vence todo dia</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDayDraft}
                  onChange={(e) => setDueDayDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  aria-label="Dia de vencimento da mensalidade"
                  style={{ width: 72 }}
                />
                <button
                  className="btn btn-outline"
                  type="button"
                  disabled={busy || Number(dueDayDraft) === dueDay}
                  onClick={() => void saveDueDay()}
                >
                  Aplicar
                </button>
              </span>
            </label>
            <label className="field">
              <span>Ramo</span>
              <select value={branch} onChange={(e) => setBranch(e.target.value as YouthBranchId | "")}>
                <option value="">Todos</option>
                {YOUTH_BRANCHES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Papel</span>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as MemberRole | "")}>
                <option value="">Todos</option>
                <option value="jovem">Jovem</option>
                <option value="escotista">Escotista</option>
                <option value="dirigente">Dirigente</option>
                <option value="clube">Clube da Flor de Lis</option>
              </select>
            </label>
            <label className="field">
              <span>Situação do associado</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "")}>
                <option value="">Todas</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
          </FilterBar>
          <ListingResults fetching={list.loading} filtering={listing.busy} fetchLabel="Atualizando mensalidades…">
            <div className="table-wrap">
              <table className="data fees-grid">
                <thead>
                  <tr>
                    <th className="fees-grid__name">Associado</th>
                    {months.map((month) => (
                      <th
                        key={month}
                        className={`fees-grid__month${year === currentYear && month === currentMonth ? " is-current" : ""}`}
                      >
                        <button type="button" className="fees-grid__month-btn" onClick={() => openMonth(month)}>
                          {SHORT_MONTHS[month - 3]}
                          <small>{MONTHS[month - 1]}</small>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={1 + months.length} className="muted">
                        Nenhum associado com mensalidade nesses filtros.
                      </td>
                    </tr>
                  ) : (
                    listing.pageRows.map((row) => (
                      <tr key={row.memberId}>
                        <td className="fees-grid__name">
                          <strong>{row.name}</strong>
                          <div className="muted">
                            {BRANCH_LABELS[row.branch]} · {roleLabel(row.role)}
                            {row.clubeLtc ? " · sócio Lindóia" : ""} · {brl(row.monthlyFee)}
                            {row.lateFee !== row.monthlyFee ? ` · após dia ${row.dueDay} ${brl(row.lateFee)}` : ""}
                          </div>
                          <div className="muted">
                            Vence todo dia {row.dueDay} · ingresso {formatDate(row.joinedAt)}
                          </div>
                        </td>
                        {row.cells.map((cell) => (
                          <td
                            key={cell.month}
                            className={`fees-grid__month${year === currentYear && cell.month === currentMonth ? " is-current" : ""}`}
                          >
                            <FeeCell cell={cell} onOpen={() => setPicked({ row, cell })} />
                          </td>
                        ))}
                      </tr>
                    ))
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
        {picked && picked.cell.status !== "none" ? (
          <Modal title={`${picked.row.name} · ${MONTHS[picked.cell.month - 1]}`} onClose={() => setPicked(null)}>
            <p className="muted">
              {settlementLabel(picked.cell.status)} · {brl(picked.cell.amount)}
              {picked.cell.dueDate ? ` · vence ${formatDate(picked.cell.dueDate)}` : ""}
            </p>
            {!channels.data?.email && !channels.data?.whatsapp ? (
              <p className="muted">
                Configure MAIL_HOST no .env (ou MAIL_MOCK=1) para disparar cobrança e comprovante.
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setPicked(null)} disabled={busy}>
                Fechar
              </button>
              <button
                className="btn btn-outline"
                type="button"
                disabled={busy}
                onClick={() => openMonth(picked.cell.month)}
              >
                Ver no caixa
              </button>
              {picked.cell.status === "paid" ? (
                <SubmitButton
                  type="button"
                  busy={busy}
                  busyLabel="Enfileirando…"
                  onClick={() =>
                    picked.cell.transactionId ? void notify("receipt", [picked.cell.transactionId]) : undefined
                  }
                >
                  Enviar comprovante
                </SubmitButton>
              ) : (
                <>
                  <button
                    className="btn btn-outline"
                    type="button"
                    disabled={busy || !picked.cell.transactionId}
                    onClick={() =>
                      picked.cell.transactionId
                        ? void notify("charge", [picked.cell.transactionId], picked.cell.month)
                        : undefined
                    }
                  >
                    Cobrar
                  </button>
                  <SubmitButton
                    type="button"
                    busy={busy}
                    busyLabel="Registrando…"
                    onClick={() => (picked.cell.transactionId ? void markPaid(picked.cell.transactionId) : undefined)}
                  >
                    Marcar paga
                  </SubmitButton>
                </>
              )}
            </div>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FeeCell({ cell, onOpen }: { cell: MensalidadeCell; onOpen: () => void }) {
  if (cell.status === "none") {
    return <span className="muted">—</span>;
  }
  return (
    <button
      type="button"
      className={`fee-cell fee-cell--${cell.status}`}
      title={`${settlementLabel(cell.status)} · vencimento ${formatDate(cell.dueDate ?? "")}`}
      onClick={onOpen}
    >
      <Badge kind={cell.status}>{settlementLabel(cell.status)}</Badge>
      <small>{brl(cell.amount)}</small>
    </button>
  );
}
