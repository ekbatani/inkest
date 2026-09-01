/**
 * SQLite to PostgreSQL Migration Utility for Inkest
 *
 * Reads records from local SQLite (data/local.db) and inserts them into PostgreSQL.
 * Usage:
 *   DATABASE_URL="postgres://user:password@localhost:5432/inknest" bun scripts/migrate-sqlite-to-postgres.mjs
 */

import fs from "node:fs";
import { Database } from "bun:sqlite";
import postgres from "postgres";

const sqlitePath = (process.env.SQLITE_DATABASE_URL ?? "data/local.db").replace(/^file:\/\//, "").replace(/^file:/, "");
const postgresUrl = process.env.DATABASE_URL;

if (!postgresUrl || !postgresUrl.startsWith("postgres")) {
  console.error("Please provide a valid PostgreSQL connection string in DATABASE_URL.");
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.log(`SQLite database file not found at ${sqlitePath}. Nothing to migrate.`);
  process.exit(0);
}

console.log(`Connecting to SQLite: ${sqlitePath}`);
console.log(`Target PostgreSQL: ${postgresUrl.replace(/:[^:@]+@/, ":***@")}`);

const sqliteClient = new Database(sqlitePath);
const pgClient = postgres(postgresUrl, { max: 1 });

const TABLES = [
  "users",
  "workspaces",
  "notes",
  "tags",
  "note_tags",
  "tasks",
  "notifications",
  "attachments",
  "note_versions",
  "ai_events",
  "payments",
  "credit_ledger",
];

async function migrate() {
  console.log("Starting SQLite -> PostgreSQL migration...");

  for (const table of TABLES) {
    try {
      const rows = sqliteClient.prepare(`SELECT * FROM "${table}"`).all();
      console.log(`Extracted ${rows.length} rows from table '${table}'.`);
      if (rows.length > 0) {
        await pgClient`INSERT INTO ${pgClient(table)} ${pgClient(rows)} ON CONFLICT DO NOTHING`;
        console.log(`Inserted ${rows.length} rows into PostgreSQL table '${table}'.`);
      }
    } catch (err) {
      console.warn(`Table '${table}' not present or migrated with note:`, err.message);
    }
  }

  console.log("Migration check completed.");
}

try {
  await migrate();
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  sqliteClient.close();
  await pgClient.end();
}

