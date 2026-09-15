import { expect, test } from "@playwright/test";
import { ensureCatalog, expectPager, login } from "./helpers";

test.describe("tesoureiro", () => {
  test.beforeAll(async () => {
    await ensureCatalog();
  });

  test("logs in and paginates cash flow", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await expect(page).toHaveURL(/\/fluxo/);
    await expect(page.getByRole("heading", { name: "Entradas e saídas" })).toBeVisible();
    await expect(page.locator(".recharts-wrapper")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Alterar lançamento" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Excluir lançamento" }).first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Manual");
    await expect(page.getByText(/Lançado por/).first()).toBeVisible();
    await page.getByRole("button", { name: "Alterar lançamento" }).first().click();
    await expect(page.getByRole("heading", { name: "Alterar lançamento" })).toBeVisible();
    await page.getByLabel("Descrição").fill("Mensalidade ajustada no e2e");
    await page.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(page.getByRole("heading", { name: "Alterar lançamento" })).toHaveCount(0);
    await expect(page.locator(".fetch-overlay")).toHaveCount(0);
    await expect(page.getByText("Alterado por").first()).toBeVisible();
    await expect(page.getByText("Mensalidade ajustada no e2e").first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Manual");
    await expect(page.getByLabel("Buscar")).toBeVisible();
    await page.getByLabel("Entrada / saída").selectOption("income");
    await expect(page.locator(".fetch-overlay")).toBeVisible();
    await expect(page.locator(".fetch-overlay")).toContainText("Filtrando");
    await expectPager(page);
    await expect(page.getByText(/Mostrando /)).toBeVisible();
  });

  test("filters members and movement types", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await page.getByRole("link", { name: "Associados" }).click();
    await expect(page.getByRole("heading", { name: "Cadastro e responsáveis" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Responsáveis" })).toBeVisible();
    await expect(page.getByText("Helena Souza (Mãe)").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Alterar associado" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Contas de pagamento" }).first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Manual");
    await page.getByPlaceholder("Nome, e-mail, telefone, responsável…").fill("ana");
    await expectPager(page);

    await page.getByRole("button", { name: "Alterar associado" }).first().click();
    await expect(page.getByRole("heading", { name: "Alterar associado" })).toBeVisible();
    await expect(page.getByLabel("Nome do responsável")).toHaveValue(/Helena/);
    await page.getByLabel("Mensalidade (R$)").fill("7000");
    await page.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(page.getByRole("status")).toContainText("Associado alterado com sucesso");
    await expect(page.getByRole("heading", { name: "Alterar associado" })).toHaveCount(0);
    await expect(page.getByText(/R\$\s*70,00/)).toBeVisible();
    await expect(page.getByText("Alterado por").first()).toBeVisible();

    await page.getByRole("link", { name: "Tipos de movimentação" }).click();
    await expect(page.getByRole("heading", { name: "Tipos de movimentação" })).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Manual");
    await page.getByLabel("Direção").selectOption("income");
    await expectPager(page);
  });

  test("reconciles a pending cash flow launch", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await expect(page.locator("tr.is-paid").first()).toBeVisible();
    await page.getByRole("button", { name: "Lançamento manual" }).click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Vencimento").fill("2026-08-05");
    await modal.getByLabel("Situação").selectOption("pending");
    await modal.getByLabel("Tipo de movimentação").selectOption({ index: 1 });
    await modal.getByLabel("Associado (opcional)").selectOption({ label: /Ana Souza/ });
    await expect(modal.getByLabel("Responsável")).toBeVisible();
    await modal.getByLabel("Responsável").selectOption({ label: /Helena/ });
    await modal.getByLabel("Descrição").fill("Conciliação e2e");
    await modal.getByLabel("Valor (R$)").fill("1500");
    await modal.getByRole("button", { name: "Lançar" }).click();
    await expect(page.getByRole("status")).toContainText("Lançamento cadastrado com sucesso");
    await page.getByLabel("Buscar").fill("Conciliação e2e");
    await expect(page.locator("tr.is-overdue").filter({ hasText: "Conciliação e2e" })).toBeVisible();
    await page.getByRole("button", { name: "Marcar como pago" }).click();
    await expect(page.getByRole("status")).toContainText("Lançamento conciliado com sucesso");
    await expect(page.locator("tr.is-paid").filter({ hasText: "Conciliação e2e" })).toBeVisible();
  });

  test("registers a fee and shows a success toast", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await page.getByRole("link", { name: "Taxas" }).click();
    await expect(page.getByRole("heading", { name: "Taxas" })).toBeVisible();
    await page.getByRole("button", { name: "Nova taxa" }).click();
    await page.getByLabel("Nome").fill("Taxa e2e");
    await page.getByLabel("Valor").fill("2500");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("status")).toContainText("Taxa cadastrada com sucesso");
    await expect(page.getByText("Taxa e2e").first()).toBeVisible();
  });

  test("imports associates from a CSV file", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await page.getByRole("link", { name: "Integração" }).click();
    await expect(page.getByRole("heading", { name: "Extratos e associados" })).toBeVisible();
    const stamp = Date.now();
    const name = `Associado E2E ${stamp}`;
    await page.locator('input[type="file"]').setInputFiles({
      name: "associados.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `nome;email;telefone;ramo;papel;mensalidade;ingresso;clube_ltc\n${name};e2e.import.${stamp}@arnofriedrich.org.br;(51) 98888-1111;escoteiro;jovem;60,00;01/03/2026;não\n`,
        "utf-8",
      ),
    });
    await expect(page.getByText(name)).toBeVisible();
    await page.getByRole("button", { name: "Importar 1 associado" }).click();
    await expect(page.getByRole("status")).toContainText("associado cadastrado");
    await page.getByRole("link", { name: "Associados" }).click();
    await page.getByPlaceholder("Nome, e-mail, telefone, responsável…").fill(`e2e.import.${stamp}`);
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Integração");
  });

  test("imports associates from an xlsx file", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await page.getByRole("link", { name: "Integração" }).click();
    const stamp = Date.now();
    const name = `Associado XLSX ${stamp}`;
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["nome", "email", "telefone", "ramo", "papel", "mensalidade", "ingresso", "clube_ltc"],
        [
          name,
          `e2e.xlsx.${stamp}@arnofriedrich.org.br`,
          "(51) 98888-2222",
          "escoteiro",
          "jovem",
          60,
          "01/03/2026",
          "não",
        ],
      ]),
      "Associados",
    );
    const buffer = Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "array" }));
    await page.locator('input[type="file"]').setInputFiles({
      name: "associados.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
    await expect(page.getByText(name)).toBeVisible();
    await page.getByRole("button", { name: "Importar 1 associado" }).click();
    await expect(page.getByRole("status")).toContainText("associado cadastrado");
    await page.getByRole("link", { name: "Associados" }).click();
    await page.getByPlaceholder("Nome, e-mail, telefone, responsável…").fill(`e2e.xlsx.${stamp}`);
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Integração");
  });

  test("imports a cash flow statement from CSV", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await page.getByRole("link", { name: "Integração" }).click();
    await page.getByRole("button", { name: "Extrato" }).click();
    const stamp = Date.now();
    const description = `Doação e2e ${stamp}`;
    await page.locator('input[type="file"]').setInputFiles({
      name: "extrato.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `data;tipo;natureza;tipo_movimentacao;descricao;valor;ramo;meio;situacao;associado\n14/08/2026;entrada;variável;Doação;${description};150,00;grupo;pix;pago;\n`,
        "utf-8",
      ),
    });
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.locator(".fetch-overlay")).toHaveCount(0);
    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();
    await expect(page.getByRole("status")).toContainText("lançamento importado");
    await page.getByRole("link", { name: "Fluxo de caixa" }).click();
    await page.getByLabel("Buscar").fill(description);
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Integração");
  });

  test("interprets a bank CSV and imports the suggested launch", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await page.getByRole("link", { name: "Integração" }).click();
    await page.getByRole("button", { name: "Extrato" }).click();
    const stamp = Date.now();
    const history = `PIX RECEBIDO ANA SOUZA MENSALIDADE ${stamp}`;
    await page.locator('input[type="file"]').setInputFiles({
      name: "banco.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(`Data;Histórico;Valor\n14/08/2026;${history};55,00\n`, "utf-8"),
    });
    await expect(page.getByText("Extrato do banco")).toBeVisible();
    await expect(page.getByText("Ana Souza").first()).toBeVisible();
    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();
    await expect(page.getByRole("status")).toContainText("lançamento importado");
    await page.getByRole("link", { name: "Fluxo de caixa" }).click();
    await page.getByLabel("Buscar").fill(String(stamp));
    await expect(page.getByText(history)).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Integração");
  });

  test("imports a Sicredi PDF statement", async ({ page }) => {
    await login(page, "tesouraria", "arno1991");
    await page.getByRole("link", { name: "Integração" }).click();
    await page.getByRole("button", { name: "Extrato" }).click();
    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/sicredi_1781979670.pdf");
    await expect(page.getByText("Extrato do banco")).toBeVisible();
    await expect(page.getByText(/MARCUS CHRISTIMANN/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Importar 1 lançamento/ })).toBeVisible();
    await page.getByRole("button", { name: /Importar 1 lançamento/ }).click();
    await expect(page.getByRole("status")).toContainText(/identificar o tipo|lançamento importado|já estava no caixa|já existia/);
    await expect(page.getByRole("heading", { name: /Identificar lançamento/ })).toBeVisible();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Tipo de movimentação").selectOption({ label: /Doação/ });
    await modal.getByRole("button", { name: "Identificar" }).click();
    await expect(page.getByRole("heading", { name: /Identificar lançamento/ })).toHaveCount(0);
    await expect(page.getByText(/MARCUS CHRISTIMANN/)).toBeVisible();
    await expect(page.getByText("Doação").first()).toBeVisible();
  });
});
