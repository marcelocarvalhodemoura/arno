import {
  csvCells,
  csvLines,
  fold,
  normalizeHeader,
  parseCsv,
  parseIsoDate,
  parseSignedAmount,
  type CsvTable,
} from "./csv.js";
import { aiConfigured, chatJson } from "./openai.js";
import { isTemplate } from "./statement.js";

export type ImportKind = "members" | "statement";

export type CanonicalField =
  | "date"
  | "description"
  | "amount"
  | "credit"
  | "debit"
  | "type"
  | "member"
  | "method"
  | "status"
  | "nature"
  | "branch"
  | "movementType"
  | "name"
  | "email"
  | "phone"
  | "monthlyFee"
  | "joinedAt"
  | "role"
  | "clubeLtc"
  | "guardianName"
  | "guardianRelationship"
  | "guardianPhone"
  | "guardianEmail";

export type FieldMapping = Partial<Record<CanonicalField, string>>;

export type SampleColumn = {
  field: CanonicalField;
  label: string;
  source: string;
  column: string;
};

export type ImportSample = {
  totalRows: number;
  shown: number;
  columns: SampleColumn[];
  rows: Record<string, string>[];
};

export type SampleReview = {
  usedAi: boolean;
  ok: boolean;
  summary: string;
};

export type RemapResult = {
  csv: string;
  table: CsvTable;
  usedAi: boolean;
  mapping: FieldMapping;
  sample: ImportSample;
  review: SampleReview;
};

const COLUMN: Record<CanonicalField, string> = {
  date: "data",
  description: "historico",
  amount: "valor",
  credit: "credito",
  debit: "debito",
  type: "tipo",
  member: "associado",
  method: "meio",
  status: "situacao",
  nature: "natureza",
  branch: "ramo",
  movementType: "tipo_movimentacao",
  name: "nome",
  email: "email",
  phone: "telefone",
  monthlyFee: "mensalidade",
  joinedAt: "ingresso",
  role: "papel",
  clubeLtc: "clube_ltc",
  guardianName: "responsavel",
  guardianRelationship: "parentesco",
  guardianPhone: "telefone_responsavel",
  guardianEmail: "email_responsavel",
};

const FIELD_LABEL: Record<CanonicalField, string> = {
  date: "Data",
  description: "Histórico",
  amount: "Valor",
  credit: "Crédito",
  debit: "Débito",
  type: "Tipo",
  member: "Associado",
  method: "Meio",
  status: "Situação",
  nature: "Natureza",
  branch: "Ramo",
  movementType: "Tipo de movimentação",
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  monthlyFee: "Mensalidade",
  joinedAt: "Ingresso",
  role: "Papel",
  clubeLtc: "Clube LTC",
  guardianName: "Responsável",
  guardianRelationship: "Parentesco",
  guardianPhone: "Telefone do responsável",
  guardianEmail: "E-mail do responsável",
};

const SPLIT_AMOUNT = /(credito|debito|credit|debit)/;

const ALIASES: Record<CanonicalField, string[]> = {
  date: [
    "data",
    "date",
    "dt",
    "data_movimento",
    "dt_movimento",
    "data_lancamento",
    "dt_lancamento",
    "data_do_lancamento",
    "vencimento",
    "dt_lcto",
    "data_lcto",
  ],
  description: [
    "historico",
    "descricao",
    "lancamento",
    "memo",
    "historico_completo",
    "identificador",
    "historico_do_lancamento",
    "descricao_do_lancamento",
    "historico_lancamento",
    "detalhe",
    "complemento",
  ],
  amount: ["valor", "amount", "vlr", "valor_movimento", "valor_r", "valor_rs", "valor_lancamento"],
  credit: ["credito", "credit", "entrada", "valor_credito", "vlr_credito"],
  debit: ["debito", "debit", "saida", "valor_debito", "vlr_debito"],
  type: ["tipo", "dc", "c_d", "natureza_dc", "entrada_saida", "credito_debito", "tipo_lancamento"],
  member: ["associado", "member", "pagador", "nome_pagador", "remetente", "beneficiario"],
  method: ["meio", "method", "forma", "forma_pagamento", "canal"],
  status: ["situacao", "status", "conciliacao"],
  nature: ["natureza", "nature"],
  branch: ["ramo", "branch", "secao"],
  movementType: ["tipo_movimentacao", "tipo_de_movimentacao", "movimentacao", "movement_type"],
  name: ["nome", "name", "associado", "nome_completo"],
  email: ["email", "e_mail", "mail"],
  phone: ["telefone", "phone", "celular", "whatsapp", "fone"],
  monthlyFee: ["mensalidade", "monthly_fee", "taxa", "valor_mensalidade"],
  joinedAt: ["ingresso", "joined_at", "data_ingresso", "data_cadastro"],
  role: ["papel", "funcao", "role"],
  clubeLtc: ["clube_ltc", "ltc", "clube"],
  guardianName: ["responsavel", "nome_responsavel", "guardian", "pai_mae", "responsavel_legal"],
  guardianRelationship: ["parentesco", "grau_parentesco", "relacao", "vinculo"],
  guardianPhone: ["telefone_responsavel", "fone_responsavel", "celular_responsavel"],
  guardianEmail: ["email_responsavel", "e_mail_responsavel"],
};

const STATEMENT_FIELDS: CanonicalField[] = [
  "date",
  "description",
  "credit",
  "debit",
  "amount",
  "type",
  "member",
  "method",
  "status",
  "nature",
  "branch",
  "movementType",
];

const MEMBER_FIELDS: CanonicalField[] = [
  "name",
  "email",
  "phone",
  "branch",
  "role",
  "monthlyFee",
  "joinedAt",
  "clubeLtc",
  "guardianName",
  "guardianRelationship",
  "guardianPhone",
  "guardianEmail",
];

export async function remapImportCsv(csv: string, kind: ImportKind): Promise<RemapResult> {
  const headerIndex = detectHeaderIndex(csv, kind);
  const original = parseCsv(csv, headerIndex);
  if (!original.rows.length) {
    return finishRemap(csv, original, false, {}, kind);
  }

  if (kind === "statement" && isTemplate(original.headers)) {
    return finishRemap(tableToCsv(original), original, false, {}, kind);
  }

  let mapping = heuristicMapping(original.headers, kind);
  let usedAi = false;

  if (aiConfigured() && needsAi(mapping, kind)) {
    const ai = await mapFieldsWithAi(csv, kind, headerIndex);
    if (ai) {
      usedAi = true;
      const parsed = parseCsv(csv, ai.headerIndex);
      const resolved = resolveMapping(parsed.headers, ai.fields, kind);
      if (Object.keys(resolved).length) {
        mapping = { ...mapping, ...resolved };
        const remapped = applyMapping(parsed, mapping, kind);
        return finishRemap(tableToCsv(remapped), remapped, usedAi, mapping, kind);
      }
    }
  }

  const remapped = applyMapping(original, mapping, kind);
  return finishRemap(tableToCsv(remapped), remapped, usedAi, mapping, kind);
}

async function finishRemap(
  csv: string,
  table: CsvTable,
  usedAi: boolean,
  mapping: FieldMapping,
  kind: ImportKind,
): Promise<RemapResult> {
  const sample = buildImportSample(table, mapping, kind);
  const review = await reviewImportSample(sample, kind);
  return { csv, table, usedAi, mapping, sample, review };
}

export function buildImportSample(table: CsvTable, mapping: FieldMapping, kind: ImportKind): ImportSample {
  const fields = kind === "members" ? MEMBER_FIELDS : STATEMENT_FIELDS;
  let columns: SampleColumn[] = fields
    .filter((field) => mapping[field])
    .map((field) => ({
      field,
      label: FIELD_LABEL[field],
      source: mapping[field] ?? COLUMN[field],
      column: COLUMN[field],
    }));
  if (!columns.length) {
    columns = fields
      .filter((field) => table.headers.includes(COLUMN[field]))
      .map((field) => ({
        field,
        label: FIELD_LABEL[field],
        source: COLUMN[field],
        column: COLUMN[field],
      }));
  }
  const shown = Math.min(5, table.rows.length);
  const rows = table.rows.slice(0, shown).map((row) => {
    const next: Record<string, string> = {};
    for (const column of columns) {
      next[column.column] = row[column.column] ?? "";
    }
    return next;
  });
  return { totalRows: table.rows.length, shown, columns, rows };
}

export async function reviewImportSample(sample: ImportSample, kind: ImportKind): Promise<SampleReview> {
  const heuristic = heuristicSampleReview(sample, kind);
  if (process.env.VITEST || !aiConfigured() || !sample.rows.length) return heuristic;
  const ai = await chatJson<{ ok?: boolean; summary?: string }>(
    'Você valida uma AMOSTRA de importação da tesouraria de um grupo escoteiro. Responda só JSON {"ok":true,"summary":"..."}. summary em português, 1 ou 2 frases, para o tesoureiro conferir se os campos batem com os exemplos. Não invente datas, valores ou nomes. Não peça para gravar se data, valor, nome ou e-mail parecerem coluna trocada.',
    {
      kind,
      colunas: sample.columns.map((column) => ({
        campo: column.label,
        origem: column.source,
        exemplos: sample.rows.map((row) => row[column.column]).filter(Boolean).slice(0, 5),
      })),
    },
    12_000,
  );
  if (!ai?.summary) return heuristic;
  return {
    usedAi: true,
    ok: heuristic.ok && ai.ok !== false,
    summary: heuristic.ok ? ai.summary.trim() : heuristic.summary,
  };
}

function heuristicSampleReview(sample: ImportSample, kind: ImportKind): SampleReview {
  if (!sample.rows.length) {
    return { usedAi: false, ok: false, summary: "Não há linhas na amostragem para conferir." };
  }
  const problems: string[] = [];
  for (const column of sample.columns) {
    const values = sample.rows.map((row) => row[column.column]?.trim() ?? "").filter(Boolean);
    if (!values.length) {
      if (OPTIONAL_SAMPLE.has(column.field)) continue;
      problems.push(`${column.label} veio vazio na amostra`);
      continue;
    }
    if ((column.field === "date" || column.field === "joinedAt") && !values.some((value) => parseIsoDate(value))) {
      problems.push(`${column.label} não parece data (${values[0]})`);
    }
    if (
      (column.field === "amount" ||
        column.field === "credit" ||
        column.field === "debit" ||
        column.field === "monthlyFee") &&
      !values.some((value) => Number.isFinite(parseSignedAmount(value)))
    ) {
      problems.push(`${column.label} não parece valor (${values[0]})`);
    }
    if (column.field === "email" && !values.some((value) => value.includes("@"))) {
      problems.push(`${column.label} não parece e-mail (${values[0]})`);
    }
    if (column.field === "name" && values[0]!.length < 2) {
      problems.push(`${column.label} está curto demais na amostra`);
    }
    if (column.field === "description" && values[0]!.length < 3) {
      problems.push(`${column.label} está curto demais na amostra`);
    }
  }
  const needed =
    kind === "members"
      ? sample.columns.some((column) => column.field === "name") &&
        sample.columns.some((column) => column.field === "email")
      : sample.columns.some((column) => column.field === "date") &&
        sample.columns.some((column) => column.field === "description") &&
        sample.columns.some(
          (column) => column.field === "amount" || column.field === "credit" || column.field === "debit",
        );
  if (!needed) problems.push("Faltam campos obrigatórios na amostra");
  const ok = problems.length === 0;
  return {
    usedAi: false,
    ok,
    summary: ok
      ? `Amostra com ${sample.shown} ${sample.shown === 1 ? "linha" : "linhas"}: os exemplos batem com os campos identificados.`
      : problems.join(". "),
  };
}

const OPTIONAL_SAMPLE = new Set<CanonicalField>([
  "credit",
  "debit",
  "amount",
  "type",
  "member",
  "method",
  "status",
  "nature",
  "branch",
  "movementType",
  "phone",
  "role",
  "clubeLtc",
  "monthlyFee",
  "joinedAt",
  "guardianName",
  "guardianRelationship",
  "guardianPhone",
  "guardianEmail",
]);

export function detectHeaderIndex(csv: string, kind: ImportKind): number {
  const lines = csvLines(csv).filter((line) => line.trim());
  const fields = kind === "members" ? MEMBER_FIELDS : STATEMENT_FIELDS;
  let best = 0;
  let bestScore = -1;
  for (let index = 0; index < Math.min(lines.length, 20); index += 1) {
    const headers = csvCells(lines[index] ?? "").map(normalizeHeader);
    const score = fields.reduce((sum, field) => sum + (matchHeader(headers, field) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
    if (score >= 3) return index;
  }
  return bestScore >= 2 ? best : 0;
}

export function heuristicMapping(headers: string[], kind: ImportKind): FieldMapping {
  const fields = kind === "members" ? MEMBER_FIELDS : STATEMENT_FIELDS;
  const mapping: FieldMapping = {};
  const used = new Set<string>();
  for (const field of fields) {
    const header = matchHeader(headers, field, used);
    if (!header) continue;
    mapping[field] = header;
    used.add(header);
  }
  return mapping;
}

function needsAi(mapping: FieldMapping, kind: ImportKind): boolean {
  if (kind === "members") {
    return !mapping.name || !mapping.email;
  }
  const hasAmount = Boolean(mapping.amount || mapping.credit || mapping.debit);
  return !mapping.date || !mapping.description || !hasAmount;
}

async function mapFieldsWithAi(
  csv: string,
  kind: ImportKind,
  headerIndex: number,
): Promise<{ headerIndex: number; fields: Record<string, string> } | null> {
  const lines = csvLines(csv)
    .filter((line) => line.trim())
    .slice(0, 12)
    .map((line) => csvCells(line).map((cell) => cell.slice(0, 80)));
  const parsed = await chatJson<{
    headerRow?: number;
    fields?: Record<string, string>;
  }>(
    kind === "members"
      ? 'Você identifica colunas de uma planilha de associados de grupo escoteiro. Responda só JSON {"headerRow":0,"fields":{}}. headerRow é o índice da linha de títulos (0 é a primeira). fields usa as chaves name,email,phone,branch,role,monthlyFee,joinedAt,clubeLtc,guardianName,guardianRelationship,guardianPhone,guardianEmail e o valor é o texto EXATO do cabeçalho. Não invente colunas. Omita o que não existir.'
      : 'Você identifica colunas de um extrato bancário ou planilha da tesouraria. Responda só JSON {"headerRow":0,"fields":{}}. headerRow é o índice da linha de títulos. fields usa as chaves date,description,amount,credit,debit,type,member,method,status,nature,branch,movementType e o valor é o texto EXATO do cabeçalho. Não invente valores de células. Omita o que não existir. Se crédito e débito forem colunas separadas, não use amount.',
    { kind, headerRowHint: headerIndex, linhas: lines },
  );
  if (!parsed?.fields) return null;
  const nextIndex =
    typeof parsed.headerRow === "number" && parsed.headerRow >= 0 && parsed.headerRow < 20
      ? parsed.headerRow
      : headerIndex;
  return { headerIndex: nextIndex, fields: parsed.fields };
}

function resolveMapping(headers: string[], fields: Record<string, string>, kind: ImportKind): FieldMapping {
  const allowed = new Set(kind === "members" ? MEMBER_FIELDS : STATEMENT_FIELDS);
  const mapping: FieldMapping = {};
  for (const [field, label] of Object.entries(fields)) {
    if (!allowed.has(field as CanonicalField) || !label) continue;
    const header = headers.find((item) => item === normalizeHeader(label) || item === fold(label));
    if (header) mapping[field as CanonicalField] = header;
  }
  return mapping;
}

function applyMapping(table: CsvTable, mapping: FieldMapping, kind: ImportKind): CsvTable {
  const fields = kind === "members" ? MEMBER_FIELDS : STATEMENT_FIELDS;
  const headers = fields.filter((field) => mapping[field]).map((field) => COLUMN[field]);
  if (!headers.length) return table;
  const unique = [...new Set(headers)];
  const rows = table.rows.map((row) => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const source = mapping[field];
      if (!source) continue;
      next[COLUMN[field]] = row[source] ?? "";
    }
    return next;
  });
  return { headers: unique, rows };
}

function tableToCsv(table: CsvTable): string {
  const escape = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = [
    table.headers.join(";"),
    ...table.rows.map((row) => table.headers.map((header) => escape(row[header] ?? "")).join(";")),
  ];
  return lines.join("\n");
}

function matchHeader(headers: string[], field: CanonicalField, used: Set<string> = new Set()): string | undefined {
  const aliases = ALIASES[field];
  const candidates = headers.filter((header) => !used.has(header));
  const exact = candidates.find((header) => aliases.includes(header));
  if (exact) return exact;
  if (field === "date") {
    const dated = candidates.find((header) => header.startsWith("dt_"));
    if (dated) return dated;
  }
  if (field === "amount") {
    const valued = candidates.find((header) => header.startsWith("vlr_") && !SPLIT_AMOUNT.test(header));
    if (valued) return valued;
  }
  return candidates.find((header) => {
    if (field === "amount" && SPLIT_AMOUNT.test(header)) return false;
    return aliases.some(
      (alias) =>
        alias.length >= 4 && (header.startsWith(`${alias}_`) || header.endsWith(`_${alias}`)),
    );
  });
}
