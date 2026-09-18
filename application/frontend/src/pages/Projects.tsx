import { useMemo, useState, type FormEvent } from "react";
import {
  BRANCH_LABELS,
  YOUTH_BRANCHES,
  type BranchId,
  type FinancialProject,
  type MovementType,
  type ProjectItem,
} from "@shared";
import RecordStamp from "../components/RecordStamp";
import PageHeader from "../components/PageHeader";
import IdentifyPaymentsGuide from "../components/IdentifyPaymentsGuide";
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
import { FaPen } from "react-icons/fa";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { brl } from "../lib/format";
import { matchesQuery, usePagedList } from "../lib/listing";
import { formatMoney, maskMoney, parseMoney } from "../lib/masks";
import { formClass, submitAttempt } from "../lib/form";
import { usePeriod } from "../lib/period";
import { useFetch } from "../lib/useFetch";

type ProjectView = FinancialProject & {
  actuals: {
    income: number;
    expense: number;
    byCategory: { category: string; income: number; expense: number }[];
    byItem?: { itemId: string; income: number; expense: number }[];
  };
  plannedTotal: number;
  createdByUser?: { name: string; username?: string } | null;
  updatedByUser?: { name: string; username?: string } | null;
};

const TABS: { id: BranchId; unit: string; color: string }[] = [
  ...YOUTH_BRANCHES.map((item) => ({ id: item.id, unit: item.unit, color: item.color })),
  { id: "grupo", unit: "Grupo", color: "#0c2d6b" },
];

export default function Projects() {
  const toast = useToast();
  const { year } = usePeriod();
  const [branch, setBranch] = useState<BranchId>("filhote");
  const list = useFetch<ProjectView[]>(`/projects?year=${year}&branch=${branch}`);
  const types = useFetch<MovementType[]>("/movement-types");
  const [editing, setEditing] = useState<ProjectView | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);
  const [itemForm, setItemForm] = useState({ description: "", category: "", planned: "", movementTypeId: "" });
  const [saving, setSaving] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [query, setQuery] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [itemAttempted, setItemAttempted] = useState(false);

  const project = list.data?.[0];
  const meta = TABS.find((item) => item.id === branch);
  const itemRows = useMemo(
    () => (project?.items ?? []).filter((item) => matchesQuery(query, [item.description, item.category])),
    [project, query],
  );
  const listing = usePagedList(itemRows, `${project?.id ?? ""}|${query}|${branch}|${year}`);
  const activeTypes = (types.data ?? []).filter((item) => item.active);

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/projects/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editing.name,
          description: editing.description,
          items: editing.items,
        }),
      });
      setEditing(null);
      await list.reload();
      toast.success("Projeto alterado com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setSaving(true);
    try {
      await api("/projects", {
        method: "POST",
        body: JSON.stringify({
          branch,
          year,
          name: createForm.name,
          description: createForm.description,
          items: [],
        }),
      });
      setCreating(false);
      setCreateForm({ name: "", description: "" });
      await list.reload();
      toast.success("Projeto criado. Inclua os itens do orçamento.");
    } finally {
      setSaving(false);
    }
  }

  function openEditItem(item: ProjectItem) {
    setEditingItem(item);
    setItemForm({
      description: item.description,
      category: item.category,
      planned: formatMoney(item.planned),
      movementTypeId: item.movementTypeId ?? "",
    });
    setItemAttempted(false);
  }

  function openNewItem() {
    if (!project) return;
    setEditingItem({ id: "", category: "", description: "", planned: 0 });
    setItemForm({ description: "", category: "", planned: "", movementTypeId: "" });
    setItemAttempted(false);
  }

  function closeEditItem() {
    setEditingItem(null);
    setItemAttempted(false);
  }

  async function saveItem(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setItemAttempted)) return;
    if (!project || !editingItem) return;
    const planned = parseMoney(itemForm.planned);
    if (!Number.isFinite(planned) || planned < 0) return;
    const movement = activeTypes.find((item) => item.id === itemForm.movementTypeId);
    const nextItem: ProjectItem = {
      id: editingItem.id || crypto.randomUUID(),
      description: itemForm.description,
      category: movement?.name || itemForm.category || itemForm.description,
      planned,
      movementTypeId: itemForm.movementTypeId || undefined,
    };
    const items = editingItem.id
      ? project.items.map((item) => (item.id === editingItem.id ? { ...item, ...nextItem, id: item.id } : item))
      : [...project.items, nextItem];
    setSavingItem(true);
    try {
      await api(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      });
      closeEditItem();
      await list.reload();
      toast.success(editingItem.id ? "Item do orçamento alterado com sucesso." : "Item incluído no orçamento.");
    } finally {
      setSavingItem(false);
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando projetos…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Projetos financeiros"
        title="Orçamento de cada ramo"
        subtitle="Planejado versus realizado. Vincule o item ao tipo de movimentação para o caixa alimentar o realizado. O ramo Grupo também tem projeto."
        actions={
          !project ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setAttempted(false);
                setCreating(true);
              }}
            >
              Novo projeto
            </button>
          ) : (
            <button className="btn btn-outline" type="button" onClick={openNewItem}>
              Incluir item
            </button>
          )
        }
      />

      <IdentifyPaymentsGuide />

      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`tab ${branch === item.id ? "is-on" : ""}`}
            type="button"
            onClick={() => setBranch(item.id)}
            style={branch === item.id ? { background: item.color, color: "#fffcf7" } : undefined}
          >
            {item.unit}
          </button>
        ))}
      </div>

      {!project ? (
        <div className="card empty">
          Nenhum projeto para {BRANCH_LABELS[branch]} em {year}.
        </div>
      ) : (
        <FetchOverlay active={list.loading} label="Atualizando projeto…">
          <div className="card" style={{ marginBottom: 16, borderTop: `6px solid ${meta?.color}` }}>
            <div className="page-head" style={{ marginBottom: 8 }}>
              <div>
                <h2>{project.name}</h2>
                <p>{project.description}</p>
                <RecordStamp
                  origin={project.origin}
                  createdAt={project.createdAt}
                  createdBy={project.createdByUser}
                  updatedAt={project.updatedAt}
                  updatedBy={project.updatedByUser}
                />
              </div>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setAttempted(false);
                  setEditing(project);
                }}
              >
                Editar orçamento
              </button>
            </div>
            <div className="grid-stats" style={{ marginTop: 16 }}>
              <article className="stat">
                <h3>Planejado</h3>
                <strong>{brl(project.plannedTotal)}</strong>
              </article>
              <article className="stat">
                <h3>Realizado (saídas)</h3>
                <strong>{brl(project.actuals.expense)}</strong>
              </article>
              <article className="stat">
                <h3>Entradas vinculadas</h3>
                <strong>{brl(project.actuals.income)}</strong>
              </article>
              <article className="stat">
                <h3>Saldo do projeto</h3>
                <strong>{brl(project.plannedTotal - project.actuals.expense)}</strong>
                <small>
                  {Math.min(100, Math.round((project.actuals.expense / (project.plannedTotal || 1)) * 100))}% do
                  orçamento
                </small>
              </article>
            </div>
            <div className="progress-bar" style={{ marginTop: 16 }}>
              <span
                style={{
                  width: `${Math.min(100, (project.actuals.expense / (project.plannedTotal || 1)) * 100)}%`,
                  background: meta?.color,
                }}
              />
            </div>
          </div>

          <article className="card">
            <FilterBar>
              <label className="field">
                <span>Buscar item</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Descrição ou categoria…" />
              </label>
            </FilterBar>
            <ListingResults fetching={list.loading} filtering={listing.busy} fetchLabel="Atualizando projeto…">
              <table className="data">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    <th className="num">Planejado</th>
                    <th className="num">Realizado</th>
                    <th className="num">Saldo</th>
                    <th className="cell-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Nenhum item com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    listing.pageRows.map((item) => {
                      const actual =
                        project.actuals.byItem?.find((row) => row.itemId === item.id)?.expense ??
                        project.actuals.byCategory.find((c) => c.category === item.category)?.expense ??
                        0;
                      const rest = item.planned - actual;
                      return (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td>
                            <Badge kind="fixed">{item.category}</Badge>
                          </td>
                          <td className="num">{brl(item.planned)}</td>
                          <td className="num">{brl(actual)}</td>
                          <td className={`num ${rest < 0 ? "is-neg" : "is-pos"}`}>{brl(rest)}</td>
                          <td className="cell-actions">
                            <IconButton label="Alterar item" onClick={() => openEditItem(item)}>
                              <FaPen />
                            </IconButton>
                          </td>
                        </tr>
                      );
                    })
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
      )}

      <AnimatePresence>
        {creating ? (
          <Modal
            key="project-create"
            title={`Novo projeto · ${BRANCH_LABELS[branch]} ${year}`}
            onClose={() => {
              setCreating(false);
              setAttempted(false);
            }}
          >
            <form onSubmit={(event) => void create(event)} className={formClass("form-grid", attempted)} noValidate>
              <label className="field wide">
                <span>Nome</span>
                <input
                  required
                  minLength={2}
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </label>
              <label className="field wide">
                <span>Descrição</span>
                <textarea
                  required
                  minLength={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </label>
              <div className="modal-actions wide">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setAttempted(false);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <SubmitButton busy={saving} busyLabel="Criando…">
                  Criar projeto
                </SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
        {editing ? (
          <Modal
            key="project-form"
            title="Editar projeto"
            onClose={() => {
              setEditing(null);
              setAttempted(false);
            }}
          >
            <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
              <label className="field wide">
                <span>Nome</span>
                <input
                  required
                  minLength={2}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className="field wide">
                <span>Descrição</span>
                <textarea
                  required
                  minLength={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>
              {editing.items.map((item, i) => (
                <div key={item.id} className="wide form-grid">
                  <label className="field">
                    <span>Item</span>
                    <input
                      required
                      value={item.description}
                      onChange={(e) => {
                        const items = [...editing.items];
                        items[i] = { ...item, description: e.target.value };
                        setEditing({ ...editing, items });
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>Planejado (R$)</span>
                    <input
                      required
                      inputMode="numeric"
                      value={formatMoney(item.planned)}
                      onChange={(e) => {
                        const items = [...editing.items];
                        const parsed = parseMoney(maskMoney(e.target.value));
                        items[i] = { ...item, planned: Number.isFinite(parsed) ? parsed : 0 };
                        setEditing({ ...editing, items });
                      }}
                      placeholder="0,00"
                    />
                  </label>
                </div>
              ))}
              <div className="modal-actions wide">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setAttempted(false);
                  }}
                  disabled={saving}
                >
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

      <AnimatePresence>
        {editingItem ? (
          <Modal
            key="project-item"
            title={editingItem.id ? "Alterar item do orçamento" : "Incluir item"}
            onClose={closeEditItem}
          >
            <form
              onSubmit={(event) => void saveItem(event)}
              className={formClass("form-grid", itemAttempted)}
              noValidate
            >
              <label className="field wide">
                <span>Item</span>
                <input
                  required
                  minLength={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                />
              </label>
              <label className="field wide">
                <span>Tipo de movimentação (realizado)</span>
                <select
                  value={itemForm.movementTypeId}
                  onChange={(e) => {
                    const movement = activeTypes.find((item) => item.id === e.target.value);
                    setItemForm({
                      ...itemForm,
                      movementTypeId: e.target.value,
                      category: movement?.name || itemForm.category,
                    });
                  }}
                >
                  <option value="">Não vincular</option>
                  {activeTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Categoria</span>
                <input
                  required
                  minLength={2}
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                />
              </label>
              <label className={`field${itemAttempted && !(parseMoney(itemForm.planned) >= 0) ? " is-invalid" : ""}`}>
                <span>Planejado (R$)</span>
                <input
                  required
                  inputMode="decimal"
                  value={itemForm.planned}
                  onChange={(e) => setItemForm({ ...itemForm, planned: maskMoney(e.target.value) })}
                  placeholder="0,00"
                />
              </label>
              <div className="modal-actions wide">
                <button className="btn btn-ghost" type="button" onClick={closeEditItem} disabled={savingItem}>
                  Cancelar
                </button>
                <SubmitButton busy={savingItem} busyLabel="Salvando…">
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
