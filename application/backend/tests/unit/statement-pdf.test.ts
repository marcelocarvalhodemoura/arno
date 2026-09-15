import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { interpretStatement } from "../../src/statement.js";
import { extractPdfText, pdfToStatementCsv, statementTextToCsv } from "../../src/statement-pdf.js";

const SICREDI_TEXT = `Associado: GRUPO ESCOTEIRO ARNO FRIEDRICH
Cooperativa: 0116
Conta: 46881-0
Extrato (Período de 01/01/2026 a 31/01/2026)
Data Descrição Documento Valor (R$) Saldo (R$)
SALDO ANTERIOR 25,77
05/01/2026 RECEBIMENTO PIX 95343334091 MARCUS CHRISTIMANN PIX_CRED 60,00 85,77
Sicredi Fone 0800 724 4770
SAC 0800 724 7220
Ouvidoria 0800 646 2519
`;

const catalog = {
  movementTypes: [
    { id: "mt-men", name: "Mensalidade", direction: "income", active: true },
    { id: "mt-out", name: "Outros", direction: "both", active: true },
  ],
  members: [
    {
      id: "m-lucas",
      name: "Lucas Christimann",
      branch: "lobinho" as const,
      monthlyFee: 60,
      accounts: [{ holderName: "Marcus Christimann", pixKey: "", document: "953.433.340-91" }],
      guardians: [{ id: "g-marcus", name: "Marcus Christimann" }],
    },
  ],
  fees: [{ name: "Mensalidade", amount: 60 }],
};

const fixture = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/sicredi_1781979670.pdf");

describe("statementTextToCsv", () => {
  it("reads Sicredi lines and skips saldo and footer", () => {
    const csv = statementTextToCsv(SICREDI_TEXT);
    expect(csv).toContain("05/01/2026");
    expect(csv).toContain("MARCUS CHRISTIMANN");
    expect(csv).toContain("60,00");
    expect(csv).toContain("entrada");
    expect(csv).not.toContain("SALDO ANTERIOR");
    expect(csv).not.toContain("0800");
  });

  it("keeps the movement value instead of the running balance", () => {
    const csv = statementTextToCsv(
      `Data Descrição Documento Valor (R$) Saldo (R$)
12/01/2026 PAGAMENTO PIX TARIFA PACOTE PIX_DEB 12,90 72,87
`,
    );
    expect(csv).toContain("-12,90");
    expect(csv).toContain("saida");
    expect(csv).not.toContain("72,87");
  });
});

describe("interpretStatement from Sicredi text", () => {
  it("marks a PIX matching the fee and guardian as paid mensalidade", () => {
    const result = interpretStatement(statementTextToCsv(SICREDI_TEXT), catalog);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.amount).toBe(60);
    expect(result.rows[0]?.type).toBe("income");
    expect(result.rows[0]?.movementTypeName).toBe("Mensalidade");
    expect(result.rows[0]?.memberId).toBe("m-lucas");
    expect(result.rows[0]?.memberGuardianId).toBe("g-marcus");
    expect(result.rows[0]?.paymentStatus).toBe("paid");
    expect(result.rows[0]?.error).toBeUndefined();
  });
});

describe("pdfToStatementCsv", () => {
  it("extracts the attached Sicredi PDF", async () => {
    const text = await extractPdfText(new Uint8Array(readFileSync(fixture)));
    expect(text).toMatch(/RECEBIMENTO PIX/i);
    expect(text).toMatch(/MARCUS CHRISTIMANN/i);

    const csv = await pdfToStatementCsv(readFileSync(fixture).toString("base64"));
    const result = interpretStatement(csv, catalog);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.amount).toBe(60);
    expect(result.rows[0]?.memberId).toBe("m-lucas");
    expect(result.rows[0]?.movementTypeName).toBe("Mensalidade");
  });
});
