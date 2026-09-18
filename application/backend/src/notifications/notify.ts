import { pool } from "../shared/db.js";
import { lateMonthlyFee, onTimeMonthlyFee } from "../mensalidades/fee-table.js";
import { dueDayOf } from "../mensalidades/mensalidades.js";
import { id } from "../shared/id.js";
import { mailConfigured } from "./mail.js";
import { kickOutbox } from "./outbox.js";
import { isMensalidadeName } from "../statement/statement.js";
import type { DatabaseShape, Transaction } from "../shared/types.js";
import { whatsappStatus } from "./whatsapp.js";

export type NotifyKind = "charge" | "receipt";
export type NotifyChannel = "email" | "whatsapp";

export type NotifyDelivery = {
  id: string;
  kind: NotifyKind;
  channel: NotifyChannel;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  to: string;
  error?: string;
};

const MONTH_NAMES = [
  "",
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function notifyStatus() {
  return {
    email: mailConfigured(),
    whatsapp: whatsappStatus().configured || process.env.WHATSAPP_MOCK === "1" || process.env.MAIL_MOCK === "1",
  };
}

export function configuredNotifyChannels(): NotifyChannel[] {
  const status = notifyStatus();
  const channels: NotifyChannel[] = [];
  if (status.email) channels.push("email");
  if (status.whatsapp) channels.push("whatsapp");
  return channels;
}

function brl(amount: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

function formatDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function emailsOf(db: DatabaseShape, memberId?: string) {
  if (!memberId) return [];
  const member = db.members.find((item) => item.id === memberId);
  const list: { name: string; email: string }[] = [];
  const seen = new Set<string>();
  function add(name: string, email: string) {
    const key = email.trim().toLowerCase();
    if (!key || !key.includes("@") || seen.has(key)) return;
    seen.add(key);
    list.push({ name: name.trim() || member?.name || "Família", email: key });
  }
  if (member?.email) add(member.name, member.email);
  for (const guardian of db.memberGuardians ?? []) {
    if (guardian.memberId === memberId && guardian.email) add(guardian.name, guardian.email);
  }
  return list;
}

function phonesOf(db: DatabaseShape, memberId?: string) {
  if (!memberId) return [];
  const member = db.members.find((item) => item.id === memberId);
  const list: { name: string; phone: string }[] = [];
  const seen = new Set<string>();
  function add(name: string, phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (!digits || seen.has(digits)) return;
    seen.add(digits);
    list.push({ name: name.trim() || member?.name || "Família", phone });
  }
  if (member?.phone) add(member.name, member.phone);
  for (const guardian of db.memberGuardians ?? []) {
    if (guardian.memberId === memberId && guardian.phone) add(guardian.name, guardian.phone);
  }
  return list;
}

function messageFor(db: DatabaseShape, tx: Transaction, kind: NotifyKind, who: string) {
  const group = db.settings.groupName || "Grupo Escoteiro Arno Friedrich";
  const member = tx.memberId ? db.members.find((item) => item.id === tx.memberId) : undefined;
  const month = Number(tx.date.slice(5, 7));
  const year = tx.date.slice(0, 4);
  const monthLabel = MONTH_NAMES[month] ?? tx.date;
  if (kind === "receipt") {
    const subject = `Comprovante de pagamento · ${group}`;
    const body =
      `Olá, ${who}.\n\n` +
      `A tesouraria do ${group} confirma o recebimento de ${brl(tx.amount)} referente a “${tx.description}”, em ${formatDate(tx.date)}.\n` +
      (member ? `Associado: ${member.name}.\n` : "") +
      `\nEste recado é um comprovante interno da tesouraria.\n` +
      `Obrigado.`;
    return { subject, body };
  }
  const subject = `Cobrança de mensalidade · ${monthLabel} ${year}`;
  const dueDay = dueDayOf(db);
  const discountNote =
    member && !member.clubeLtc
      ? ` Pague até o dia ${dueDay} para garantir o desconto de ${brl(onTimeMonthlyFee(member))}; após o dia ${dueDay} o valor é ${brl(lateMonthlyFee(member))}.`
      : "";
  const body =
    `Olá, ${who}.\n\n` +
    `A tesouraria do ${group} registra a mensalidade de ${monthLabel} de ${year}` +
    (member ? ` do associado ${member.name}` : "") +
    ` no valor de ${brl(tx.amount)}, com vencimento em ${formatDate(tx.date)}.${discountNote}\n\n` +
    `O pagamento pode ser feito por Pix na conta do grupo. Se já pagou, desconsidere este recado.\n` +
    `Dúvidas: responda este e-mail ou fale com a tesouraria.`;
  return { subject, body };
}

async function recordOutbox(row: {
  kind: NotifyKind;
  channel: NotifyChannel;
  status: NotifyDelivery["status"];
  memberId?: string;
  transactionId?: string;
  to: string;
  subject: string;
  body: string;
  error?: string;
  userId: string;
}) {
  const rowId = id();
  await pool.query(
    `INSERT INTO message_outbox (
       id, kind, channel, status, member_id, transaction_id, to_address, subject, body, error, sent_at, created_by, next_attempt_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
    [
      rowId,
      row.kind,
      row.channel,
      row.status,
      row.memberId ?? null,
      row.transactionId ?? null,
      row.to,
      row.subject,
      row.body,
      row.error ?? null,
      row.status === "sent" ? new Date().toISOString() : null,
      row.userId,
    ],
  );
  return rowId;
}

export async function notifyTransaction(
  db: DatabaseShape,
  tx: Transaction,
  kind: NotifyKind,
  channels: NotifyChannel[],
  userId: string,
): Promise<NotifyDelivery[]> {
  const deliveries: NotifyDelivery[] = [];
  const uniqueChannels = [...new Set(channels)];
  for (const channel of uniqueChannels) {
    if (channel === "email") {
      const targets = emailsOf(db, tx.memberId);
      if (!targets.length) {
        const rowId = await recordOutbox({
          kind,
          channel,
          status: "skipped",
          memberId: tx.memberId,
          transactionId: tx.id,
          to: "(sem e-mail)",
          subject: "",
          body: "",
          error: "Associado sem e-mail cadastrado",
          userId,
        });
        deliveries.push({
          id: rowId,
          kind,
          channel,
          status: "skipped",
          to: "(sem e-mail)",
          error: "Associado sem e-mail cadastrado",
        });
        continue;
      }
      for (const target of targets) {
        const { subject, body } = messageFor(db, tx, kind, target.name);
        const rowId = await recordOutbox({
          kind,
          channel,
          status: "queued",
          memberId: tx.memberId,
          transactionId: tx.id,
          to: target.email,
          subject,
          body,
          userId,
        });
        deliveries.push({ id: rowId, kind, channel, status: "queued", to: target.email });
      }
    }
    if (channel === "whatsapp") {
      const targets = phonesOf(db, tx.memberId);
      if (!targets.length) {
        const rowId = await recordOutbox({
          kind,
          channel,
          status: "skipped",
          memberId: tx.memberId,
          transactionId: tx.id,
          to: "(sem telefone)",
          subject: "",
          body: "",
          error: "Associado sem telefone cadastrado",
          userId,
        });
        deliveries.push({
          id: rowId,
          kind,
          channel,
          status: "skipped",
          to: "(sem telefone)",
          error: "Associado sem telefone cadastrado",
        });
        continue;
      }
      for (const target of targets) {
        const { subject, body } = messageFor(db, tx, kind, target.name);
        const rowId = await recordOutbox({
          kind,
          channel,
          status: "queued",
          memberId: tx.memberId,
          transactionId: tx.id,
          to: target.phone,
          subject,
          body,
          userId,
        });
        deliveries.push({ id: rowId, kind, channel, status: "queued", to: target.phone });
      }
    }
  }
  if (deliveries.some((item) => item.status === "queued")) kickOutbox();
  return deliveries;
}

export function isMensalidadeTx(db: DatabaseShape, tx: Transaction) {
  if (tx.type !== "income") return false;
  const movement = db.movementTypes.find((item) => item.id === tx.movementTypeId);
  return Boolean(movement && isMensalidadeName(movement.name));
}

export async function listNotifications(limit = 40) {
  const result = await pool.query(
    `SELECT id, kind, channel, status, to_address, subject, error, created_at, sent_at
     FROM message_outbox
     ORDER BY created_at DESC
     LIMIT $1`,
    [Math.min(Math.max(limit, 1), 100)],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    kind: row.kind as NotifyKind,
    channel: row.channel as NotifyChannel,
    status: row.status as NotifyDelivery["status"],
    to: String(row.to_address ?? ""),
    subject: String(row.subject ?? ""),
    error: row.error ? String(row.error) : undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    sentAt: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at ? String(row.sent_at) : undefined,
  }));
}

export function summarizeDeliveries(items: NotifyDelivery[]) {
  const sent = items.filter((item) => item.status === "sent").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const skipped = items.filter((item) => item.status === "skipped").length;
  const queued = items.filter((item) => item.status === "queued" || item.status === "sending").length;
  return { queued, sent, failed, skipped, total: items.length };
}
