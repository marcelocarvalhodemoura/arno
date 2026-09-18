import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseCsv, mapMemberRow } from "./csv";
import { workbookToCsv, isImportFile, isPdfFile, isStatementImportFile } from "./spreadsheet";

function sheetFile(rows: unknown[][], bookType: "xlsx" | "xls") {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Planilha");
  return XLSX.write(workbook, { bookType, type: "array" }) as Uint8Array;
}

describe("isImportFile", () => {
  it("accepts csv, txt, xls and xlsx", () => {
    expect(isImportFile(new File([], "associados.csv"))).toBe(true);
    expect(isImportFile(new File([], "extrato.TXT"))).toBe(true);
    expect(isImportFile(new File([], "caixa.xls"))).toBe(true);
    expect(isImportFile(new File([], "caixa.xlsx"))).toBe(true);
    expect(isImportFile(new File([], "foto.pdf"))).toBe(false);
  });

  it("accepts PDF only as a bank statement", () => {
    expect(isStatementImportFile(new File([], "sicredi.pdf"))).toBe(true);
    expect(isPdfFile(new File([], "sicredi.PDF"))).toBe(true);
    expect(isStatementImportFile(new File([], "foto.png"))).toBe(false);
  });
});

describe("workbookToCsv", () => {
  it("reads an xlsx associate sheet with Brazilian headers", () => {
    const buffer = sheetFile(
      [
        ["nome", "email", "telefone", "ramo", "papel", "mensalidade", "ingresso", "clube_ltc"],
        [
          "João da Silva",
          "joao.silva@arnofriedrich.org.br",
          "(51) 99999-1111",
          "Escoteiro",
          "jovem",
          60,
          new Date(2026, 2, 1),
          "não",
        ],
      ],
      "xlsx",
    );
    const table = parseCsv(workbookToCsv(buffer));
    expect(table.rows).toHaveLength(1);
    const mapped = mapMemberRow(table.rows[0]!);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.name).toBe("João da Silva");
      expect(mapped.value.monthlyFee).toBe(89.5);
      expect(mapped.value.joinedAt).toBe("2026-03-01");
    }
  });

  it("reads an xls statement sheet", () => {
    const buffer = sheetFile(
      [
        ["Data", "Histórico", "Valor"],
        [new Date(2026, 7, 14), "PIX RECEBIDO ANA SOUZA", 55],
      ],
      "xls",
    );
    const table = parseCsv(workbookToCsv(buffer));
    expect(table.headers).toEqual(["data", "historico", "valor"]);
    expect(table.rows[0]?.historico).toBe("PIX RECEBIDO ANA SOUZA");
    expect(table.rows[0]?.data).toMatch(/14\/08\/2026|2026-08-14/);
    expect(table.rows[0]?.valor).toMatch(/55/);
  });
});
