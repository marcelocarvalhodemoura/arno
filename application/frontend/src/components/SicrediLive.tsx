import { useEffect, useState } from "react";
import { FaBroadcastTower, FaSync } from "react-icons/fa";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { brl, formatDate, formatDateTime } from "../lib/format";
import { periodRange, usePeriod } from "../lib/period";
import { useFetch } from "../lib/useFetch";
import FetchOverlay from "./FetchOverlay";
import SubmitButton from "./SubmitButton";
import { Badge } from "./StatCard";

type Movement = {
  id: string;
  externalId: string;
  occurredAt: string;
  date: string;
  amount: number;
  description: string;
  payerName: string;
  status: "new" | "matched" | "imported";
  settlement: "matched" | "imported" | "pending-bank" | "pending-cash";
  memberName?: string;
  movementTypeName?: string;
};

type PendingCash = {
  id: string;
  date: string;
  description: string;
  amount: number;
  memberName?: string;
};

type Overview = {
  configured: boolean;
  mock: boolean;
  environment: "production" | "sandbox" | "mock" | "off";
  pixKeyMasked?: string;
  webhookReady: boolean;
  lastSyncAt?: string;
  lastError?: string;
  summary: {
    bankCount: number;
    bankIncome: number;
    matched: number;
    imported: number;
    pendingBank: number;
    pendingCash: number;
    reconciled: number;
  };
  movements: Movement[];
  pendingCash: PendingCash[];
};

const ENV_LABEL = {
  production: "Produção",
  sandbox: "Homologação",
  mock: "Simulação local",
  off: "Não configurada",
};

function settlementLabel(kind: Movement["settlement"] | "pending-cash") {
  if (kind === "matched") return "Conciliado";
  if (kind === "imported") return "No caixa";
  if (kind === "pending-cash") return "Só no caixa";
  return "Só no banco";
}

export default function SicrediLive() {
  const toast = useToast();
  const { year, month } = usePeriod();
  const { from, to } = periodRange(year, month);
  const overview = useFetch<Overview>(`/integrations/sicredi?from=${from}&to=${to}`);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void overview.reload();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [overview.reload]);

  async function sync(simulate = false) {
    setSyncing(true);
    setError(null);
    try {
      const result = await api<Overview & { created?: number; paid?: number }>(
        simulate ? "/integrations/sicredi/simulate" : "/integrations/sicredi/sync",
        { method: "POST", body: JSON.stringify(simulate ? {} : { from, to }) },
      );
      overview.setData(result);
      const created = result.created ?? 0;
      const paid = result.paid ?? 0;
      if (created || paid) {
        toast.success(
          `${created ? `${created} lançamento(s) no caixa` : ""}${created && paid ? " · " : ""}${
            paid ? `${paid} mensalidade(s) conciliada(s)` : ""
          }.`,
        );
      } else {
        toast.success("Sicredi conferido. Nenhum Pix novo neste período.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível sincronizar o Sicredi";
      setError(message);
    } finally {
      setSyncing(false);
    }
  }

  async function registerWebhook() {
    setSyncing(true);
    setError(null);
    try {
      await api("/integrations/sicredi/webhook/register", { method: "POST" });
      toast.success("Webhook Pix registrado no Sicredi.");
      await overview.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o webhook");
    } finally {
      setSyncing(false);
    }
  }

  const data = overview.data;
  if (!data) {
    if (overview.error) return <p className="error">{overview.error}</p>;
    return <p className="muted">Carregando a conexão com o Sicredi…</p>;
  }

  return (
    <FetchOverlay active={overview.loading && Boolean(data)} label="Atualizando o Sicredi…">
      <article className="card sicredi-panel">
        <div className="sicredi-panel__head">
          <div>
            <p className="kicker" style={{ marginBottom: 6 }}>
              <FaBroadcastTower /> Pix Sicredi
            </p>
            <h3 style={{ margin: 0 }}>Lançamentos em tempo real</h3>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              A API Pix traz os recebimentos na hora. TED, cartão, boleto e tarifas continuam entrando pelo PDF ou pela
              planilha do extrato.
            </p>
          </div>
          <span className={`live-chip${data.configured ? " is-on" : ""}`}>
            <span className="live-dot" />
            {data.configured ? ENV_LABEL[data.environment] : "Aguardando credenciais"}
          </span>
        </div>

        {data.configured ? (
          <>
            <p className="muted" style={{ margin: "14px 0 0" }}>
              {data.pixKeyMasked ? `Chave ${data.pixKeyMasked} · ` : ""}
              {data.lastSyncAt ? `Última leitura ${formatDateTime(data.lastSyncAt)}` : "Ainda sem leitura no banco"}
              {data.webhookReady ? " · webhook pronto" : ""}
              {data.mock ? " · use “Simular Pix” para ver um recebimento novo" : ""}
            </p>
            <div className="sicredi-actions">
              <SubmitButton
                className="btn btn-primary"
                type="button"
                busy={syncing}
                busyLabel="Lendo Pix…"
                onClick={() => void sync()}
              >
                <FaSync /> Ler Pix agora
              </SubmitButton>
              {data.mock ? (
                <button className="btn btn-outline" type="button" disabled={syncing} onClick={() => void sync(true)}>
                  Simular Pix recebido
                </button>
              ) : (
                <button
                  className="btn btn-outline"
                  type="button"
                  disabled={syncing || !data.webhookReady}
                  onClick={() => void registerWebhook()}
                >
                  Registrar webhook
                </button>
              )}
            </div>
          </>
        ) : (
          <ol className="sicredi-steps">
            <li>Peça a adesão à API Pix na cooperativa Sicredi do grupo (conta PJ).</li>
            <li>
              Cadastre o sistema em{" "}
              <a href="https://developer.sicredi.com.br/api-portal/pt-br" target="_blank" rel="noreferrer">
                developer.sicredi.com.br
              </a>{" "}
              e gere certificado, Client ID e Client Secret.
            </li>
            <li>
              Preencha no <code>.env</code>: <code>SICREDI_CLIENT_ID</code>, <code>SICREDI_CLIENT_SECRET</code>,{" "}
              <code>SICREDI_CERT_PATH</code>, <code>SICREDI_KEY_PATH</code> e <code>SICREDI_PIX_KEY</code>.
            </li>
            <li>
              Enquanto as credenciais não chegam, use <code>SICREDI_MOCK=1</code> para treinar conciliação e o caixa ao
              vivo.
            </li>
          </ol>
        )}

        {error || data.lastError ? <p className="error">{error ?? data.lastError}</p> : null}
      </article>

      <div className="grid-stats" style={{ marginTop: 16 }}>
        <article className="card stat">
          <h3>Pix no período</h3>
          <strong>{brl(data.summary.bankIncome)}</strong>
          <small>{data.summary.bankCount} lançamento(s) no banco</small>
        </article>
        <article className="card stat is-pos">
          <h3>Conciliados</h3>
          <strong>{data.summary.matched}</strong>
          <small>Mensalidades marcadas como pagas</small>
        </article>
        <article className="card stat">
          <h3>No caixa</h3>
          <strong>{data.summary.imported}</strong>
          <small>Entraram como lançamento do Sicredi</small>
        </article>
        <article className="card stat is-neg">
          <h3>Pendentes no caixa</h3>
          <strong>{data.summary.pendingCash}</strong>
          <small>Cobranças ainda sem Pix correspondente</small>
        </article>
      </div>

      <article className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Conciliação do Pix</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Histórico</th>
                <th>Pagador</th>
                <th>Valor</th>
                <th>No caixa</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.length ? (
                data.movements.map((item) => (
                  <tr
                    key={item.id}
                    className={item.status === "matched" || item.status === "imported" ? "is-paid" : "is-pending"}
                  >
                    <td>
                      {formatDate(item.date)}
                      <div className="muted">{formatDateTime(item.occurredAt)}</div>
                    </td>
                    <td>{item.description}</td>
                    <td>{item.payerName || "—"}</td>
                    <td className="num is-pos">{brl(item.amount)}</td>
                    <td>
                      {item.movementTypeName || item.memberName
                        ? [item.movementTypeName, item.memberName].filter(Boolean).join(" · ")
                        : "—"}
                    </td>
                    <td>
                      <Badge kind={item.status === "new" ? "pending" : "paid"}>
                        {settlementLabel(item.settlement)}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="muted">
                    {data.configured
                      ? "Nenhum Pix neste período. Clique em Ler Pix agora."
                      : "Configure a API ou ative o modo simulação para ver os lançamentos aqui."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {data.pendingCash.length ? (
        <article className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Só no caixa · aguardando Pix</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            Mensalidades e outros recebimentos pendentes que ainda não bateram com um Pix do Sicredi.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Lançamento</th>
                  <th>Associado</th>
                  <th>Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingCash.map((item) => (
                  <tr key={item.id} className="is-pending">
                    <td>{formatDate(item.date)}</td>
                    <td>{item.description}</td>
                    <td>{item.memberName || "—"}</td>
                    <td className="num">{brl(item.amount)}</td>
                    <td>
                      <Badge kind="pending">{settlementLabel("pending-cash")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </FetchOverlay>
  );
}
