export function brl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function chartMoney(value: unknown): string {
  return brl(Number(value ?? 0));
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const stamp = date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return stamp.replace(",", " às");
}

export function formatCompactDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date
    .toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}

export function stampAuthor(author?: { name: string; username?: string } | null): string {
  if (author?.username) return `@${author.username}`;
  const name = author?.name?.trim() || "Carga inicial";
  const parts = name.split(/\s+/);
  if (parts.length > 2) return parts[0];
  return name;
}

export function originShort(origin?: string): string {
  return origin === "manual" ? "Manual" : "Integração";
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function signedClass(value: number): string {
  if (value > 0) return "is-pos";
  if (value < 0) return "is-neg";
  return "";
}

export function methodLabel(method: string): string {
  const map: Record<string, string> = {
    pix: "Pix",
    cash: "Dinheiro",
    transfer: "Transferência",
    card: "Cartão",
    other: "Outro",
  };
  return map[method] ?? method;
}

export function natureLabel(nature: string): string {
  return nature === "fixed" ? "Fixa" : "Variável";
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    jovem: "Jovem",
    escotista: "Escotista",
    dirigente: "Dirigente",
    clube: "Clube",
  };
  return map[role] ?? role;
}

export function yesNo(value: boolean): string {
  return value ? "Sim" : "Não";
}

export function holderKindLabel(kind: string): string {
  const map: Record<string, string> = {
    parent: "Pai / mãe",
    youth: "Jovem",
    other: "Outro",
  };
  return map[kind] ?? kind;
}

export function originLabel(origin?: string): string {
  return origin === "manual" ? "Inserção manual" : "Integração";
}

export function auditAction(updatedAt?: string, createdAt?: string): "Alterado" | "Lançado" {
  return updatedAt && updatedAt !== createdAt ? "Alterado" : "Lançado";
}

export function directionLabel(direction: string): string {
  const map: Record<string, string> = {
    income: "Entrada",
    expense: "Saída",
    both: "Entrada e saída",
  };
  return map[direction] ?? direction;
}

export function typeLabel(type: string): string {
  return type === "income" ? "Entrada" : "Saída";
}

export type TxSettlement = "paid" | "pending" | "overdue";

export function todayISO(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function settlementOf(paymentStatus: string | undefined, date: string, today = todayISO()): TxSettlement {
  if (paymentStatus !== "pending") return "paid";
  return date < today ? "overdue" : "pending";
}

export function settlementLabel(kind: TxSettlement): string {
  if (kind === "paid") return "Pago";
  if (kind === "overdue") return "Vencido";
  return "Pendente";
}

export function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(";"))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
