import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BRANCH_LABELS, type BranchId, type DashboardPayload } from "@shared";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import PageLoader from "../components/PageLoader";
import FetchOverlay from "../components/FetchOverlay";
import ListingResults from "../components/ListingResults";
import FilterBar from "../components/FilterBar";
import Pager from "../components/Pager";
import { brl, chartMoney, MONTHS } from "../lib/format";
import { matchesQuery, usePagedList } from "../lib/listing";
import { usePeriod } from "../lib/period";
import { useFetch } from "../lib/useFetch";

const BRANCH_COLORS: Record<BranchId, string> = {
  filhote: "#ee9b00",
  lobinho: "#e8b423",
  escoteiro: "#2d8a4e",
  senior: "#c8102e",
  pioneiro: "#8b1a2b",
  "flor-de-lis": "#c45d7a",
  grupo: "#0c2d6b",
};

export default function Dashboard() {
  const { year, month } = usePeriod();
  const { data, loading, error } = useFetch<DashboardPayload>(`/dashboard?year=${year}&month=${month}`);
  const [query, setQuery] = useState("");
  const branchRows = useMemo(
    () =>
      (data?.byBranch ?? []).filter((row) =>
        matchesQuery(query, [BRANCH_LABELS[row.branch], row.members, row.income, row.expense]),
      ),
    [data, query],
  );
  const listing = usePagedList(branchRows, `${query}|${year}|${month}`);

  if (!data) {
    if (error) return <p className="error">{error}</p>;
    return <PageLoader label="Carregando painel…" />;
  }

  const periodLabel = month ? `${MONTHS[month - 1]} de ${year}` : `todo o ano de ${year}`;
  const balance = data.income - data.expense;
  const chart = data.chart.map((row) => {
    const label = MONTHS[Number(row.month.slice(5)) - 1] ?? row.month;
    return {
      name: month ? label : label.slice(0, 3),
      Entradas: row.income,
      Saídas: row.expense,
    };
  });
  const branchChart = data.byBranch.map((row) => ({
    name: BRANCH_LABELS[row.branch],
    Arrecadação: row.income,
    color: BRANCH_COLORS[row.branch],
    members: row.members,
  }));

  return (
    <FetchOverlay active={loading} label="Atualizando painel…">
      <div>
        <PageHeader
          kicker="Painel"
          title="Indicadores da tesouraria"
          subtitle={`Totais, associados e o caixa do grupo em ${periodLabel}.`}
        />
        {error ? <div className="error">{error}</div> : null}

        <div className="grid-stats">
          <StatCard
            title="Arrecadação no período"
            value={brl(data.income)}
            tone="pos"
            hint={`Entradas de ${periodLabel}`}
          />
          <StatCard
            title="Associados"
            value={String(data.members)}
            hint={`${data.activeMembers} ativos · cadastro até ${data.to.split("-").reverse().join("/")}`}
          />
          <StatCard title="Saldo inicial" value={brl(data.opening)} hint="Antes do período filtrado" />
          <StatCard title="Saldo atual" value={brl(data.current)} hint="Após entradas e saídas do período" />
        </div>

        <div className="grid-stats" style={{ marginTop: 16 }}>
          <StatCard title="Entradas no período" value={brl(data.income)} tone="pos" />
          <StatCard title="Saídas no período" value={brl(data.expense)} tone="neg" />
          <StatCard
            title="Resultado"
            value={brl(data.income - data.expense)}
            tone={data.income - data.expense >= 0 ? "pos" : "neg"}
          />
          <StatCard
            title="Filhotes a Grupo"
            value={brl(data.byBranch.reduce((s, r) => s + r.income, 0))}
            hint="Arrecadação dos ramos do painel"
          />
        </div>

        <div className="split-2" style={{ marginTop: 16 }}>
          <article className="card chart-card">
            <div className="chart-card__head">
              <div>
                <h3>Balanço</h3>
                <p className="muted">Entradas menos saídas em {periodLabel}</p>
              </div>
              <strong className={`chart-card__total ${balance >= 0 ? "is-pos" : "is-neg"}`}>{brl(balance)}</strong>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,45,107,.12)" />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: month ? 13 : 11 }} />
                <YAxis />
                <Tooltip formatter={chartMoney} />
                <Legend />
                <Bar dataKey="Entradas" fill="#2d8a4e" radius={6} />
                <Bar dataKey="Saídas" fill="#c8102e" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </article>
          <article className="card chart-card">
            <h3 style={{ marginBottom: 12 }}>Arrecadação por ramo</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              Filhotes, Lobinho, Escoteiro, Sênior, Pioneiro e Grupo em {periodLabel}.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={branchChart} layout="vertical" margin={{ left: 16 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip formatter={chartMoney} />
                <Bar dataKey="Arrecadação" radius={6}>
                  {branchChart.map((row) => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </article>
        </div>

        <article className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Totais por ramo</h3>
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ramo…" />
            </label>
          </FilterBar>
          <ListingResults fetching={loading} filtering={listing.busy} fetchLabel="Atualizando painel…">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Ramo</th>
                    <th className="num">Associados*</th>
                    <th className="num">Arrecadado</th>
                    <th className="num">Saídas</th>
                    <th className="num">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        Nenhum ramo com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    listing.pageRows.map((row) => (
                      <tr key={row.branch}>
                        <td>
                          <span className="branch-dot" style={{ background: BRANCH_COLORS[row.branch] }} />{" "}
                          {BRANCH_LABELS[row.branch]}
                        </td>
                        <td className="num">{row.members}</td>
                        <td className="num is-pos">{brl(row.income)}</td>
                        <td className="num is-neg">{brl(row.expense)}</td>
                        <td className={`num ${row.income - row.expense >= 0 ? "is-pos" : "is-neg"}`}>
                          {brl(row.income - row.expense)}
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
          <p className="muted" style={{ marginTop: 12 }}>
            * Associados com data de cadastro até {data.to.split("-").reverse().join("/")}, conforme o filtro de mês e
            ano. Totais por ramo incluem Filhotes, Lobinho, Escoteiro, Sênior, Pioneiro, Flor de Lis e Grupo.
          </p>
        </article>
      </div>
    </FetchOverlay>
  );
}
