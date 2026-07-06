import fs from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
const MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATIONS_FOLDER = "./drizzle";
const REPAIRABLE_MIGRATION_TAG = "0003_absurd_morlun";

const client = createClient({ url, authToken });
const db = drizzle(client);

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )
  `);
}

async function getLastMigrationCreatedAt() {
  const result = await client.execute(
    `SELECT created_at FROM \`${MIGRATIONS_TABLE}\` ORDER BY created_at DESC LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) return null;

  const value = row.created_at ?? row[0];
  return value == null ? null : Number(value);
}

async function tableExists(tableName) {
  const result = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [tableName],
  });
  return result.rows.length > 0;
}

async function indexExists(indexName) {
  const result = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ? LIMIT 1",
    args: [indexName],
  });
  return result.rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const result = await client.execute(`PRAGMA table_info(\`${tableName}\`)`);
  return result.rows.some((row) => (row.name ?? row[1]) === columnName);
}

async function schemaAlreadyIncludesGoogleCalendarMigration() {
  const requiredTables = [
    "google_calendar_connections",
    "google_calendar_events",
  ];
  const requiredIndexes = [
    "google_calendar_connections_user_id_unique",
    "google_calendar_events_external_key_unique",
    "users_telegram_chat_id_unique",
  ];
  const requiredColumns = [
    ["users", "settings"],
    ["notes", "sort_order"],
    ["tasks", "due_reminder_sent_at"],
    ["users", "telegram_chat_id"],
    ["users", "telegram_link_code"],
    ["users", "telegram_link_code_expires_at"],
  ];

  for (const tableName of requiredTables) {
    if (!(await tableExists(tableName))) return false;
  }

  for (const indexName of requiredIndexes) {
    if (!(await indexExists(indexName))) return false;
  }

  for (const [tableName, columnName] of requiredColumns) {
    if (!(await columnExists(tableName, columnName))) return false;
  }

  return true;
}

async function repairMissingMigrationRecord() {
  await ensureMigrationsTable();

  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  const journal = JSON.parse(
    fs.readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
  );
  const repairableMigrationIndex = journal.entries.findIndex(
    (entry) => entry.tag === REPAIRABLE_MIGRATION_TAG,
  );

  if (repairableMigrationIndex === -1) {
    return;
  }

  const repairableMigration = migrations[repairableMigrationIndex];
  const lastCreatedAt = await getLastMigrationCreatedAt();

  if (
    lastCreatedAt != null &&
    lastCreatedAt >= repairableMigration.folderMillis
  ) {
    return;
  }

  if (!(await schemaAlreadyIncludesGoogleCalendarMigration())) {
    return;
  }

  await client.execute({
    sql: `INSERT INTO \`${MIGRATIONS_TABLE}\` ("hash", "created_at") VALUES (?, ?)`,
    args: [repairableMigration.hash, repairableMigration.folderMillis],
  });

  console.log(
    `Stamped ${REPAIRABLE_MIGRATION_TAG} in ${MIGRATIONS_TABLE} because its schema already exists.`,
  );
}

await repairMissingMigrationRecord();
await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
console.log("Migrations applied.");
client.close();
