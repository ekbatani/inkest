import { createClient } from "@libsql/client";
import { readMigrationFiles } from "drizzle-orm/migrator";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
const MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATIONS_FOLDER = "./drizzle";

const client = createClient({ url, authToken });

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

function isAlreadyAppliedError(error) {
  const messages = [];
  let current = error;

  while (current) {
    if (current.message) {
      messages.push(current.message);
    }
    current = current.cause;
  }

  const message = messages.join("\n");
  return /already exists|duplicate column name/i.test(message);
}

async function applyStatement(sql) {
  try {
    await client.execute(sql);
  } catch (error) {
    if (isAlreadyAppliedError(error)) {
      console.warn(`Skipping already-applied statement: ${sql.slice(0, 80)}...`);
      return;
    }
    throw error;
  }
}

async function runMigrations() {
  await ensureMigrationsTable();

  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  const lastCreatedAt = await getLastMigrationCreatedAt();

  for (const migration of migrations) {
    if (lastCreatedAt != null && lastCreatedAt >= migration.folderMillis) {
      continue;
    }

    for (const statement of migration.sql) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      await applyStatement(trimmed);
    }

    await client.execute({
      sql: `INSERT INTO \`${MIGRATIONS_TABLE}\` ("hash", "created_at") VALUES (?, ?)`,
      args: [migration.hash, migration.folderMillis],
    });

    console.log(`Applied migration ${migration.hash}.`);
  }
}

try {
  await runMigrations();
  console.log("Migrations applied.");
} finally {
  client.close();
}
