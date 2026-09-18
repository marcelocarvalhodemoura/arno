import {
  onTimeMonthlyFee,
  type BranchId,
  type MemberRole,
  type PaymentMethod,
  type TxNature,
  type TxPaymentStatus,
  type TxType,
  type YouthBranchId,
} from "@shared";
import { parseMoney } from "./masks";

export type CsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

export type MapOk<T> = { ok: true; value: T };
export type MapErr = { ok: false; error: string };
export type MapResult<T> = MapOk<T> | MapErr;

export type MemberImportRow = {
  name: string;
  email: string;
  phone: string;
  branch: YouthBranchId;
  role: MemberRole;
  monthlyFee: number;
  joinedAt: string;
  clubeLtc: boolean;
  guardians?: { name: string; relationship: string; phone: string; email: string }[];
};

type GuardianImport = NonNullable<MemberImportRow["guardians"]>[number];

export type TxImportRow = {
  date: string;
  type: TxType;
  nature: TxNature;
  movementTypeId: string;
  movementTypeName: string;
  description: string;
  amount: number;
  branch: BranchId;
  method: PaymentMethod;
  paymentStatus: TxPaymentStatus;
  memberId?: string;
  memberName?: string;
  memberGuardianId?: string;
  memberGuardianName?: string;
};

export function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function parseCsv(text: string): CsvTable {
  const raw = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!raw) return { headers: [], rows: [] };
  const lines = splitCsvLines(raw);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0] ?? "");
  const headers = splitCsvRow(lines[0] ?? "", delimiter).map(normalizeHeader);
  const rows = lines.slice(1).flatMap((line) => {
    if (!line.trim()) return [];
    const cells = splitCsvRow(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    if (Object.values(row).every((value) => !value)) return [];
    return [row];
  });
  return { headers, rows };
}

export function pick(row: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    const value = row[key];
    if (value) return value;
  }
  return "";
}

export function parseIsoDate(value: string): string | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;
  const br = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!br) return null;
  const day = br[1]!.padStart(2, "0");
  const month = br[2]!.padStart(2, "0");
  const year = br[3]!;
  const stamp = `${year}-${month}-${day}`;
  const date = new Date(`${stamp}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return stamp;
}

export function parseAmountCell(value: string): number {
  const trimmed = value.trim().replace(/^r\$\s*/i, "");
  return parseMoney(trimmed);
}

export function parseYesNo(value: string): boolean | null {
  const key = fold(value);
  if (["sim", "yes", "true", "1", "s"].includes(key)) return true;
  if (["nao", "não", "no", "false", "0", "n"].includes(key)) return false;
  return null;
}

export function parseBranch(value: string, allowGrupo = false): BranchId | null {
  const key = fold(value).replace(/\s+/g, " ");
  const map: Record<string, BranchId> = {
    filhote: "filhote",
    filhotes: "filhote",
    "ramo filhotes": "filhote",
    lobinho: "lobinho",
    alcateia: "lobinho",
    "ramo lobinho": "lobinho",
    escoteiro: "escoteiro",
    tropa: "escoteiro",
    "tropa escoteira": "escoteiro",
    "ramo escoteiro": "escoteiro",
    senior: "senior",
    "tropa senior": "senior",
    "ramo senior": "senior",
    pioneiro: "pioneiro",
    "cla pioneiro": "pioneiro",
    "ramo pioneiro": "pioneiro",
    "flor-de-lis": "flor-de-lis",
    "flor de lis": "flor-de-lis",
    clube: "flor-de-lis",
  };
  if (allowGrupo) {
    map.grupo = "grupo";
    map["grupo escoteiro"] = "grupo";
  }
  return map[key] ?? null;
}

export function parseRole(value: string): MemberRole | null {
  const key = fold(value);
  if (key === "jovem") return "jovem";
  if (key === "escotista") return "escotista";
  if (key === "dirigente") return "dirigente";
  if (key === "clube") return "clube";
  return null;
}

export function parseTxType(value: string): TxType | null {
  const key = fold(value);
  if (["entrada", "income", "credito", "c", "cr"].includes(key)) return "income";
  if (["saida", "expense", "debito", "d", "db"].includes(key)) return "expense";
  return null;
}

export function parseNature(value: string): TxNature | null {
  const key = fold(value);
  if (["fixa", "fixed"].includes(key)) return "fixed";
  if (["variavel", "variable"].includes(key)) return "variable";
  return null;
}

export function parseMethod(value: string): PaymentMethod | null {
  const key = fold(value);
  if (key === "pix") return "pix";
  if (["dinheiro", "cash", "especie"].includes(key)) return "cash";
  if (["transferencia", "transfer", "ted", "doc"].includes(key)) return "transfer";
  if (["cartao", "card", "credito", "debito"].includes(key)) return "card";
  if (["outro", "other"].includes(key)) return "other";
  return null;
}

export function parsePaymentStatus(value: string): TxPaymentStatus | null {
  const key = fold(value);
  if (!key || ["pago", "paid", "conciliado"].includes(key)) return "paid";
  if (["pendente", "pending"].includes(key)) return "pending";
  return null;
}

function pickGuardian(row: Record<string, string>, slot: number): GuardianImport | null {
  const suffix = slot === 1 ? "" : `_${slot}`;
  const name = pick(
    row,
    `responsavel${suffix}`,
    `nome_responsavel${suffix}`,
    slot === 1 ? "guardian" : `guardian_${slot}`,
  );
  if (name.length < 2) return null;
  return {
    name,
    relationship:
      pick(row, `parentesco${suffix}`, `grau_parentesco${suffix}`, slot === 1 ? "relacao" : `relacao_${slot}`) ||
      "Outro",
    phone: pick(row, `telefone_responsavel${suffix}`, `fone_responsavel${suffix}`),
    email: pick(row, `email_responsavel${suffix}`),
  };
}

function collectGuardians(row: Record<string, string>): GuardianImport[] | undefined {
  const list = [1, 2, 3].map((slot) => pickGuardian(row, slot)).filter((item): item is GuardianImport => Boolean(item));
  return list.length ? list : undefined;
}

export function mapMemberRow(row: Record<string, string>): MapResult<MemberImportRow> {
  const name = pick(row, "nome", "name", "associado");
  const email = pick(row, "email", "e-mail");
  const phone = pick(row, "telefone", "phone", "celular");
  const branch = parseBranch(pick(row, "ramo", "branch"), false) as YouthBranchId | null;
  const role = parseRole(pick(row, "papel", "funcao", "role"));
  const joinedAt = parseIsoDate(pick(row, "ingresso", "joined_at", "data"));
  const ltcRaw = pick(row, "clube_ltc", "ltc", "clube");
  const clubeLtc = ltcRaw ? parseYesNo(ltcRaw) : false;

  if (name.length < 2) return { ok: false, error: "Informe o nome" };
  if (!email.includes("@")) return { ok: false, error: "E-mail inválido" };
  if (phone.replace(/\D/g, "").length < 8) return { ok: false, error: "Telefone inválido" };
  if (!branch) return { ok: false, error: "Ramo inválido" };
  if (!role) return { ok: false, error: "Papel inválido" };
  if (!joinedAt) return { ok: false, error: "Data de ingresso inválida" };
  if (clubeLtc === null) return { ok: false, error: "Clube LTC deve ser sim ou não" };

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      phone,
      branch,
      role,
      monthlyFee: onTimeMonthlyFee({ branch, clubeLtc }),
      joinedAt,
      clubeLtc,
      guardians: collectGuardians(row),
    },
  };
}

export function mapTxRow(
  row: Record<string, string>,
  ctx: {
    movementTypes: { id: string; name: string; direction?: string; active?: boolean }[];
    members: { id: string; name: string }[];
  },
): MapResult<TxImportRow> {
  const date = parseIsoDate(pick(row, "data", "date", "vencimento"));
  const type = parseTxType(pick(row, "tipo", "type", "direcao"));
  const nature = parseNature(pick(row, "natureza", "nature"));
  const movementName = pick(row, "tipo_movimentacao", "tipo_de_movimentacao", "movimentacao", "movement_type");
  const description = pick(row, "descricao", "description", "historico");
  const amount = parseAmountCell(pick(row, "valor", "amount"));
  const branch = parseBranch(pick(row, "ramo", "branch"), true);
  const method = parseMethod(pick(row, "meio", "method", "forma")) ?? "pix";
  const paymentStatus = parsePaymentStatus(pick(row, "situacao", "status", "conciliação", "conciliacao"));
  const memberName = pick(row, "associado", "member", "nome");

  if (!date) return { ok: false, error: "Data inválida" };
  if (!type) return { ok: false, error: "Tipo deve ser entrada ou saída" };
  if (!nature) return { ok: false, error: "Natureza deve ser fixa ou variável" };
  if (description.length < 2) return { ok: false, error: "Descrição inválida" };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Valor inválido" };
  if (!branch) return { ok: false, error: "Ramo inválido" };
  if (!paymentStatus) return { ok: false, error: "Situação inválida" };

  const movement = ctx.movementTypes.find((item) => fold(item.name) === fold(movementName) && item.active !== false);
  if (!movement) return { ok: false, error: "Tipo de movimentação não encontrado" };
  if (movement.direction && movement.direction !== "both" && movement.direction !== type) {
    return {
      ok: false,
      error: `O tipo ${movement.name} não aceita ${type === "income" ? "entrada" : "saída"}`,
    };
  }

  let memberId: string | undefined;
  if (memberName) {
    const member = ctx.members.find((item) => fold(item.name) === fold(memberName));
    if (!member) return { ok: false, error: "Associado não encontrado" };
    memberId = member.id;
  }

  return {
    ok: true,
    value: {
      date,
      type,
      nature,
      movementTypeId: movement.id,
      movementTypeName: movement.name,
      description,
      amount,
      branch,
      method,
      paymentStatus,
      memberId,
      memberName: memberName || undefined,
    },
  };
}

function normalizeHeader(value: string): string {
  return fold(value)
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_|_$/g, "");
}

function detectDelimiter(headerLine: string): "," | ";" {
  return (headerLine.match(/;/g)?.length ?? 0) >= (headerLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }
    if (char === "\n" && !quoted) {
      lines.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) lines.push(current);
  return lines;
}

function splitCsvRow(line: string, delimiter: "," | ";"): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}
