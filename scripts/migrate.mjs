import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url =
  process.env.DATABASE_URL ??
  "postgres://inknest:inknest_secret@localhost:5432/inknest";

const sql = postgres(url, { max: 1, connect_timeout: 10 });

async function runMigrations() {
  console.log("Connecting to PostgreSQL to ensure schema...");
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  } catch (err) {
    console.warn("pgvector extension check:", err.message);
  }

  const migrationsFolder = path.resolve(process.cwd(), "./drizzle");
  if (fs.existsSync(migrationsFolder)) {
    try {
      const db = drizzle(sql);
      await migrate(db, { migrationsFolder });
      console.log("Drizzle migrations applied.");
    } catch (err) {
      console.warn("Drizzle migration step note:", err.message);
    }
  }
}

try {
  await runMigrations();
  console.log("Database initialization completed.");
} catch (err) {
  console.error("Migration error:", err);
} finally {
  await sql.end({ timeout: 5 });
}

