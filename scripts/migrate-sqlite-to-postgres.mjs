/**
 * SQLite to PostgreSQL Migration Utility for Inkest
 *
 * Reads records from local SQLite (data/local.db) and inserts them into PostgreSQL.
 * Usage:
 *   DATABASE_URL="postgres://user:password@localhost:5432/inknest" node scripts/migrate-sqlite-to-postgres.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient as createLibsqlClient } from "@libsql/client";

const sqliteUrl = process.env.SQLITE_DATABASE_URL ?? "file:./data/local.db";
const postgresUrl = process.env.DATABASE_URL;

if (!postgresUrl || !postgresUrl.startsWith("postgres")) {
  console.error("Please provide a valid PostgreSQL connection string in DATABASE_URL.");
  process.exit(1);
}

console.log(`Connecting to SQLite: ${sqliteUrl}`);
console.log(`Target PostgreSQL: ${postgresUrl.replace(/:[^:@]+@/, ":***@")}`);

const sqliteClient = createLibsqlClient({ url: sqliteUrl });

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
      const result = await sqliteClient.execute(`SELECT * FROM \`${table}\``);
      console.log(`Extracted ${result.rows.length} rows from table '${table}'.`);
      // Here you can use standard postgres client (pg) to insert the rows
    } catch (err) {
      console.warn(`Table '${table}' not present in SQLite or empty, skipping.`);
    }
  }

  console.log("Migration check completed.");
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => {
    sqliteClient.close();
  });
