import { sqliteTable, text, integer, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Helpers
const timestamp = (name: string) =>
  integer(name, { mode: "timestamp" }).default(sql`(unixepoch())`);

const idCol = () => text("id").primaryKey();

// ── users ────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: idCol(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  image: text("image"),
  // JSON-encoded user settings, parsed by the service: editor prefs, AI
  // provider overrides, etc. Stored as TEXT since SQLite has no native JSONB.
  settings: text("settings"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── workspaces ───────────────────────────────────────────────────────────
export const workspaces = sqliteTable("workspaces", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── notes ────────────────────────────────────────────────────────────────
export const notes = sqliteTable("notes", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): AnySQLiteColumn => notes.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull().default("Untitled"),
  slug: text("slug").notNull(),
  contentMd: text("content_md").notNull().default(""),
  excerpt: text("excerpt"),
  type: text("type", { enum: ["note", "project", "daily"] })
    .notNull()
    .default("note"),
  direction: text("direction", { enum: ["ltr", "rtl", "auto"] })
    .notNull()
    .default("auto"),
  status: text("status", {
    enum: ["none", "todo", "doing", "done", "paused", "archived"],
  })
    .notNull()
    .default("none"),
  priority: text("priority", { enum: ["none", "low", "medium", "high"] })
    .notNull()
    .default("none"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── tags ─────────────────────────────────────────────────────────────────
export const tags = sqliteTable("tags", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull(),
});

// ── note_tags ────────────────────────────────────────────────────────────
export const noteTags = sqliteTable("note_tags", {
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// ── tasks ────────────────────────────────────────────────────────────────
export const tasks = sqliteTable("tasks", {
  id: idCol(),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "doing", "done", "canceled"] })
    .notNull()
    .default("todo"),
  priority: text("priority", { enum: ["none", "low", "medium", "high"] })
    .notNull()
    .default("none"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  source: text("source", { enum: ["manual", "markdown", "ai"] })
    .notNull()
    .default("manual"),
  sourceLine: integer("source_line"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── attachments ──────────────────────────────────────────────────────────
export const attachments = sqliteTable("attachments", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  noteId: text("note_id").references(() => notes.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  storagePath: text("storage_path").notNull(),
  publicPath: text("public_path"),
  checksum: text("checksum"),
  createdAt: timestamp("created_at").notNull(),
});

// ── note_versions ────────────────────────────────────────────────────────
export const noteVersions = sqliteTable("note_versions", {
  id: idCol(),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  contentMd: text("content_md").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

// ── ai_events ────────────────────────────────────────────────────────────
export const aiEvents = sqliteTable("ai_events", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  noteId: text("note_id").references(() => notes.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  inputHash: text("input_hash").notNull(),
  outputMd: text("output_md"),
  outputJson: text("output_json"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

// ── Type exports ─────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type AiEvent = typeof aiEvents.$inferSelect;
export type NoteVersion = typeof noteVersions.$inferSelect;
