import { describe, expect, it } from "vitest";
import {
  auditAction,
  directionLabel,
  formatCompactDateTime,
  formatDate,
  natureLabel,
  originLabel,
  originShort,
  stampAuthor,
  settlementLabel,
  settlementOf,
  typeLabel,
  yesNo,
} from "./format";
import { dateInPeriod, periodRange } from "./period";

describe("formatDate", () => {
  it("converts ISO dates to pt-BR", () => {
    expect(formatDate("2026-08-09")).toBe("09/08/2026");
  });

  it("compacts date-time stamps", () => {
    expect(formatCompactDateTime("2026-09-14T16:46:00.000Z")).toMatch(/14\/09\/26 \d{2}:\d{2}/);
  });
});

describe("labels", () => {
  it("translates domain values", () => {
    expect(natureLabel("fixed")).toBe("Fixa");
    expect(typeLabel("income")).toBe("Entrada");
    expect(directionLabel("both")).toBe("Entrada e saída");
    expect(yesNo(true)).toBe("Sim");
    expect(yesNo(false)).toBe("Não");
    expect(originLabel("manual")).toBe("Inserção manual");
    expect(originLabel("integration")).toBe("Integração");
    expect(originShort("manual")).toBe("Manual");
    expect(originShort("integration")).toBe("Integração");
    expect(stampAuthor({ name: "Tesouraria do Grupo", username: "tesouraria" })).toBe("@tesouraria");
    expect(stampAuthor({ name: "Administração do Grupo" })).toBe("Administração");
    expect(stampAuthor({ name: "Carga inicial" })).toBe("Carga inicial");
    expect(auditAction(undefined, "2026-08-01T12:00:00.000Z")).toBe("Lançado");
    expect(auditAction("2026-08-02T12:00:00.000Z", "2026-08-01T12:00:00.000Z")).toBe("Alterado");
    expect(settlementOf("paid", "2026-01-01", "2026-09-14")).toBe("paid");
    expect(settlementOf("pending", "2026-09-14", "2026-09-14")).toBe("pending");
    expect(settlementOf("pending", "2026-09-13", "2026-09-14")).toBe("overdue");
    expect(settlementLabel("paid")).toBe("Pago");
    expect(settlementLabel("pending")).toBe("Pendente");
    expect(settlementLabel("overdue")).toBe("Vencido");
  });
});

describe("periodRange", () => {
  it("covers a whole month", () => {
    expect(periodRange(2026, 8)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
      monthStart: "2026-08-01",
      asOf: "2026-08-31",
    });
  });

  it("covers the whole year when month is 0", () => {
    expect(periodRange(2026, 0).from).toBe("2026-01-01");
    expect(periodRange(2026, 0).to).toBe("2026-12-31");
  });

  it("uses today when it is inside the selected period", () => {
    expect(dateInPeriod(2026, 9, "2026-09-14")).toBe("2026-09-14");
  });

  it("falls back to the last day when today is outside the period", () => {
    expect(dateInPeriod(2026, 8, "2026-09-14")).toBe("2026-08-31");
  });
});
