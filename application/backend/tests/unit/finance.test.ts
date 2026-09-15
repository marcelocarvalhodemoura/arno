import { describe, expect, it } from "vitest";
import { cashBalance, cashFlow, customReport, inRange, projectActuals, sumBy } from "../../src/finance.js";
import type { DatabaseShape, Transaction } from "../../src/types.js";

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "date" | "type" | "amount">): Transaction {
  return {
    nature: "variable",
    movementTypeId: "mt-doacao",
    description: partial.description ?? partial.id,
    branch: "grupo",
    method: "pix",
    createdAt: `${partial.date}T12:00:00.000Z`,
    origin: "integration",
    paymentStatus: "paid",
    ...partial,
  };
}

const db: DatabaseShape = {
  settings: { openingBalance: 1000, groupName: "Arno" },
  movementTypes: [
    {
      id: "mt-doacao",
      name: "Doação",
      direction: "income",
      description: "",
      active: true,
      origin: "integration",
      createdAt: "2026-01-01T12:00:00.000Z",
    },
    {
      id: "mt-sede",
      name: "Sede",
      direction: "expense",
      description: "",
      active: true,
      origin: "integration",
      createdAt: "2026-01-01T12:00:00.000Z",
    },
  ],
  members: [],
  memberGuardians: [],
  memberAccounts: [],
  fees: [],
  projects: [
    {
      id: "p1",
      branch: "escoteiro",
      year: 2026,
      name: "Projeto",
      description: "",
      items: [],
      origin: "integration",
      createdAt: "2026-01-01T12:00:00.000Z",
    },
  ],
  transactions: [
    tx({ id: "t1", date: "2026-08-10", type: "income", amount: 200, description: "Doação" }),
    tx({
      id: "t2",
      date: "2026-08-20",
      type: "expense",
      amount: 50,
      movementTypeId: "mt-sede",
      nature: "fixed",
      projectId: "p1",
      description: "Aluguel",
    }),
    tx({ id: "t3", date: "2026-09-02", type: "income", amount: 80, branch: "escoteiro" }),
  ],
};

describe("finance helpers", () => {
  it("detects dates in range", () => {
    expect(inRange("2026-08-10", "2026-08-01", "2026-08-31")).toBe(true);
    expect(inRange("2026-09-01", "2026-08-01", "2026-08-31")).toBe(false);
  });

  it("sums amounts", () => {
    expect(sumBy([{ n: 1.1 }, { n: 2.2 }], (row) => row.n)).toBe(3.3);
  });

  it("computes cash balance with opening", () => {
    expect(cashBalance(db, "2026-08-10")).toBe(1200);
    expect(cashBalance(db, "2026-08-20")).toBe(1150);
  });

  it("ignores pending transactions in cash totals", () => {
    const pendingDb: DatabaseShape = {
      ...db,
      transactions: [
        ...db.transactions,
        tx({ id: "t4", date: "2026-08-15", type: "income", amount: 999, paymentStatus: "pending" }),
      ],
    };
    expect(cashBalance(pendingDb, "2026-08-20")).toBe(1150);
    expect(cashFlow(pendingDb, "2026-08-01", "2026-08-31").months[0]?.income).toBe(200);
  });

  it("builds monthly cash flow", () => {
    const flow = cashFlow(db, "2026-08-01", "2026-08-31");
    expect(flow.opening).toBe(1000);
    expect(flow.months).toHaveLength(1);
    expect(flow.months[0]?.income).toBe(200);
    expect(flow.months[0]?.expense).toBe(50);
    expect(flow.closing).toBe(1150);
  });

  it("aggregates project actuals", () => {
    const actuals = projectActuals(db, "p1");
    expect(actuals.expense).toBe(50);
    expect(actuals.income).toBe(0);
  });

  it("filters a custom fiscal report", () => {
    const report = customReport(db, {
      from: "2026-08-01",
      to: "2026-08-31",
      branches: [],
      types: ["expense"],
      natures: [],
      movementTypeIds: [],
      groupBy: "movementType",
    });
    expect(report.transactions).toHaveLength(1);
    expect(report.totals.expense).toBe(50);
    expect(report.ledger[0]?.description).toBe("Aluguel");
  });
});
