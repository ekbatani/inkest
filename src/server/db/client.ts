import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const url =
  process.env.DATABASE_URL ??
  "postgres://inknest:inknest_secret@localhost:5432/inknest";

// Initialize PostgreSQL client with connection pooling
export const client = postgres(url, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };

