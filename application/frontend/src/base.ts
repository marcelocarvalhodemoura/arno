/** Prefixo público da tesouraria. Em produção (Vite `--base /finance/`) vira `/finance`. No dev fica vazio. */
export const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");

export const routerBasename = appBase || "/";
