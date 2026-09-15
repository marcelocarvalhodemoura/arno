import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { pool } from "../../src/db.js";
import { isUuidV7 } from "../../src/id.js";
import { TEST_ADMIN_USER, TEST_PASSWORD, TEST_TREASURER_USER } from "./credentials.js";

const app = createApp();

async function login(user: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ user, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

async function tesoureiroAuth() {
  const token = await login(TEST_TREASURER_USER, TEST_PASSWORD);
  return { Authorization: `Bearer ${token}` };
}

async function ensureType(
  auth: { Authorization: string },
  name: string,
  direction: "income" | "expense" | "both",
) {
  const listed = await request(app).get("/api/movement-types").set(auth);
  const existing = listed.body.find((item: { name: string }) => item.name === name);
  if (existing) return existing as { id: string; name: string };
  const created = await request(app)
    .post("/api/movement-types")
    .set(auth)
    .send({ name, direction, description: name });
  expect(created.status).toBe(201);
  return created.body as { id: string; name: string };
}

describe("API integration", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("reports health without auth", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ user: "admin", password: "errada" });
    expect(res.status).toBe(401);
  });

  it("lets the tesoureiro use cash flow endpoints", async () => {
    const auth = await tesoureiroAuth();
    const incomeType = await ensureType(auth, "Doação", "income");

    const createdMember = await request(app)
      .post("/api/members")
      .set(auth)
      .send({
        name: "Associado LTC Teste",
        email: `ltc.teste.${Date.now()}@arnofriedrich.org.br`,
        phone: "(51) 99999-0000",
        branch: "escoteiro",
        role: "jovem",
        monthlyFee: 60,
        joinedAt: "2026-08-01",
        clubeLtc: true,
        guardians: [{ name: "Maria Teste", relationship: "Mãe", phone: "(51) 99999-0001", email: "" }],
      });
    expect(createdMember.status).toBe(201);
    expect(createdMember.body.clubeLtc).toBe(true);
    expect(createdMember.body.origin).toBe("manual");
    expect(isUuidV7(createdMember.body.id)).toBe(true);

    const listedAfterCreate = await request(app).get("/api/members").set(auth);
    const saved = listedAfterCreate.body.find((item: { id: string }) => item.id === createdMember.body.id);
    expect(saved.guardians).toHaveLength(1);
    expect(saved.guardians[0].name).toBe("Maria Teste");
    expect(saved.guardians[0].relationship).toBe("Mãe");

    const withoutGuardian = await request(app)
      .post("/api/members")
      .set(auth)
      .send({
        name: "Jovem sem responsável",
        email: `sem.resp.${Date.now()}@arnofriedrich.org.br`,
        phone: "(51) 99999-0002",
        branch: "escoteiro",
        role: "jovem",
        monthlyFee: 60,
        joinedAt: "2026-08-01",
        clubeLtc: false,
      });
    expect(withoutGuardian.status).toBe(400);

    const patchedMember = await request(app)
      .patch(`/api/members/${createdMember.body.id}`)
      .set(auth)
      .send({
        name: "Associado LTC Alterado",
        phone: "(51) 98888-0000",
        monthlyFee: 75,
        branch: "senior",
        clubeLtc: false,
      });
    expect(patchedMember.status).toBe(200);
    expect(patchedMember.body.name).toBe("Associado LTC Alterado");
    expect(patchedMember.body.phone).toBe("(51) 98888-0000");
    expect(patchedMember.body.monthlyFee).toBe(75);
    expect(patchedMember.body.branch).toBe("senior");
    expect(patchedMember.body.clubeLtc).toBe(false);
    expect(patchedMember.body.updatedAt).toBeTruthy();
    expect(patchedMember.body.updatedBy).toBeTruthy();
    expect(patchedMember.body.origin).toBe("manual");

    const listedAfterPatch = await request(app).get("/api/members").set(auth);
    const savedAfterPatch = listedAfterPatch.body.find((item: { id: string }) => item.id === createdMember.body.id);
    expect(savedAfterPatch.guardians).toHaveLength(1);
    expect(savedAfterPatch.guardians[0].name).toBe("Maria Teste");

    const renamedGuardian = await request(app)
      .patch(`/api/members/${createdMember.body.id}`)
      .set(auth)
      .send({
        guardians: [
          {
            id: savedAfterPatch.guardians[0].id,
            name: "Maria Teste Alterada",
            relationship: "Mãe",
            phone: "(51) 99999-0001",
            email: "",
          },
        ],
      });
    expect(renamedGuardian.status).toBe(200);
    const listedAfterRename = await request(app).get("/api/members").set(auth);
    const savedAfterRename = listedAfterRename.body.find((item: { id: string }) => item.id === createdMember.body.id);
    expect(savedAfterRename.guardians).toHaveLength(1);
    expect(savedAfterRename.guardians[0].id).toBe(savedAfterPatch.guardians[0].id);
    expect(savedAfterRename.guardians[0].name).toBe("Maria Teste Alterada");

    const duplicate = await request(app)
      .post("/api/members")
      .set(auth)
      .send({
        name: "Outro associado",
        email: createdMember.body.email,
        phone: "(51) 99999-1111",
        branch: "escoteiro",
        role: "jovem",
        monthlyFee: 60,
        joinedAt: "2026-08-01",
        clubeLtc: false,
      });
    expect(duplicate.status).toBe(409);

    const members = await request(app).get("/api/members").set(auth);
    expect(members.status).toBe(200);
    expect(members.body.length).toBeGreaterThan(0);
    expect(typeof members.body[0].clubeLtc).toBe("boolean");
    expect(isUuidV7(members.body[0].id)).toBe(true);

    const txs = await request(app)
      .get("/api/transactions?from=2026-08-01&to=2026-08-31")
      .set(auth);
    expect(txs.status).toBe(200);
    expect(Array.isArray(txs.body)).toBe(true);

    const flow = await request(app)
      .get("/api/reports/cashflow?from=2026-08-01&to=2026-08-31")
      .set(auth);
    expect(flow.status).toBe(200);
    expect(flow.body).toHaveProperty("opening");
    expect(flow.body).toHaveProperty("closing");

    const created = await request(app)
      .post("/api/transactions")
      .set(auth)
      .send({
        date: "2026-08-28",
        type: "income",
        nature: "variable",
        movementTypeId: incomeType.id,
        description: "Lançamento de teste de integração",
        amount: 12.5,
        branch: "grupo",
        method: "pix",
      });
    expect(created.status).toBe(201);
    expect(created.body.amount).toBe(12.5);
    expect(created.body.origin).toBe("manual");
    expect(created.body.paymentStatus).toBe("paid");
    expect(isUuidV7(created.body.id)).toBe(true);

    const pending = await request(app)
      .patch(`/api/transactions/${created.body.id}`)
      .set(auth)
      .send({ paymentStatus: "pending" });
    expect(pending.status).toBe(200);
    expect(pending.body.paymentStatus).toBe("pending");

    const patched = await request(app)
      .patch(`/api/transactions/${created.body.id}`)
      .set(auth)
      .send({ description: "Lançamento alterado no teste" });
    expect(patched.status).toBe(200);
    expect(patched.body.description).toBe("Lançamento alterado no teste");
    expect(patched.body.updatedAt).toBeTruthy();
    expect(patched.body.updatedBy).toBeTruthy();
    expect(patched.body.origin).toBe("manual");
  });

  it("lets tesoureiro manage fees", async () => {
    const auth = await tesoureiroAuth();

    const listed = await request(app).get("/api/fees").set(auth);
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body)).toBe(true);

    const created = await request(app)
      .post("/api/fees")
      .set(auth)
      .send({ name: `Taxa integração ${Date.now()}`, amount: 32.5 });
    expect(created.status).toBe(201);
    expect(created.body.amount).toBe(32.5);
    expect(isUuidV7(created.body.id)).toBe(true);

    const patched = await request(app)
      .patch(`/api/fees/${created.body.id}`)
      .set(auth)
      .send({ amount: 40 });
    expect(patched.status).toBe(200);
    expect(patched.body.amount).toBe(40);

    const removed = await request(app).delete(`/api/fees/${created.body.id}`).set(auth);
    expect(removed.status).toBe(204);
  });

  it("imports members and cash-flow rows as integration", async () => {
    const auth = await tesoureiroAuth();
    const donation = await ensureType(auth, "Doação", "income");
    const stamp = Date.now();
    const email = `import.${stamp}@arnofriedrich.org.br`;
    const row = {
      name: `Associado importado ${stamp}`,
      email,
      phone: "(51) 99999-2222",
      branch: "escoteiro",
      role: "jovem",
      monthlyFee: 60,
      joinedAt: "2026-03-01",
      clubeLtc: false,
    };

    const first = await request(app).post("/api/integrations/members").set(auth).send({ rows: [row] });
    expect(first.status).toBe(200);
    expect(first.body.created).toBe(1);
    expect(first.body.skipped).toEqual([]);

    const listed = await request(app).get("/api/members").set(auth);
    const member = listed.body.find((item: { email: string }) => item.email === email);
    expect(member).toBeTruthy();
    expect(member.origin).toBe("integration");
    expect(isUuidV7(member.id)).toBe(true);

    const second = await request(app).post("/api/integrations/members").set(auth).send({ rows: [row] });
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(0);
    expect(second.body.skipped).toHaveLength(1);

    const description = `Doação importada ${stamp}`;
    const txRow = {
      date: "2026-08-14",
      type: "income",
      nature: "variable",
      movementTypeId: donation.id,
      description,
      amount: 150,
      branch: "grupo",
      method: "pix",
      paymentStatus: "paid",
    };
    const createdTx = await request(app)
      .post("/api/integrations/transactions")
      .set(auth)
      .send({ rows: [txRow] });
    expect(createdTx.status).toBe(200);
    expect(createdTx.body.created).toBe(1);

    const txs = await request(app).get("/api/transactions?from=2026-08-01&to=2026-08-31").set(auth);
    const imported = txs.body.find((item: { description: string }) => item.description === description);
    expect(imported).toBeTruthy();
    expect(imported.origin).toBe("integration");
    expect(imported.amount).toBe(150);

    const skippedTx = await request(app)
      .post("/api/integrations/transactions")
      .set(auth)
      .send({ rows: [txRow] });
    expect(skippedTx.body.created).toBe(0);
    expect(skippedTx.body.skipped).toHaveLength(1);
  });

  it("interprets a bank statement into suggested cash-flow rows", async () => {
    const auth = await tesoureiroAuth();
    await ensureType(auth, "Mensalidade", "income");
    await ensureType(auth, "Utilidades", "expense");

    const members = await request(app).get("/api/members").set(auth);
    const ana = members.body.find((item: { name: string }) => item.name === "Ana Souza");
    if (!ana) {
      const created = await request(app)
        .post("/api/members")
        .set(auth)
        .send({
          name: "Ana Souza",
          email: "ana.souza@arnofriedrich.org.br",
          phone: "(51) 99999-1001",
          branch: "lobinho",
          role: "jovem",
          monthlyFee: 55,
          joinedAt: "2023-03-11",
          clubeLtc: false,
          guardians: [{ name: "Helena Souza", relationship: "Mãe", phone: "(51) 99999-1002", email: "" }],
        });
      expect(created.status).toBe(201);
    }

    const res = await request(app)
      .post("/api/integrations/interpret-statement")
      .set(auth)
      .send({
        csv: `Data;Histórico;Valor
14/08/2026;PIX RECEBIDO ANA SOUZA MENSALIDADE;55,00
14/08/2026;PAGAMENTO ENERGISA SEDE;-90,00
14/08/2026;SALDO ANTERIOR;4000,00
`,
      });
    expect(res.status).toBe(200);
    expect(res.body.layout).toBe("bank");
    expect(res.body.rows).toHaveLength(2);
    const fee = res.body.rows.find((row: { amount: number }) => row.amount === 55);
    expect(fee.movementTypeName).toBe("Mensalidade");
    expect(fee.memberName).toBe("Ana Souza");
    expect(fee.type).toBe("income");
    const bill = res.body.rows.find((row: { amount: number }) => row.amount === 90);
    expect(bill.type).toBe("expense");
    expect(bill.movementTypeName).toBe("Utilidades");
  });

  it("reads a Sicredi PDF, matches the associate and marks pending mensalidade as paid", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const auth = await tesoureiroAuth();
    const mensalidade = await ensureType(auth, "Mensalidade", "income");
    await ensureType(auth, "Outros", "both");

    const listedMember = await request(app).get("/api/members").set(auth);
    const existing = listedMember.body.find((item: { guardians?: { name: string }[] }) =>
      item.guardians?.some((guardian) => guardian.name === "Joana Exemplo"),
    );
    let memberId = existing?.id as string | undefined;
    if (!memberId) {
      const created = await request(app)
        .post("/api/members")
        .set(auth)
        .send({
          name: "Lucas Exemplo",
          email: `lucas.exemplo.${Date.now()}@arnofriedrich.org.br`,
          phone: "(51) 99999-3409",
          branch: "escoteiro",
          role: "jovem",
          monthlyFee: 60,
          joinedAt: "2025-03-01",
          clubeLtc: false,
          guardians: [{ name: "Joana Exemplo", relationship: "Mãe", phone: "(51) 99999-3410", email: "" }],
        });
      expect(created.status).toBe(201);
      memberId = created.body.id as string;
    }
    const savedLookup = await request(app).get("/api/members").set(auth);
    const savedMember = savedLookup.body.find((item: { id: string }) => item.id === memberId);
    const guardianId = savedMember.guardians[0].id as string;
    for (const extra of savedLookup.body) {
      if (
        extra.id !== memberId &&
        extra.guardians?.some((guardian: { name: string }) => guardian.name === "Joana Exemplo") &&
        extra.status !== "inactive"
      ) {
        await request(app).patch(`/api/members/${extra.id}`).set(auth).send({ status: "inactive" });
      }
    }
    if (!savedMember.accounts?.some((account: { document?: string }) => String(account.document ?? "").includes("953"))) {
      const account = await request(app)
        .post(`/api/members/${memberId}/accounts`)
        .set(auth)
        .send({
          holderName: "Joana Exemplo",
          holderKind: "parent",
          relationship: "Pai",
          document: "111.111.111-11",
          pixKey: "11111111111",
        });
      expect(account.status).toBe(201);
    }

    const pending = await request(app)
      .post("/api/transactions")
      .set(auth)
      .send({
        date: "2026-01-10",
        type: "income",
        nature: "fixed",
        movementTypeId: mensalidade.id,
        description: "Mensalidade janeiro Lucas",
        amount: 60,
        branch: "escoteiro",
        method: "pix",
        paymentStatus: "pending",
        memberId,
        memberGuardianId: guardianId,
      });
    expect(pending.status).toBe(201);

    const pdf = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../fixtures/extrato-exemplo.pdf"));
    const interpreted = await request(app)
      .post("/api/integrations/interpret-statement")
      .set(auth)
      .send({ pdf: pdf.toString("base64") });
    expect(interpreted.status).toBe(200);
    expect(interpreted.body.rows).toHaveLength(1);
    const row = interpreted.body.rows[0];
    expect(row.amount).toBe(60);
    expect(row.memberId).toBe(memberId);
    expect(row.movementTypeName).toBe("Mensalidade");
    expect(row.paymentStatus).toBe("paid");
    expect(row.hint).toMatch(/paga/i);

    const imported = await request(app)
      .post("/api/integrations/transactions")
      .set(auth)
      .send({
        rows: [
          {
            date: row.date,
            type: row.type,
            nature: row.nature,
            movementTypeId: row.movementTypeId,
            description: row.description,
            amount: row.amount,
            branch: row.branch,
            method: row.method,
            paymentStatus: row.paymentStatus,
            memberId: row.memberId,
            memberGuardianId: row.memberGuardianId,
          },
        ],
      });
    expect(imported.status).toBe(200);
    expect(imported.body.paid).toBe(1);
    expect(imported.body.created).toBe(0);

    const listed = await request(app).get("/api/transactions?from=2026-01-01&to=2026-01-31").set(auth);
    const saved = listed.body.find((item: { id: string }) => item.id === pending.body.id);
    expect(saved.paymentStatus).toBe("paid");
  });

  it("keeps admin-only pages away from the tesoureiro", async () => {
    const auth = await tesoureiroAuth();
    const res = await request(app).get("/api/users").set(auth);
    expect(res.status).toBe(403);
  });

  it("lets the admin read dashboard, users and projects", async () => {
    const token = await login(TEST_ADMIN_USER, TEST_PASSWORD);
    const auth = { Authorization: `Bearer ${token}` };

    const me = await request(app).get("/api/auth/me").set(auth);
    expect(me.body.role).toBe("admin");

    const dashboard = await request(app).get("/api/dashboard?year=2026&month=8").set(auth);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.byBranch.length).toBeGreaterThan(0);

    const users = await request(app).get("/api/users").set(auth);
    expect(users.status).toBe(200);
    expect(users.body.some((u: { username: string }) => u.username === "admin")).toBe(true);
    expect(isUuidV7(users.body[0].id)).toBe(true);

    const projects = await request(app).get("/api/projects?year=2026&branch=escoteiro").set(auth);
    expect(projects.status).toBe(200);

    const report = await request(app)
      .post("/api/reports/custom")
      .set(auth)
      .send({
        from: "2026-08-01",
        to: "2026-08-31",
        branches: [],
        types: [],
        natures: [],
        movementTypeIds: [],
        groupBy: "movementType",
      });
    expect(report.status).toBe(200);
    expect(report.body.ledger).toBeDefined();
  });
});
