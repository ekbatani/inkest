import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

if (typeof window === "undefined" && url.startsWith("file:")) {
  try {
    const rawPath = url.replace(/^file:\/\//, "").replace(/^file:/, "");
    const resolvedPath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(process.cwd(), rawPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Ignore directory creation errors in edge or restricted environments
  }
}

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { schema };
