import { useMemo, useState, type FormEvent } from "react";
import type { AppUser, UserRole } from "@shared";
import RecordStamp from "../components/RecordStamp";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { Badge } from "../components/StatCard";
import PageLoader from "../components/PageLoader";
import FetchOverlay from "../components/FetchOverlay";
import ListingResults from "../components/ListingResults";
import PasswordInput from "../components/PasswordInput";
import SubmitButton from "../components/SubmitButton";
import FilterBar from "../components/FilterBar";
import Pager from "../components/Pager";
import IconButton from "../components/IconButton";
import { AnimatePresence } from "framer-motion";
import { FaPen, FaUserCheck, FaUserSlash } from "react-icons/fa";
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
  passwordConfirm: "",
  currentPassword: "",
  role: "tesoureiro" as UserRole,
};

const roleLabel: Record<UserRole, string> = {
  admin: "Administrador",
  tesoureiro: "Tesoureiro",
};

function passwordsDiffer(password: string, confirm: string) {
  return password !== confirm;
}

export default function Users() {
  const toast = useToast();
  const list = useFetch<UserView[]>("/users");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserView | null>(null);
  const [toggling, setToggling] = useState<UserView | null>(null);
  const [form, setForm] = useState(empty);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingBusy, setTogglingBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [toggleAttempted, setToggleAttempted] = useState(false);
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
  const changingPassword = Boolean(form.password || form.passwordConfirm);
  const passwordMismatch = changingPassword && passwordsDiffer(form.password, form.passwordConfirm);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function openEdit(user: UserView) {
    setEditing(user);
    setForm({
      username: user.username,
      name: user.name,
      email: user.email,
      password: "",
      passwordConfirm: "",
      currentPassword: "",
      role: user.role,
    });
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setForm(empty);
    setError(null);
    setAttempted(false);
  }

  function openToggle(user: UserView) {
    setToggling(user);
    setConfirmPassword("");
    setToggleError(null);
    setToggleAttempted(false);
  }

  function closeToggle() {
    setToggling(null);
    setConfirmPassword("");
    setToggleError(null);
    setToggleAttempted(false);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    if (!editing && passwordsDiffer(form.password, form.passwordConfirm)) {
      setError("As senhas não coincidem");
      return;
    }
    if (editing && changingPassword && passwordMismatch) {
      setError("As senhas não coincidem");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
          currentPassword: form.currentPassword,
        };
        if (form.password) {
          payload.password = form.password;
          payload.passwordConfirm = form.passwordConfirm;
        }
        await api(`/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success(form.password ? "Usuário e senha alterados com sucesso." : "Usuário alterado com sucesso.");
      } else {
        await api("/users", {
          method: "POST",
          body: JSON.stringify({
            username: form.username,
            name: form.name,
            email: form.email,
            password: form.password,
            passwordConfirm: form.passwordConfirm,
            role: form.role,
          }),
        });
        toast.success("Usuário cadastrado com sucesso.");
      }
      closeForm();
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o usuário");
    } finally {
      setSaving(false);
    }
  }

  async function confirmToggle(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setToggleAttempted)) return;
    if (!toggling) return;
    setToggleError(null);
    setTogglingBusy(true);
    try {
      await api(`/users/${toggling.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          active: !toggling.active,
          currentPassword: confirmPassword,
        }),
      });
      toast.success(toggling.active ? "Usuário desativado com sucesso." : "Usuário reativado com sucesso.");
      closeToggle();
      await list.reload();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Não foi possível alterar a situação");
    } finally {
      setTogglingBusy(false);
    }
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
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            Novo usuário
          </button>
        }
      />

      <FetchOverlay active={list.loading} label="Atualizando usuários…">
        <article className="card">
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, usuário ou e-mail…" />
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
                        <Badge kind={user.active ? "paid" : "inactive"}>{user.active ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="cell-actions">
                        <IconButton label="Alterar usuário" onClick={() => openEdit(user)}>
                          <FaPen />
                        </IconButton>
                        <IconButton
                          label={user.active ? "Desativar usuário" : "Reativar usuário"}
                          tone={user.active ? "danger" : "success"}
                          onClick={() => openToggle(user)}
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
          <Modal key="user-form" title={editing ? "Alterar usuário" : "Novo usuário"} onClose={closeForm}>
            <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
              {error ? <div className="error wide">{error}</div> : null}
              <label className="field">
                <span>Nome</span>
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Usuário</span>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  readOnly={Boolean(editing)}
                  autoComplete="off"
                />
                <small className="muted">Login de acesso. O e-mail também vale na tela de entrada.</small>
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
              <label
                className={`field${attempted && (!editing || changingPassword) && passwordMismatch ? " is-invalid" : ""}`}
              >
                <span>{editing ? "Nova senha" : "Senha"}</span>
                <PasswordInput
                  required={!editing}
                  minLength={editing ? (changingPassword ? 6 : undefined) : 6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                  placeholder={editing ? "Preencha só se for trocar" : undefined}
                />
              </label>
              <label
                className={`field${attempted && (!editing || changingPassword) && passwordsDiffer(form.password, form.passwordConfirm) ? " is-invalid" : ""}`}
              >
                <span>{editing ? "Confirmar nova senha" : "Confirmar senha"}</span>
                <PasswordInput
                  required={!editing || changingPassword}
                  minLength={editing ? (changingPassword ? 6 : undefined) : 6}
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  autoComplete="new-password"
                />
              </label>
              {editing ? (
                <label className="field wide">
                  <span>Confirme sua senha</span>
                  <PasswordInput
                    required
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                    autoComplete="current-password"
                  />
                  <small className="muted">Digite a senha da sua conta para confirmar a alteração.</small>
                </label>
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
      </AnimatePresence>

      <AnimatePresence>
        {toggling ? (
          <Modal
            key="user-toggle"
            title={toggling.active ? "Desativar usuário" : "Reativar usuário"}
            onClose={closeToggle}
          >
            <form onSubmit={confirmToggle} className={formClass("form-grid", toggleAttempted)} noValidate>
              {toggleError ? <div className="error wide">{toggleError}</div> : null}
              <p className="muted wide">
                {toggling.active
                  ? `Para desativar ${toggling.name}, confirme a senha da sua conta.`
                  : `Para reativar ${toggling.name}, confirme a senha da sua conta.`}
              </p>
              <label className="field wide">
                <span>Confirme sua senha</span>
                <PasswordInput
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <div className="modal-actions wide">
                <button className="btn btn-ghost" type="button" onClick={closeToggle} disabled={togglingBusy}>
                  Cancelar
                </button>
                <SubmitButton busy={togglingBusy} busyLabel="Confirmando…">
                  {toggling.active ? "Desativar" : "Reativar"}
                </SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
