
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./src/database/client.ts";

async function testarMigration() {
  try {
    console.log("Iniciando migrations...");

    await migrate(db, {
      migrationsFolder: "./drizzle",
    });

    console.log("Migrations executadas com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("ERRO COMPLETO DA MIGRATION:");
    console.error(error);
    process.exit(1);
  }
}

testarMigration();
