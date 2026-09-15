import { expect, request as playwrightRequest, type APIRequestContext, type Page } from "@playwright/test";

export async function login(page: Page, user: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(user);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function expectPager(page: Page) {
  await expect(page.locator(".fetch-overlay")).toHaveCount(0);
  await expect(page.getByLabel("Por página").first()).toBeVisible();
  await expect(page.getByText(/Página \d+ de \d+/).first()).toBeVisible();
  await page.getByLabel("Por página").first().selectOption("15");
  await expect(page.getByLabel("Por página").first()).toHaveValue("15");
}

async function authHeaders(api: APIRequestContext) {
  const loginRes = await api.post("/api/auth/login", {
    data: { user: "tesouraria", password: "arno1991" },
  });
  const body = (await loginRes.json()) as { token: string };
  return { Authorization: `Bearer ${body.token}` };
}

async function ensureType(
  api: APIRequestContext,
  headers: Record<string, string>,
  name: string,
  direction: "income" | "expense" | "both",
) {
  const listed = await api.get("/api/movement-types", { headers });
  const types = (await listed.json()) as { id: string; name: string }[];
  const existing = types.find((item) => item.name === name);
  if (existing) return existing;
  const created = await api.post("/api/movement-types", {
    headers,
    data: { name, direction, description: name },
  });
  return (await created.json()) as { id: string; name: string };
}

export async function ensureCatalog() {
  const api = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:5174" });
  try {
    const headers = await authHeaders(api);
    const donation = await ensureType(api, headers, "Doação", "income");
    await ensureType(api, headers, "Mensalidade", "income");
    await ensureType(api, headers, "Utilidades", "expense");
    await ensureType(api, headers, "Outros", "both");
    await ensureType(api, headers, "A identificar", "both");

    const membersRes = await api.get("/api/members", { headers });
    const members = (await membersRes.json()) as {
      id: string;
      name: string;
      guardians?: { name: string }[];
    }[];
    const ana = members.find((member) => member.name === "Ana Souza");
    if (!ana) {
      await api.post("/api/members", {
        headers,
        data: {
          name: "Ana Souza",
          email: "ana.souza@arnofriedrich.org.br",
          phone: "(51) 99999-1001",
          branch: "lobinho",
          role: "jovem",
          monthlyFee: 55,
          joinedAt: "2023-03-11",
          clubeLtc: false,
          guardians: [{ name: "Helena Souza", relationship: "Mãe", phone: "(51) 99999-1002" }],
        },
      });
    } else if (!ana.guardians?.length) {
      await api.patch(`/api/members/${ana.id}`, {
        headers,
        data: {
          guardians: [{ name: "Helena Souza", relationship: "Mãe", phone: "(51) 99999-1002" }],
        },
      });
    }

    const txsRes = await api.get("/api/transactions?from=2026-08-01&to=2026-08-31", { headers });
    const txs = (await txsRes.json()) as { id: string }[];
    if (txs.length === 0) {
      await api.post("/api/transactions", {
        headers,
        data: {
          date: "2026-08-10",
          type: "income",
          nature: "variable",
          movementTypeId: donation.id,
          description: "Doação inicial e2e",
          amount: 80,
          branch: "grupo",
          method: "pix",
        },
      });
    }
  } finally {
    await api.dispose();
  }
}
