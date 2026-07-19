import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { createClient } from "@libsql/client";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function usage() {
  console.error("Usage: bun scripts/backup-local.mjs --output <empty-directory> [--database <file:...>] [--storage <directory>]");
  process.exit(1);
}

function localDatabasePath(url) {
  if (!url.startsWith("file:")) {
    throw new Error("Local backups require a file: DATABASE_URL. Use your Turso provider's snapshot/export procedure for remote databases.");
  }
  return resolve(url.slice("file:".length));
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function hashFile(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function listFiles(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const path = resolve(root, entry.name);
      if (entry.isDirectory()) files.push(...await listFiles(path));
      else if (entry.isFile()) files.push(path);
    }
    return files;
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

const output = argument("--output");
if (!output) usage();

const databaseUrl = argument("--database") ?? process.env.DATABASE_URL ?? "file:./data/local.db";
const database = localDatabasePath(databaseUrl);
const storage = resolve(argument("--storage") ?? process.env.LOCAL_STORAGE_ROOT ?? "./storage");
const destination = resolve(output);

try {
  const entries = await readdir(destination);
  if (entries.length > 0) throw new Error(`Backup destination must be empty: ${destination}`);
} catch (error) {
  if (error && error.code !== "ENOENT") throw error;
}

await stat(database);
await mkdir(destination, { recursive: true });

// VACUUM INTO creates a transactionally consistent, standalone SQLite copy.
const databaseCopy = resolve(destination, "database.db");
const client = createClient({ url: `file:${database}` });
try {
  await client.execute(`VACUUM INTO ${sqlString(databaseCopy)}`);
} finally {
  client.close();
}

const storageCopy = resolve(destination, "storage");
try {
  await cp(storage, storageCopy, { recursive: true, errorOnExist: true });
} catch (error) {
  if (!error || error.code !== "ENOENT") throw error;
  await mkdir(storageCopy, { recursive: true });
}

const files = [databaseCopy, ...await listFiles(storageCopy)];
const manifest = {
  format: "inkest-local-backup",
  version: 1,
  createdAt: new Date().toISOString(),
  database: "database.db",
  storage: "storage",
  files: await Promise.all(files.map(async (path) => ({
    path: relative(destination, path).split(sep).join("/"),
    sha256: await hashFile(path),
  }))),
  secretBoundary: "Environment variables, OAuth credentials, and encryption keys are intentionally not included.",
};
await writeFile(resolve(destination, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Backup created: ${destination}`);
