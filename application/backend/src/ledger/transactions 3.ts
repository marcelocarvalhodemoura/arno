import { createdAudit, updatedAudit } from "../shared/audit.js";
import { id } from "../shared/id.js";
import type { BranchId, DatabaseShape, Transaction } from "../shared/types.js";
import { roundMoney } from "../shared/types.js";
import type { CreateTransactionInput, PatchTransactionInput } from "../shared/http/schemas.js";
import { resolveGuardianId } from "../members/members.js";

export function listTransactions(
  db: DatabaseShape,
  filters: { from: string; to: string; branch?: BranchId; type?: Transaction["type"]; nature?: Transaction["nature"] },
) {
  let list = db.transactions.filter((item) => item.date >= filters.from && item.date <= filters.to);
  if (filters.branch) list = list.filter((item) => item.branch === filters.branch);
  if (filters.type) list = list.filter((item) => item.type === filters.type);
  if (filters.nature) list = list.filter((item) => item.nature === filters.nature);
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export function createTransaction(db: DatabaseShape, input: CreateTransactionInput, userId: string): Transaction {
  const movement = db.movementTypes.find((item) => item.id === input.movementTypeId);
  if (!movement || !movement.active) throw new Error("Tipo de movimentação inválido");
  if (movement.direction !== "both" && movement.direction !== input.type) {
    throw new Error("Este tipo não aceita essa direção (entrada/saída)");
  }
  const memberGuardianId = resolveGuardianId(db, input.memberId, input.memberGuardianId);
  const tx: Transaction = {
    id: id(),
    ...input,
    memberGuardianId,
    paymentStatus: input.paymentStatus ?? "paid",
    amount: roundMoney(input.amount),
    ...createdAudit(userId),
  };
  if (!memberGuardianId) delete tx.memberGuardianId;
  db.transactions.push(tx);
  return tx;
}

export function updateTransaction(
  db: DatabaseShape,
  txId: string,
  input: PatchTransactionInput,
  userId: string,
): { tx: Transaction; shouldNotify: boolean } | null {
  const tx = db.transactions.find((item) => item.id === txId);
  if (!tx) return null;
  const {
    memberId,
    memberAccountId,
    memberGuardianId,
    projectId,
    amount,
    movementTypeId,
    type,
    notifyReceipt,
    ...rest
  } = input;
  const shouldNotify = Boolean(notifyReceipt) && input.paymentStatus === "paid" && tx.paymentStatus !== "paid";
  const nextType = type ?? tx.type;
  const nextMovementId = movementTypeId ?? tx.movementTypeId;
  const movement = db.movementTypes.find((item) => item.id === nextMovementId);
  if (!movement) throw new Error("Tipo de movimentação inválido");
  const sameKind = nextType === tx.type && nextMovementId === tx.movementTypeId;
  if (!sameKind) {
    if (!movement.active) throw new Error("Este tipo está inativo. Escolha outro tipo de movimentação.");
    if (movement.direction !== "both" && movement.direction !== nextType) {
      throw new Error("Este tipo não aceita essa direção (entrada/saída). Troque o tipo ou a direção.");
    }
  }
  Object.assign(tx, rest, { type: nextType, movementTypeId: nextMovementId }, updatedAudit(userId));
  if (amount !== undefined) tx.amount = roundMoney(amount);
  if (memberId === null) delete tx.memberId;
  else if (memberId) tx.memberId = memberId;
  if (memberAccountId === null) delete tx.memberAccountId;
  else if (memberAccountId) tx.memberAccountId = memberAccountId;
  if (projectId === null) delete tx.projectId;
  else if (projectId) tx.projectId = projectId;
  const nextMemberId = memberId === null ? undefined : (memberId ?? tx.memberId);
  if (memberGuardianId === null || !nextMemberId) {
    delete tx.memberGuardianId;
  } else if (memberGuardianId) {
    tx.memberGuardianId = resolveGuardianId(db, nextMemberId, memberGuardianId);
  } else if (tx.memberGuardianId) {
    const belongs = (db.memberGuardians ?? []).some(
      (item) => item.id === tx.memberGuardianId && item.memberId === nextMemberId,
    );
    if (!belongs) delete tx.memberGuardianId;
  }
  return { tx, shouldNotify };
}

export function deleteTransaction(db: DatabaseShape, txId: string) {
  const before = db.transactions.length;
  db.transactions = db.transactions.filter((item) => item.id !== txId);
  return db.transactions.length < before;
}
