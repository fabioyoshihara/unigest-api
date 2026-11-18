import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não definida nas variáveis de ambiente!");
}

const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no Pool do PostgreSQL:", err);
});

export const db = drizzle({
  client: pool,
  logger:
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENVIRONMENT === "development",
});