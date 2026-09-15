import pg from "pg";

const { Pool, types } = pg;

types.setTypeParser(1082, (value) => value);
types.setTypeParser(1114, (value) => value);
types.setTypeParser(1184, (value) => value);
types.setTypeParser(1700, (value) => Number.parseFloat(value));

export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://arno:arno1991@127.0.0.1:5434/tesouraria";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
});

export async function waitForDb(retries = 30): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      console.log(`Aguardando PostgreSQL (${i + 1}/${retries})…`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Não foi possível conectar ao PostgreSQL");
}
