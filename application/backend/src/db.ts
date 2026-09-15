import pg from "pg";
import "./env.js";

const { Pool, types } = pg;

types.setTypeParser(1082, (value) => value);
types.setTypeParser(1114, (value) => value);
types.setTypeParser(1184, (value) => value);
types.setTypeParser(1700, (value) => Number.parseFloat(value));

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não definida. Copie application/.env.example para application/.env e preencha as credenciais do Postgres.",
  );
}

export const DATABASE_URL = process.env.DATABASE_URL;

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
