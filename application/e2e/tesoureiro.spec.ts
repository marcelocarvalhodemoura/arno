import { expect, test } from "@playwright/test";
import {
  PASSWORD,
  TREASURER_USER,
  ensureCatalog,
  expectPager,
  login,
  selectOptionByText,
  successToast,
} from "./helpers";

test.describe("tesoureiro", () => {
  test.beforeAll(async () => {
    await ensureCatalog();
  });

  test("logs in and paginates cash flow", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
    await expect(page).toHaveURL(/\/fluxo/);
    await expect(page.getByRole("heading", { name: "Entradas e saídas" })).toBeVisible();
    await expect(page.locator(".recharts-wrapper")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Alterar lançamento" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Excluir lançamento" }).first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText(/Manual|Integração/);
    await expect(page.getByText(/Lançado por/).first()).toBeVisible();
    await page.getByRole("button", { name: "Alterar lançamento" }).first().click();
    await expect(page.getByRole("heading", { name: "Alterar lançamento" })).toBeVisible();
    await page.getByLabel("Descrição").fill("Mensalidade ajustada no e2e");
    await page.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(page.getByRole("heading", { name: "Alterar lançamento" })).toHaveCount(0);
    await expect(page.locator(".fetch-overlay")).toHaveCount(0);
    await expect(page.getByText("Alterado por").first()).toBeVisible();
    await expect(page.getByText("Mensalidade ajustada no e2e").first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText(/Manual|Integração/);
    await expect(page.getByLabel("Buscar")).toBeVisible();
    await page.getByLabel("Entrada / saída").selectOption("income");
    await expect(page.locator(".listing-results.is-filtering")).toBeVisible();
    await expectPager(page);
    await expect(page.getByText(/Mostrando /)).toBeVisible();
  });

  test("filters members and movement types", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
    await page.getByRole("link", { name: "Associados" }).click();
    await expect(page.getByRole("heading", { name: "Cadastro e responsáveis" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Responsáveis" })).toBeVisible();
    await expect(page.getByText("Helena Souza (Mãe)").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Alterar associado" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Contas de pagamento" }).first()).toBeVisible();
    await expect(page.locator("tr").filter({ hasText: "Helena Souza" }).locator(".tx-stamp__origin")).toHaveText(
      "Manual",
    );
    await page.getByPlaceholder("Nome, e-mail, telefone, responsável…").fill("ana");
    await expectPager(page);

    await page
      .locator("tr")
      .filter({ hasText: "Ana Souza" })
      .getByRole("button", { name: "Alterar associado" })
      .click();
    await expect(page.getByRole("heading", { name: "Alterar associado" })).toBeVisible();
    const guardianName = page.getByLabel("Nome do responsável").first();
    if (!(await guardianName.inputValue()).match(/Helena/i)) {
      await guardianName.fill("Helena Souza");
      await page.getByLabel("Parentesco").first().selectOption("Mãe");
    } else {
      await expect(guardianName).toHaveValue(/Helena/);
    }
    await page.getByLabel("Associado do Clube LTC").selectOption("true");
    await page.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(successToast(page, "Associado alterado com sucesso")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alterar associado" })).toHaveCount(0);
    await expect(page.getByText(/R\$\s*75,00/)).toBeVisible();
    await expect(page.getByText("Alterado por").first()).toBeVisible();

    await page.getByRole("link", { name: "Tipos de movimentação" }).click();
    await expect(page.getByRole("heading", { name: "Tipos de movimentação" })).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText(/Manual|Integração/);
    await page.getByLabel("Direção").selectOption("income");
    await expectPager(page);
  });

  test("reconciles a pending cash flow launch", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
    await expect(page.locator("tr.is-paid").first()).toBeVisible();
    await page.getByRole("button", { name: "Lançamento manual" }).click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Vencimento").fill("2026-08-05");
    await modal.getByLabel("Situação").selectOption("pending");
    await modal.getByLabel("Tipo de movimentação").selectOption({ index: 1 });
    await selectOptionByText(modal.getByLabel("Associado (opcional)"), /Ana Souza/);
    await expect(modal.getByLabel("Responsável")).toBeVisible();
    await selectOptionByText(modal.getByLabel("Responsável"), /Helena/);
    const description = `Conciliação e2e ${Date.now()}`;
    await modal.getByLabel("Descrição").fill(description);
    await modal.getByLabel("Valor (R$)").fill("1500");
    await modal.getByRole("button", { name: "Lançar" }).click();
    await expect(successToast(page, "Lançamento cadastrado com sucesso")).toBeVisible();
    await page.getByLabel("Buscar").fill(description);
    await expect(page.locator("tr.is-overdue").filter({ hasText: description })).toBeVisible();
    await page.getByRole("button", { name: "Marcar como pago" }).click();
    await expect(successToast(page, "Lançamento conciliado com sucesso")).toBeVisible();
    await expect(page.locator("tr.is-paid").filter({ hasText: description })).toBeVisible();
  });

  test("registers a fee and shows a success toast", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
    await page.getByRole("link", { name: "Taxas" }).click();
    await expect(page.getByRole("heading", { name: "Taxas" })).toBeVisible();
    await page.getByRole("button", { name: "Nova taxa" }).click();
    const feeName = `Taxa e2e ${Date.now()}`;
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Nome").fill(feeName);
    await modal.getByLabel("Valor").fill("2500");
    await modal.getByRole("button", { name: "Salvar" }).click();
    await expect(successToast(page, "Taxa cadastrada com sucesso")).toBeVisible();
    await page.getByPlaceholder("Nome ou valor…").fill(feeName);
    await expect(page.getByText(feeName).first()).toBeVisible();
  });

  test("imports associates from a CSV file", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
    await page.getByRole("link", { name: "Integração" }).click();
    await expect(page.getByRole("heading", { name: "Extratos e associados" })).toBeVisible();
    await page.getByRole("button", { name: "Sicredi ao vivo" }).click();
    await expect(page.getByRole("heading", { name: "Lançamentos em tempo real" })).toBeVisible();
    await page.getByRole("button", { name: "Associados" }).click();
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
    await expect(page.getByText(name).first()).toBeVisible();
    await page.getByRole("button", { name: "Importar 1 associado" }).click();
    await expect(successToast(page, "associado cadastrado")).toBeVisible();
    await page.getByRole("link", { name: "Associados" }).click();
    await page.getByPlaceholder("Nome, e-mail, telefone, responsável…").fill(`e2e.import.${stamp}`);
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Integração");
  });

  test("imports associates from an xlsx file", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
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
    await expect(page.getByText(name).first()).toBeVisible();
    await page.getByRole("button", { name: "Importar 1 associado" }).click();
    await expect(successToast(page, "associado cadastrado")).toBeVisible();
    await page.getByRole("link", { name: "Associados" }).click();
    await page.getByPlaceholder("Nome, e-mail, telefone, responsável…").fill(`e2e.xlsx.${stamp}`);
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Integração");
  });

  test("imports a cash flow statement from CSV", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
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
    await expect(page.locator("input.preview-input").first()).toHaveValue(description);
    await expect(page.locator(".fetch-overlay")).toHaveCount(0);
    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();
    await expect(successToast(page, /lançamento importado|mensalidade marcada/)).toBeVisible();
    await page.getByRole("link", { name: "Fluxo de caixa" }).click();
    await page.getByLabel("Buscar").fill(description);
    await expect(page.getByText(description).first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Integração");
  });

  test("interprets a bank CSV and imports the suggested launch", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
    await page.getByRole("link", { name: "Integração" }).click();
    await page.getByRole("button", { name: "Extrato" }).click();
    const stamp = Date.now();
    const history = `PIX RECEBIDO ANA SOUZA MENSALIDADE ${stamp}`;
    await page.locator('input[type="file"]').setInputFiles({
      name: "banco.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(`Data;Histórico;Valor\n14/11/2026;${history};89,50\n`, "utf-8"),
    });
    await expect(page.getByText("Extrato do banco")).toBeVisible();
    await expect(page.getByText("Ana Souza").first()).toBeVisible();
    await expect(page.locator(".fetch-overlay")).toHaveCount(0);
    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();
    await expect(
      successToast(page, /lançamento importado|mensalidade marcada|identificar o tipo|já estava no caixa|já existia/),
    ).toBeVisible();
    const identifyHeading = page.getByRole("heading", { name: /Identificar lançamento/ });
    await identifyHeading.waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
    if (await identifyHeading.isVisible()) {
      const modal = page.getByRole("dialog");
      await selectOptionByText(modal.getByLabel("Tipo de movimentação"), /Mensalidade|Doação/);
      await page.getByRole("button", { name: "Identificar" }).click({ force: true });
      await expect(successToast(page, /Lançamento identificado|Tipo definido/)).toBeVisible();
    }
    await page.getByRole("link", { name: "Fluxo de caixa" }).click();
    await expect(page.getByRole("heading", { name: "Entradas e saídas" })).toBeVisible();
    await page.getByLabel("Buscar").fill("Ana Souza");
    await expect(page.getByText("Ana Souza").first()).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText(/Manual|Integração/);
  });

  test("imports a Sicredi PDF statement", async ({ page }) => {
    await login(page, TREASURER_USER, PASSWORD);
    await page.getByRole("link", { name: "Integração" }).click();
    await page.getByRole("button", { name: "Extrato" }).click();
    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/extrato-exemplo.pdf");
    await expect(page.getByText("Extrato do banco")).toBeVisible();
    await expect(page.getByText(/JOANA EXEMPLO/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Importar 1 lançamento/ })).toBeVisible();
    await page.getByRole("button", { name: /Importar 1 lançamento/ }).click();
    await expect(
      successToast(page, /identificar o tipo|lançamento importado|já estava no caixa|já existia/),
    ).toBeVisible();
    const identifyHeading = page.getByRole("heading", { name: /Identificar lançamento/ });
    await identifyHeading.waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
    if (await identifyHeading.isVisible()) {
      const modal = page.getByRole("dialog");
      await selectOptionByText(modal.getByLabel("Tipo de movimentação"), /Doação/);
      await page.getByRole("button", { name: "Identificar" }).click({ force: true });
      await expect(successToast(page, /Lançamento identificado|Tipo definido/)).toBeVisible();
    }
  });
});
