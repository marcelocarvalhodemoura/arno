import { createdAudit, updatedAudit } from "../shared/audit.js";
import { id } from "../shared/id.js";
import type { DatabaseShape, Member, MemberAccount, MemberGuardian, RecordOrigin } from "../shared/types.js";
import type {
  AccountInput,
  CreateMemberInput,
  GuardianInput,
  MemberImportRow,
  PatchMemberInput,
} from "../shared/http/schemas.js";
import { assignOfficialFee, cancelSubsequentMensalidades } from "../mensalidades/mensalidades.js";

export function cleanedGuardians(list: GuardianInput[]) {
  return list
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      relationship: item.relationship.trim(),
      phone: (item.phone ?? "").trim(),
      email: (item.email ?? "").trim(),
    }))
    .filter((item) => item.name.length >= 2);
}

export function assertYouthGuardians(role: string, count: number) {
  if (role === "jovem" && count < 1) {
    throw new Error("Informe pelo menos um responsável do jovem");
  }
}

export function replaceGuardians(
  db: DatabaseShape,
  memberId: string,
  list: ReturnType<typeof cleanedGuardians>,
  userId: string,
  origin: RecordOrigin = "manual",
) {
  const existing = (db.memberGuardians ?? []).filter((item) => item.memberId === memberId);
  const others = (db.memberGuardians ?? []).filter((item) => item.memberId !== memberId);
  const kept: MemberGuardian[] = [];
  const usedIds = new Set<string>();
  for (const item of list) {
    const current = item.id ? existing.find((guardian) => guardian.id === item.id) : undefined;
    if (current) {
      kept.push({
        ...current,
        name: item.name,
        relationship: item.relationship,
        phone: item.phone,
        email: item.email,
        ...updatedAudit(userId),
      });
      usedIds.add(current.id);
      continue;
    }
    kept.push({
      id: id(),
      memberId,
      name: item.name,
      relationship: item.relationship,
      phone: item.phone,
      email: item.email,
      ...createdAudit(userId, origin),
    });
  }
  const removed = new Set(existing.filter((item) => !usedIds.has(item.id)).map((item) => item.id));
  for (const tx of db.transactions) {
    if (tx.memberGuardianId && removed.has(tx.memberGuardianId)) {
      delete tx.memberGuardianId;
    }
  }
  db.memberGuardians = [...others, ...kept];
}

export function resolveGuardianId(db: DatabaseShape, memberId: string | undefined, guardianId: string | undefined) {
  if (!guardianId) return undefined;
  if (!memberId) throw new Error("Informe o associado do responsável");
  const guardian = (db.memberGuardians ?? []).find((item) => item.id === guardianId && item.memberId === memberId);
  if (!guardian) throw new Error("Responsável não pertence a este associado");
  return guardian.id;
}

export function refreshOfficialFees(db: DatabaseShape) {
  for (const member of db.members) assignOfficialFee(member);
  return db;
}

export function createMember(db: DatabaseShape, input: CreateMemberInput, userId: string): Member {
  if (db.members.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("E-mail já cadastrado");
  }
  const { guardians, ...data } = input;
  const list = cleanedGuardians(guardians ?? []);
  assertYouthGuardians(data.role, list.length);
  const created: Member = {
    id: id(),
    status: "active",
    ...data,
    monthlyFee: 0,
    ...createdAudit(userId),
  };
  assignOfficialFee(created);
  db.members.push(created);
  replaceGuardians(db, created.id, list, userId);
  return created;
}

export function updateMember(
  db: DatabaseShape,
  memberId: string,
  input: PatchMemberInput,
  userId: string,
): Member | null {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return null;
  if (
    input.email &&
    db.members.some((item) => item.id !== member.id && item.email.toLowerCase() === input.email!.toLowerCase())
  ) {
    throw new Error("E-mail já cadastrado");
  }
  const { guardians, ...data } = input;
  const nextRole = data.role ?? member.role;
  if (nextRole !== "jovem") {
    replaceGuardians(db, member.id, [], userId);
  } else if (guardians) {
    const list = cleanedGuardians(guardians);
    assertYouthGuardians(nextRole, list.length);
    replaceGuardians(db, member.id, list, userId);
  } else if (data.role === "jovem" && member.role !== "jovem") {
    const count = (db.memberGuardians ?? []).filter((item) => item.memberId === member.id).length;
    assertYouthGuardians(nextRole, count);
  }
  const becameInactive = input.status === "inactive" && member.status !== "inactive";
  Object.assign(member, data);
  assignOfficialFee(member, userId);
  if (becameInactive) {
    cancelSubsequentMensalidades(db, member.id);
  }
  return member;
}

export function addMemberAccount(
  db: DatabaseShape,
  memberId: string,
  input: AccountInput,
  userId: string,
): MemberAccount | null {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return null;
  if (input.isPrimary) {
    for (const account of db.memberAccounts) {
      if (account.memberId === member.id) account.isPrimary = false;
    }
  }
  const account: MemberAccount = {
    id: id(),
    memberId: member.id,
    active: true,
    ...input,
    ...createdAudit(userId),
  };
  db.memberAccounts.push(account);
  return account;
}

export function updateMemberAccount(
  db: DatabaseShape,
  accountId: string,
  input: Partial<AccountInput> & { active?: boolean },
  userId: string,
): MemberAccount | null {
  const account = db.memberAccounts.find((item) => item.id === accountId);
  if (!account) return null;
  Object.assign(account, input, updatedAudit(userId));
  if (input.isPrimary) {
    for (const other of db.memberAccounts) {
      if (other.memberId === account.memberId && other.id !== account.id) {
        other.isPrimary = false;
      }
    }
  }
  return account;
}

export function removeMemberAccount(db: DatabaseShape, accountId: string) {
  const before = db.memberAccounts.length;
  db.memberAccounts = db.memberAccounts.filter((item) => item.id !== accountId);
  return db.memberAccounts.length < before;
}

export function importMembers(db: DatabaseShape, rows: MemberImportRow[], userId: string) {
  const created: string[] = [];
  const skipped: { email: string; reason: string }[] = [];
  for (const row of rows) {
    if (db.members.some((member) => member.email.toLowerCase() === row.email.toLowerCase())) {
      skipped.push({ email: row.email, reason: "E-mail já cadastrado" });
      continue;
    }
    const { guardians, ...data } = row;
    const member: Member = {
      id: id(),
      status: "active",
      ...data,
      monthlyFee: 0,
      ...createdAudit(userId, "integration"),
    };
    assignOfficialFee(member);
    db.members.push(member);
    const list = cleanedGuardians(guardians ?? []);
    if (list.length) replaceGuardians(db, member.id, list, userId, "integration");
    created.push(member.id);
  }
  return { created: created.length, skipped };
}
