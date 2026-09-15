import { useMemo, useState, type FormEvent } from "react";
import { YOUTH_BRANCHES, type FinancialProject, type YouthBranchId } from "@shared";
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
import { AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { brl } from "../lib/format";
import { matchesQuery, usePagedList } from "../lib/listing";
import { formatMoney, maskMoney, parseMoney } from "../lib/masks";
import { formClass, submitAttempt } from "../lib/form";
import { usePeriod } from "../lib/period";
import { useFetch } from "../lib/useFetch";

type ProjectView = FinancialProject & {
  actuals: { income: number; expense: number; byCategory: { category: string; income: number; expense: number }[] };
  plannedTotal: number;
  createdByUser?: { name: string; username?: string } | null;
  updatedByUser?: { name: string; username?: string } | null;
};

export default function Projects() {
  const toast = useToast();
  const { year } = usePeriod();
  const [branch, setBranch] = useState<YouthBranchId>("filhote");
  const list = useFetch<ProjectView[]>(`/projects?year=${year}&branch=${branch}`);
  const [editing, setEditing] = useState<ProjectView | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [attempted, setAttempted] = useState(false);

  const project = list.data?.[0];
  const meta = YOUTH_BRANCHES.find((b) => b.id === branch);
  const itemRows = useMemo(
    () =>
      (project?.items ?? []).filter((item) => matchesQuery(query, [item.description, item.category])),
    [project, query],
  );
  const listing = usePagedList(itemRows, `${project?.id ?? ""}|${query}|${branch}|${year}`);

  async function save(e: FormEvent) {
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

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando projetos…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Projetos financeiros"
        title="Orçamento de cada ramo"
        subtitle="Planejado versus realizado. Os lançamentos do caixa podem ser atrelados ao projeto do ramo."
      />

      <IdentifyPaymentsGuide />

      <div className="tabs">
        {YOUTH_BRANCHES.map((b) => (
          <button
            key={b.id}
            className={`tab ${branch === b.id ? "is-on" : ""}`}
            type="button"
            onClick={() => setBranch(b.id)}
            style={branch === b.id ? { background: b.color, color: "#fffcf7" } : undefined}
          >
            {b.unit}
          </button>
        ))}
      </div>

      {!project ? (
        <div className="card empty">Nenhum projeto para {meta?.name} em {year}.</div>
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
              <button className="btn btn-outline" type="button" onClick={() => {
                setAttempted(false);
                setEditing(project);
              }}>
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
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Descrição ou categoria…"
                />
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
                </tr>
              </thead>
              <tbody>
                {listing.pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Nenhum item com esses filtros.
                    </td>
                  </tr>
                ) : (
                  listing.pageRows.map((item) => {
                  const actual =
                    project.actuals.byCategory.find((c) => c.category === item.category)?.expense ?? 0;
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
      {editing ? (
        <Modal title="Editar projeto" onClose={() => {
          setEditing(null);
          setAttempted(false);
        }}>
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
              <button className="btn btn-ghost" type="button" onClick={() => {
                setEditing(null);
                setAttempted(false);
              }} disabled={saving}>
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
