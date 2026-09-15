import * as XLSX from "xlsx";

const IMPORT_NAME = /\.(csv|txt|xlsx|xls)$/i;

export function isImportFile(file: File): boolean {
  return IMPORT_NAME.test(file.name);
}

export function isPdfFile(file: File): boolean {
  return /\.pdf$/i.test(file.name);
}

export function isStatementImportFile(file: File): boolean {
  return isImportFile(file) || isPdfFile(file);
}

export async function fileToCsvText(file: File): Promise<string> {
  if (!isImportFile(file)) {
    throw new Error("Use um arquivo .csv, .txt, .xls ou .xlsx");
  }
  if (isSpreadsheetFile(file)) {
    const text = workbookToCsv(await file.arrayBuffer());
    if (!text.trim()) {
      throw new Error("A planilha está vazia");
    }
    return text;
  }
  return file.text();
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function isSpreadsheetFile(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name);
}

export function workbookToCsv(buffer: ArrayBuffer | Uint8Array): string {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheet = firstSheet(workbook);
  if (!sheet) return "";
  const rows = XLSX.utils.sheet_to_json<(unknown | undefined)[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: "",
  });
  return rows
    .map((row) => row.map((cell) => csvEscape(formatCell(cell))).join(";"))
    .filter((line) => line.replace(/;+/g, "").trim())
    .join("\n");
}

function formatCell(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getUTCDate()).padStart(2, "0");
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${value.getUTCFullYear()}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: false });
  }
  if (typeof value === "boolean") return value ? "sim" : "não";
  return String(value).trim();
}

function csvEscape(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function firstSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | undefined {
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet && sheet["!ref"]) return sheet;
  }
  return workbook.Sheets[workbook.SheetNames[0] ?? ""];
}
