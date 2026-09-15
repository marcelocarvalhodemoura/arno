import { useMemo, useState, type FormEvent } from "react";
import type { AppUser, UserRole } from "@shared";
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
import { FaUserCheck, FaUserSlash } from "react-icons/fa";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { matchesQuery, usePagedList } from "../lib/listing";
import { formClass, submitAttempt } from "../lib/form";
import { useFetch } from "../lib/useFetch";

type UserView = AppUser & {
  createdByUser?: { name: string; username?: string } | null;
  updatedByUser?: { name: string; username?: string } | null;
};

const empty = {
  username: "",
  name: "",
  email: "",
  password: "",
  role: "tesoureiro" as UserRole,
};

const roleLabel: Record<UserRole, string> = {
  admin: "Administrador",
  tesoureiro: "Tesoureiro",
};

export default function Users() {
  const toast = useToast();
  const list = useFetch<UserView[]>("/users");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");

  const users = list.data ?? [];
  const filtered = useMemo(
    () =>
      users.filter((user) => {
        if (roleFilter && user.role !== roleFilter) return false;
        if (statusFilter === "active" && !user.active) return false;
        if (statusFilter === "inactive" && user.active) return false;
        return matchesQuery(query, [user.name, user.username, user.email, roleLabel[user.role]]);
      }),
    [users, query, roleFilter, statusFilter],
  );
  const listing = usePagedList(filtered, [query, roleFilter, statusFilter].join("|"));

  async function create(e: FormEvent) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    setSaving(true);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setOpen(false);
      setForm(empty);
      await list.reload();
      toast.success("Usuário cadastrado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o usuário");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user: UserView) {
    await api(`/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !user.active }),
    });
    await list.reload();
    toast.success("Usuário alterado com sucesso.");
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando usuários…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Usuários"
        title="Controle de acesso"
        subtitle="Administrador vê o painel e todas as páginas. Tesoureiro lança o caixa, importa CSV, cadastra tipos, taxas, associados e contas."
        actions={
          <button className="btn btn-primary" type="button" onClick={() => {
            setForm(empty);
            setError(null);
            setAttempted(false);
            setOpen(true);
          }}>
            Novo usuário
          </button>
        }
      />

      <FetchOverlay active={list.loading} label="Atualizando usuários…">
      <article className="card">
        <FilterBar>
          <label className="field">
            <span>Buscar</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, usuário ou e-mail…"
            />
          </label>
          <label className="field">
            <span>Papel</span>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}>
              <option value="">Todos</option>
              <option value="admin">Administrador</option>
              <option value="tesoureiro">Tesoureiro</option>
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
        </FilterBar>
        <ListingResults fetching={list.loading} filtering={listing.busy} fetchLabel="Atualizando usuários…">
        <table className="data">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>Papel</th>
              <th>Situação</th>
              <th className="cell-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listing.pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhum usuário com esses filtros.
                </td>
              </tr>
            ) : (
              listing.pageRows.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <div className="muted">{user.email}</div>
                  <RecordStamp
                    origin={user.origin}
                    createdAt={user.createdAt}
                    createdBy={user.createdByUser}
                    updatedAt={user.updatedAt}
                    updatedBy={user.updatedByUser}
                  />
                </td>
                <td>{user.username}</td>
                <td>{roleLabel[user.role]}</td>
                <td>
                  <Badge kind={user.active ? "paid" : "inactive"}>
                    {user.active ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="cell-actions">
                  <IconButton
                    label={user.active ? "Desativar usuário" : "Reativar usuário"}
                    tone={user.active ? "danger" : "success"}
                    onClick={() => void toggle(user)}
                  >
                    {user.active ? <FaUserSlash /> : <FaUserCheck />}
                  </IconButton>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
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
        <Modal title="Novo usuário" onClose={() => {
          setOpen(false);
          setAttempted(false);
          setError(null);
        }}>
          <form onSubmit={create} className={formClass("form-grid", attempted)} noValidate>
            {error ? <div className="error wide">{error}</div> : null}
            <label className="field">
              <span>Nome</span>
              <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span>Usuário</span>
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
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
              <span>Senha</span>
              <input
                required
                type="password"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="field wide">
              <span>Papel</span>
              <select
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value="tesoureiro">Tesoureiro — caixa, integração, tipos, associados e contas</option>
                <option value="admin">Administrador — painel e todas as páginas</option>
              </select>
            </label>
            <div className="modal-actions wide">
              <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </button>
              <SubmitButton busy={saving} busyLabel="Salvando…">
                Salvar
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}
      </AnimatePresence>
    </div>
  );
}
