import { useMemo, useState, type FormEvent } from "react";
import {
  BRANCH_LABELS,
  GUARDIAN_RELATIONSHIPS,
  YOUTH_BRANCHES,
  type AccountHolderKind,
  type Member,
  type MemberAccount,
  type MemberGuardian,
  type MemberRole,
  type YouthBranchId,
} from "@shared";
import RecordStamp from "../components/RecordStamp";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { Badge } from "../components/StatCard";
import PageLoader from "../components/PageLoader";
import FetchOverlay from "../components/FetchOverlay";
import ListingResults from "../components/ListingResults";
import SubmitButton from "../components/SubmitButton";
import FilterBar from "../components/FilterBar";
import Pager from "../components/Pager";
import IconButton from "../components/IconButton";
import { AnimatePresence } from "framer-motion";
import { FaPen, FaTrashAlt, FaUserCheck, FaUserSlash, FaWallet } from "react-icons/fa";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { brl, formatDate, holderKindLabel, roleLabel, yesNo } from "../lib/format";
import { matchesQuery, usePagedList } from "../lib/listing";
import { formatMoney, maskMoney, maskPhone, parseMoney } from "../lib/masks";
import { formClass, submitAttempt } from "../lib/form";
import { useFetch } from "../lib/useFetch";

type AuditUser = { id: string; name: string; username: string } | null;
type MemberView = Member & {
  accounts: (MemberAccount & { createdByUser?: AuditUser; updatedByUser?: AuditUser })[];
  guardians: (MemberGuardian & { createdByUser?: AuditUser; updatedByUser?: AuditUser })[];
  createdByUser?: AuditUser;
  updatedByUser?: AuditUser;
};

type GuardianDraft = {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
};

const emptyMember = {
  name: "",
  email: "",
  phone: "",
  branch: "escoteiro" as YouthBranchId,
  role: "jovem" as MemberRole,
  monthlyFee: "60,00",
  joinedAt: new Date().toISOString().slice(0, 10),
  clubeLtc: false,
};

function blankGuardian(): GuardianDraft {
  return { name: "", relationship: "Mãe", phone: "", email: "" };
}

const emptyAccount = {
  holderName: "",
  holderKind: "parent" as AccountHolderKind,
  relationship: "Mãe",
  pixKey: "",
  bank: "",
  agency: "",
  accountNumber: "",
  document: "",
  isPrimary: true,
};

export default function Members() {
  const toast = useToast();
  const list = useFetch<MemberView[]>("/members");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemberView | null>(null);
  const [form, setForm] = useState(emptyMember);
  const [guardians, setGuardians] = useState<GuardianDraft[]>([blankGuardian()]);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<YouthBranchId | "">("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "">("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
  const [ltcFilter, setLtcFilter] = useState<"yes" | "no" | "">("");
  const [accountsOf, setAccountsOf] = useState<MemberView | null>(null);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [accountQuery, setAccountQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [attemptedAccount, setAttemptedAccount] = useState(false);

  const members = list.data ?? [];
  const filtered = useMemo(
    () =>
      members.filter((m) => {
        if (branch && m.branch !== branch) return false;
        if (roleFilter && m.role !== roleFilter) return false;
        if (statusFilter && m.status !== statusFilter) return false;
        if (ltcFilter === "yes" && !m.clubeLtc) return false;
        if (ltcFilter === "no" && m.clubeLtc) return false;
        return matchesQuery(query, [
          m.name,
          m.email,
          m.phone,
          BRANCH_LABELS[m.branch],
          roleLabel(m.role),
          yesNo(m.clubeLtc),
          m.clubeLtc ? "Clube LTC" : "",
          ...m.accounts.map((a) => a.holderName),
          ...(m.role === "jovem" ? (m.guardians ?? []).map((guardian) => `${guardian.name} ${guardian.relationship}`) : []),
        ]);
      }),
    [members, branch, roleFilter, statusFilter, ltcFilter, query],
  );
  const listing = usePagedList(filtered, [query, branch, roleFilter, statusFilter, ltcFilter].join("|"));
  const accountRows = (accountsOf?.accounts ?? []).filter((a) =>
    matchesQuery(accountQuery, [a.holderName, a.relationship, a.pixKey, a.bank, a.document]),
  );
  const accountListing = usePagedList(accountRows, `${accountsOf?.id ?? ""}|${accountQuery}`);

  function openCreate() {
    setEditing(null);
    setForm(emptyMember);
    setGuardians([blankGuardian()]);
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function openEdit(member: MemberView) {
    setEditing(member);
    setForm({
      name: member.name,
      email: member.email,
      phone: maskPhone(member.phone),
      branch: member.branch,
      role: member.role,
      monthlyFee: formatMoney(member.monthlyFee),
      joinedAt: member.joinedAt.slice(0, 10),
      clubeLtc: member.clubeLtc,
    });
    setGuardians(
      member.role === "jovem" && (member.guardians ?? []).length
        ? (member.guardians ?? []).map((guardian) => ({
            id: guardian.id,
            name: guardian.name,
            relationship: guardian.relationship,
            phone: maskPhone(guardian.phone),
            email: guardian.email,
          }))
        : member.role === "jovem"
          ? [blankGuardian()]
          : [],
    );
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setForm(emptyMember);
    setGuardians([blankGuardian()]);
    setError(null);
    setAttempted(false);
  }

  function changeRole(role: MemberRole) {
    setForm({ ...form, role });
    if (role === "jovem" && guardians.length === 0) {
      setGuardians([blankGuardian()]);
    }
  }

  function patchGuardian(index: number, patch: Partial<GuardianDraft>) {
    setGuardians((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function save(e: FormEvent) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    const monthlyFee = parseMoney(form.monthlyFee);
    if (!Number.isFinite(monthlyFee) || monthlyFee < 0) return;
    const payload: Record<string, unknown> = { ...form, monthlyFee };
    if (form.role === "jovem") {
      const list = guardians
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          relationship: item.relationship.trim(),
          phone: item.phone.trim(),
          email: item.email.trim(),
        }))
        .filter((item) => item.name.length >= 2);
      if (!list.length) return;
      payload.guardians = list;
    }
    setSaving(true);
    try {
      if (editing) {
        await api(`/members/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Associado alterado com sucesso.");
      } else {
        await api("/members", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Associado cadastrado com sucesso.");
      }
      closeForm();
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o associado");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(member: Member) {
    await api(`/members/${member.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: member.status === "active" ? "inactive" : "active",
      }),
    });
    await list.reload();
    toast.success("Associado alterado com sucesso.");
  }

  async function addAccount(e: FormEvent) {
    if (!submitAttempt(e, setAttemptedAccount)) return;
    if (!accountsOf) return;
    setSavingAccount(true);
    try {
      await api(`/members/${accountsOf.id}/accounts`, {
        method: "POST",
        body: JSON.stringify(accountForm),
      });
      setAccountForm(emptyAccount);
      await list.reload();
      const next = await api<MemberView[]>("/members");
      setAccountsOf(next.find((m) => m.id === accountsOf.id) ?? null);
      toast.success("Conta de pagamento cadastrada com sucesso.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function removeAccount(id: string) {
    if (!confirm("Excluir esta conta de pagamento?")) return;
    await api(`/member-accounts/${id}`, { method: "DELETE" });
    toast.success("Conta de pagamento excluída com sucesso.");
    await list.reload();
    if (!accountsOf) return;
    const next = await api<MemberView[]>("/members");
    setAccountsOf(next.find((m) => m.id === accountsOf.id) ?? null);
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando associados…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Associados"
        title="Cadastro e responsáveis"
        subtitle="Jovens entram com pai, mãe, tio, avós ou outro responsável. Associados e lançamentos já cadastrados também podem receber ou alterar esses dados."
        actions={
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            Novo associado
          </button>
        }
      />

      <FetchOverlay active={list.loading} label="Atualizando associados…">
      <article className="card">
        <FilterBar>
          <label className="field">
            <span>Buscar</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, e-mail, telefone, responsável…"
            />
          </label>
          <label className="field">
            <span>Ramo</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value as YouthBranchId | "")}>
              <option value="">Todos</option>
              {YOUTH_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
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
            <span>Situação</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "")}
            >
              <option value="">Todas</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>
          <label className="field">
            <span>Clube LTC</span>
            <select value={ltcFilter} onChange={(e) => setLtcFilter(e.target.value as "yes" | "no" | "")}>
              <option value="">Todos</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </label>
        </FilterBar>
        <ListingResults
          fetching={list.loading}
          filtering={listing.busy}
          fetchLabel="Atualizando associados…"
        >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ramo</th>
                <th>Papel</th>
                <th>Responsáveis</th>
                <th>Cadastro</th>
                <th>Contas</th>
                <th className="num">Mensalidade</th>
                <th>Clube LTC</th>
                <th>Situação</th>
                <th className="cell-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listing.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted">
                    Nenhum associado com esses filtros.
                  </td>
                </tr>
              ) : (
                listing.pageRows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name}</strong>
                    <div className="muted">{m.email}</div>
                    <RecordStamp
                      origin={m.origin}
                      createdAt={m.createdAt}
                      createdBy={m.createdByUser}
                      updatedAt={m.updatedAt}
                      updatedBy={m.updatedByUser}
                    />
                  </td>
                  <td>
                    <span
                      className="branch-dot"
                      style={{ background: YOUTH_BRANCHES.find((b) => b.id === m.branch)?.color }}
                    />{" "}
                    {BRANCH_LABELS[m.branch]}
                  </td>
                  <td>{roleLabel(m.role)}</td>
                  <td>
                    {m.role === "jovem"
                      ? (m.guardians ?? []).length
                        ? (m.guardians ?? [])
                            .map((guardian) => `${guardian.name} (${guardian.relationship})`)
                            .join(", ")
                        : "Sem responsável"
                      : "—"}
                  </td>
                  <td>{formatDate(m.joinedAt)}</td>
                  <td>
                    {m.accounts.length
                      ? m.accounts
                          .filter((a) => a.active)
                          .map((a) => a.holderName)
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="num">{m.monthlyFee ? brl(m.monthlyFee) : "—"}</td>
                  <td>
                    <Badge kind={m.clubeLtc ? "paid" : "inactive"}>{yesNo(m.clubeLtc)}</Badge>
                  </td>
                  <td>
                    <Badge kind={m.status === "active" ? "paid" : "inactive"}>
                      {m.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="cell-actions">
                    <IconButton label="Alterar associado" onClick={() => openEdit(m)}>
                      <FaPen />
                    </IconButton>
                    <IconButton
                      label="Contas de pagamento"
                      onClick={() => {
                        setAccountQuery("");
                        setAttemptedAccount(false);
                        setAccountsOf(m);
                      }}
                    >
                      <FaWallet />
                    </IconButton>
                    <IconButton
                      label={m.status === "active" ? "Desativar associado" : "Reativar associado"}
                      tone={m.status === "active" ? "danger" : "success"}
                      onClick={() => void toggle(m)}
                    >
                      {m.status === "active" ? <FaUserSlash /> : <FaUserCheck />}
                    </IconButton>
                  </td>
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
      {open ? (
        <Modal title={editing ? "Alterar associado" : "Novo associado"} onClose={closeForm}>
          <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
            {error ? <div className="error wide">{error}</div> : null}
            <label className="field wide">
              <span>Nome</span>
              <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Telefone</span>
              <input
                required
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                placeholder="(51) 99999-9999"
              />
            </label>
            <label className="field">
              <span>Ramo</span>
              <select
                required
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value as YouthBranchId })}
              >
                {YOUTH_BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Papel</span>
              <select required value={form.role} onChange={(e) => changeRole(e.target.value as MemberRole)}>
                <option value="jovem">Jovem</option>
                <option value="escotista">Escotista</option>
                <option value="dirigente">Dirigente</option>
                <option value="clube">Clube da Flor de Lis</option>
              </select>
            </label>
            <label className={`field${attempted && !(Number.isFinite(parseMoney(form.monthlyFee)) && parseMoney(form.monthlyFee) >= 0) ? " is-invalid" : ""}`}>
              <span>Mensalidade (R$)</span>
              <input
                required
                inputMode="numeric"
                value={form.monthlyFee}
                onChange={(e) => setForm({ ...form, monthlyFee: maskMoney(e.target.value) })}
                placeholder="0,00"
              />
            </label>
            <label className="field">
              <span>Data de cadastro</span>
              <input
                required
                type="date"
                value={form.joinedAt}
                onChange={(e) => setForm({ ...form, joinedAt: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Associado do Clube LTC</span>
              <select
                required
                value={form.clubeLtc ? "true" : "false"}
                onChange={(e) => setForm({ ...form, clubeLtc: e.target.value === "true" })}
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </label>
            {form.role === "jovem" ? (
              <div className="wide guardian-block">
                <div className="guardian-block__head">
                  <strong>
                    Responsáveis
                    <abbr className="req" title="Obrigatório">
                      *
                    </abbr>
                  </strong>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => setGuardians((current) => [...current, blankGuardian()])}
                  >
                    Outro responsável
                  </button>
                </div>
                <p className="muted">
                  {editing && !(editing.guardians ?? []).length
                    ? "Este jovem ainda não tem responsável. Informe ao menos um para salvar a alteração."
                    : "Obrigatório para jovem: pai, mãe, tio(a), avô, avó ou outro responsável."}
                </p>
                {guardians.map((guardian, index) => (
                  <div className="guardian-card form-grid" key={guardian.id ?? `new-${index}`}>
                    <label className={`field${attempted && guardian.name.trim().length < 2 ? " is-invalid" : ""}`}>
                      <span>Nome do responsável</span>
                      <input
                        required
                        minLength={2}
                        value={guardian.name}
                        onChange={(e) => patchGuardian(index, { name: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Parentesco</span>
                      <select
                        required
                        value={
                          GUARDIAN_RELATIONSHIPS.includes(
                            guardian.relationship as (typeof GUARDIAN_RELATIONSHIPS)[number],
                          )
                            ? guardian.relationship
                            : "Outro"
                        }
                        onChange={(e) => patchGuardian(index, { relationship: e.target.value })}
                      >
                        {GUARDIAN_RELATIONSHIPS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Telefone</span>
                      <input
                        inputMode="numeric"
                        value={guardian.phone}
                        onChange={(e) => patchGuardian(index, { phone: maskPhone(e.target.value) })}
                        placeholder="(51) 99999-9999"
                      />
                    </label>
                    <label className="field">
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={guardian.email}
                        onChange={(e) => patchGuardian(index, { email: e.target.value })}
                      />
                    </label>
                    {guardians.length > 1 ? (
                      <div className="wide" style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => setGuardians((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          Remover responsável
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="modal-actions wide">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>
                Cancelar
              </button>
              <SubmitButton busy={saving} busyLabel="Salvando…">
                {editing ? "Salvar alteração" : "Salvar"}
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {accountsOf ? (
        <Modal title={`Contas · ${accountsOf.name}`} onClose={() => setAccountsOf(null)}>
          {(accountsOf.accounts ?? []).length ? (
            <div style={{ marginBottom: 18 }}>
              <FilterBar>
                <label className="field">
                  <span>Buscar conta</span>
                  <input
                    value={accountQuery}
                    onChange={(e) => setAccountQuery(e.target.value)}
                    placeholder="Titular, pix, banco…"
                  />
                </label>
              </FilterBar>
              <ListingResults filtering={accountListing.busy} fetching={list.loading} fetchLabel="Atualizando contas…">
              <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Titular</th>
                    <th>Identificação</th>
                    <th>Pix / banco</th>
                    <th className="cell-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {accountListing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        Nenhuma conta com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    accountListing.pageRows.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.holderName}</strong>
                        <div className="muted">
                          {holderKindLabel(a.holderKind)} · {a.relationship}
                          {a.isPrimary ? " · principal" : ""}
                        </div>
                        <RecordStamp
                          origin={a.origin}
                          createdAt={a.createdAt}
                          createdBy={a.createdByUser}
                          updatedAt={a.updatedAt}
                          updatedBy={a.updatedByUser}
                        />
                      </td>
                      <td>{a.document || "—"}</td>
                      <td>
                        {a.pixKey || "—"}
                        <div className="muted">
                          {[a.bank, a.agency, a.accountNumber].filter(Boolean).join(" · ") || "sem dados bancários"}
                        </div>
                      </td>
                      <td className="cell-actions">
                        <IconButton
                          label="Excluir conta de pagamento"
                          tone="danger"
                          onClick={() => void removeAccount(a.id)}
                        >
                          <FaTrashAlt />
                        </IconButton>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
              <Pager
                total={accountListing.total}
                fromRow={accountListing.fromRow}
                toRow={accountListing.toRow}
                pageSize={accountListing.pageSize}
                currentPage={accountListing.currentPage}
                pageCount={accountListing.pageCount}
                onPageSize={accountListing.setPageSize}
                onPage={accountListing.setPage}
              />
              </ListingResults>
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: 16 }}>
              Nenhuma conta atrelada a este associado.
            </p>
          )}

          <form onSubmit={addAccount} className={formClass("form-grid", attemptedAccount)} noValidate>
            <label className="field">
              <span>Titular</span>
              <input
                required
                value={accountForm.holderName}
                onChange={(e) => setAccountForm({ ...accountForm, holderName: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Quem paga</span>
              <select
                required
                value={accountForm.holderKind}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, holderKind: e.target.value as AccountHolderKind })
                }
              >
                <option value="parent">Pai / mãe</option>
                <option value="youth">Jovem</option>
                <option value="other">Outro</option>
              </select>
            </label>
            <label className="field">
              <span>Parentesco / relação</span>
              <input
                required
                value={accountForm.relationship}
                onChange={(e) => setAccountForm({ ...accountForm, relationship: e.target.value })}
              />
            </label>
            <label className="field">
              <span>CPF</span>
              <input
                value={accountForm.document}
                onChange={(e) => setAccountForm({ ...accountForm, document: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Chave Pix</span>
              <input
                value={accountForm.pixKey}
                onChange={(e) => setAccountForm({ ...accountForm, pixKey: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Banco</span>
              <input
                value={accountForm.bank}
                onChange={(e) => setAccountForm({ ...accountForm, bank: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Agência</span>
              <input
                value={accountForm.agency}
                onChange={(e) => setAccountForm({ ...accountForm, agency: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Conta</span>
              <input
                value={accountForm.accountNumber}
                onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              />
            </label>
            <label className="field wide check-row" style={{ alignItems: "center" }}>
              <input
                type="checkbox"
                checked={accountForm.isPrimary}
                onChange={(e) => setAccountForm({ ...accountForm, isPrimary: e.target.checked })}
              />
              Conta principal de pagamento
            </label>
            <div className="modal-actions wide">
              <button className="btn btn-ghost" type="button" onClick={() => setAccountsOf(null)} disabled={savingAccount}>
                Fechar
              </button>
              <SubmitButton busy={savingAccount} busyLabel="Atrelando…">
                Atrelar conta
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}
      </AnimatePresence>
    </div>
  );
}
