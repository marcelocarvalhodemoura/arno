import { expect, test } from "@playwright/test";
import { ensureCatalog, expectPager, login } from "./helpers";

test.describe("administrador", () => {
  test.beforeAll(async () => {
    await ensureCatalog();
  });

  test("sees dashboard listing, users, projects and fiscal report", async ({ page }) => {
    await login(page, "admin", "arno1991");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Indicadores da tesouraria" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Totais por ramo" })).toBeVisible();
    await expectPager(page);

    await page.getByRole("link", { name: "Usuários" }).click();
    await expect(page.getByRole("heading", { name: "Controle de acesso" })).toBeVisible();
    await expect(page.locator(".tx-stamp__origin").first()).toHaveText("Manual");
    await expect(page.getByText(/Lançado por/).first()).toBeVisible();
    await page.getByLabel("Papel").selectOption("admin");
    await expect(page.getByRole("button", { name: /Desativar usuário|Reativar usuário/ }).first()).toBeVisible();
    await expectPager(page);

    await page.getByRole("link", { name: "Projetos financeiros" }).click();
    await expect(page.getByRole("heading", { name: "Orçamento de cada ramo" })).toBeVisible();
    await expect(page.getByText(/Nenhum projeto para/)).toBeVisible();

    await page.getByRole("link", { name: "Relatório fiscal" }).click();
    await expect(page.getByRole("heading", { name: "Relatório de movimentações" })).toBeVisible();
    await page.getByRole("button", { name: "Gerar relatório" }).click();
    await expect(page.getByRole("heading", { name: "Livro-caixa" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder("Descrição, associado, tipo…")).toBeVisible();
    await expect(page.getByLabel("Por página").last()).toBeVisible();
  });
});
