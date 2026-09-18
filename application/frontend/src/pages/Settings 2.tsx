import { useEffect, useState, type FormEvent } from "react";
import type { Settings } from "@shared";
import PageHeader from "../components/PageHeader";
import PageLoader from "../components/PageLoader";
import SubmitButton from "../components/SubmitButton";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../lib/format";
import { formatMoney, maskMoney, parseMoney } from "../lib/masks";
import { formClass, submitAttempt } from "../lib/form";
import { useFetch } from "../lib/useFetch";

type NotifyStatus = { email: boolean; whatsapp: boolean; queued?: number };
type NotifyLog = {
  id: string;
  kind: "charge" | "receipt";
  channel: "email" | "whatsapp";
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  to: string;
  subject: string;
  error?: string;
  createdAt: string;
};

function notifyStatusLabel(status: NotifyLog["status"]) {
  if (status === "sent") return "Enviado";
  if (status === "failed") return "Falhou";
  if (status === "queued") return "Na fila";
  if (status === "sending") return "Enviando";
  return "Não enviado";
}

export default function SettingsPage() {
  const toast = useToast();
  const settings = useFetch<Settings>("/settings");
  const channels = useFetch<NotifyStatus>("/notify/status");
  const log = useFetch<NotifyLog[]>("/notify/log?limit=20");
  const [groupName, setGroupName] = useState("");
  const [opening, setOpening] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.data || loaded) return;
    setGroupName(settings.data.groupName);
    setOpening(formatMoney(settings.data.openingBalance));
    setDueDay(String(settings.data.mensalidadeDueDay ?? 10));
    setLoaded(true);
  }, [settings.data, loaded]);

  if (!settings.data) {
    if (settings.error) return <p className="error">{settings.error}</p>;
    return <PageLoader label="Carregando configurações…" />;
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    const openingBalance = parseMoney(opening);
    const mensalidadeDueDay = Number(dueDay);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) return;
    if (!Number.isInteger(mensalidadeDueDay) || mensalidadeDueDay < 1 || mensalidadeDueDay > 31) return;
    setSaving(true);
    setError(null);
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ groupName, openingBalance, mensalidadeDueDay }),
      });
      toast.success("Configurações salvas.");
      await settings.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Configurações"
        title="Grupo e saldo inicial"
        subtitle="O saldo inicial entra no livro-caixa e no painel. O nome do grupo aparece nos e-mails de cobrança e comprovante. O dia de vencimento vale para toda a grade de mensalidades."
      />

      <article className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
          {error ? <div className="error wide">{error}</div> : null}
          <label className="field wide">
            <span>Nome do grupo</span>
            <input required minLength={2} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </label>
          <label className={`field${attempted && !(parseMoney(opening) >= 0) ? " is-invalid" : ""}`}>
            <span>Saldo inicial (R$)</span>
            <input
              required
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(maskMoney(e.target.value))}
              placeholder="0,00"
            />
          </label>
          <label
            className={`field${attempted && !(Number.isInteger(Number(dueDay)) && Number(dueDay) >= 1 && Number(dueDay) <= 31) ? " is-invalid" : ""}`}
          >
            <span>Dia de vencimento da mensalidade</span>
            <input
              required
              inputMode="numeric"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </label>
          <div className="modal-actions wide">
            <SubmitButton busy={saving} busyLabel="Salvando…">
              Salvar
            </SubmitButton>
          </div>
        </form>
      </article>

      <article className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Canais de cobrança</h3>
        <p className="muted">
          E-mail usa MAIL_HOST e MAIL_FROM no .env. WhatsApp usa o token já cadastrado. Sem isso, a cobrança fica só no
          sistema. Com MAIL_MOCK=1 os disparos são gravados sem sair da máquina. Cobrança em lote entra numa fila e sai
          aos poucos, para não travar a tela nem o SMTP.
        </p>
        <p>
          E-mail: <strong>{channels.data?.email ? "pronto" : "não configurado"}</strong>
          {" · "}
          WhatsApp: <strong>{channels.data?.whatsapp ? "pronto" : "não configurado"}</strong>
          {" · "}
          Fila: <strong>{channels.data?.queued ?? 0}</strong>
        </p>
      </article>

      <article className="card">
        <h3 style={{ marginTop: 0 }}>Últimos disparos</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Canal</th>
                <th>Para</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {(log.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Nenhum e-mail ou WhatsApp enviado ainda.
                  </td>
                </tr>
              ) : (
                (log.data ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>{item.kind === "charge" ? "Cobrança" : "Comprovante"}</td>
                    <td>{item.channel === "email" ? "E-mail" : "WhatsApp"}</td>
                    <td>
                      {item.to || "—"}
                      {item.subject ? <div className="muted">{item.subject}</div> : null}
                    </td>
                    <td>
                      {notifyStatusLabel(item.status)}
                      {item.error ? <div className="muted">{item.error}</div> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
