import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function usage() {
  console.error("Usage: bun scripts/restore-local.mjs --input <backup-directory> --database <destination.db> --storage <destination-directory>");
  process.exit(1);
}

async function hashFile(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function mustBeEmpty(path) {
  try {
    const info = await stat(path);
    if (info.isDirectory() && (await readdir(path)).length === 0) return;
    throw new Error(`Restore destination must not already contain data: ${path}`);
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

const input = argument("--input");
const database = argument("--database");
const storage = argument("--storage");
if (!input || !database || !storage) usage();

const source = resolve(input);
const databaseDestination = resolve(database);
const storageDestination = resolve(storage);
const manifest = JSON.parse(await readFile(resolve(source, "manifest.json"), "utf8"));
if (manifest.format !== "inkest-local-backup" || manifest.version !== 1) {
  throw new Error("Unsupported or invalid Inkest local backup manifest.");
}

for (const file of manifest.files) {
  const path = resolve(source, file.path);
  if (relative(source, path).startsWith("..")) throw new Error("Invalid path in backup manifest.");
  if (await hashFile(path) !== file.sha256) throw new Error(`Backup checksum mismatch: ${file.path}`);
}

await mustBeEmpty(databaseDestination);
await mustBeEmpty(storageDestination);
await mkdir(resolve(databaseDestination, ".."), { recursive: true });
await cp(resolve(source, manifest.database), databaseDestination, { errorOnExist: true });
await cp(resolve(source, manifest.storage), storageDestination, { recursive: true, errorOnExist: true });
console.log(`Restore completed: ${databaseDestination}`);
