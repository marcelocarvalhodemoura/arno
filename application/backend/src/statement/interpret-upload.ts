import { fold } from "../shared/csv.js";
import type { DatabaseShape } from "../shared/types.js";
import { loadDb, mutate } from "../shared/persistence/finance-store.js";
import { ensureIdentifyType } from "./ingest.js";
import { interpretStatement, type StatementCatalog } from "./statement.js";
import { aiConfigured, enrichWithAi } from "./statement-ai.js";
import { remapImportCsv } from "./import-map.js";
import { pdfToStatementCsv } from "./statement-pdf.js";

export function catalogFromDb(db: DatabaseShape): StatementCatalog {
  return {
    movementTypes: db.movementTypes,
    members: db.members.map((member) => ({
      id: member.id,
      name: member.name,
      branch: member.branch,
      monthlyFee: member.monthlyFee,
      clubeLtc: member.clubeLtc,
      status: member.status,
      accounts: db.memberAccounts
        .filter((account) => account.memberId === member.id && account.active)
        .map((account) => ({
          holderName: account.holderName,
          pixKey: account.pixKey,
          document: account.document,
        })),
      guardians: (db.memberGuardians ?? [])
        .filter((guardian) => guardian.memberId === member.id)
        .map((guardian) => ({ id: guardian.id, name: guardian.name })),
    })),
    fees: db.fees,
    pendingPayments: db.transactions
      .filter((tx) => tx.paymentStatus === "pending" && tx.type === "income")
      .map((tx) => ({
        id: tx.id,
        memberId: tx.memberId,
        amount: tx.amount,
        date: tx.date,
        movementTypeId: tx.movementTypeId,
      })),
  };
}

export async function interpretUploadedStatement(input: { csv?: string; pdf?: string }, userId: string) {
  let csv = input.csv ?? "";
  if (input.pdf) {
    csv = await pdfToStatementCsv(input.pdf);
  }
  const current = await loadDb();
  if (!current.movementTypes.some((item) => item.active && fold(item.name) === "a identificar")) {
    await mutate((db) => {
      ensureIdentifyType(db, userId);
    });
  }
  const db = await loadDb();
  const catalog = catalogFromDb(db);
  const remapped = await remapImportCsv(csv, "statement");
  const interpreted = interpretStatement(remapped.csv, catalog);
  if (interpreted.rows.length > 500) {
    throw new Error("Importe no máximo 500 linhas por vez");
  }
  const enriched = await enrichWithAi(interpreted.rows, catalog);
  return {
    layout: interpreted.layout,
    aiUsed: enriched.used || remapped.usedAi,
    aiAvailable: aiConfigured(),
    aiMapped: remapped.usedAi,
    mapping: remapped.mapping,
    sample: remapped.sample,
    review: remapped.review,
    rows: enriched.rows,
  };
}
