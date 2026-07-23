import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
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
  // Per-user Telegram link (env-var TELEGRAM_CHAT_ID remains a fallback for
  // single-user self-host deployments that never link an account).
  telegramChatId: text("telegram_chat_id").unique(),
  telegramLinkCode: text("telegram_link_code"),
  telegramLinkCodeExpiresAt: integer("telegram_link_code_expires_at", {
    mode: "timestamp",
  }),
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
  sortOrder: integer("sort_order"),
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
  // Set once a Telegram due-date reminder has been sent, so the scheduler
  // doesn't re-notify on every pass. Cleared if the due date changes.
  dueReminderSentAt: integer("due_reminder_sent_at", { mode: "timestamp" }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// Durable, user-scoped activity items. `dedupeKey` makes scheduler retries and
// multiple server processes safe: an event can be delivered only once.
export const notifications = sqliteTable(
  "notifications",
  {
    id: idCol(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["task_due", "delivery_failed"] }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: integer("read_at", { mode: "timestamp" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [uniqueIndex("notifications_user_dedupe_unique").on(table.userId, table.dedupeKey)],
);

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

// -- google_calendar_connections ---------------------------------------------
export const googleCalendarConnections = sqliteTable(
  "google_calendar_connections",
  {
    id: idCol(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    googleEmail: text("google_email"),
    calendarId: text("calendar_id").notNull().default("primary"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenType: text("token_type"),
    scope: text("scope"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

// -- google_calendar_events --------------------------------------------------
export const googleCalendarEvents = sqliteTable("google_calendar_events", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  connectionId: text("connection_id").references(
    () => googleCalendarConnections.id,
    {
      onDelete: "set null",
    },
  ),
  externalKey: text("external_key").notNull().unique(),
  googleEventId: text("google_event_id").notNull(),
  calendarId: text("calendar_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  htmlLink: text("html_link"),
  status: text("status"),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  sourceUpdatedAt: text("source_updated_at"),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── documents ─────────────────────────────────────────────────────────────
export const documents = sqliteTable("documents", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  attachmentId: text("attachment_id").references(() => attachments.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  fileType: text("file_type", { enum: ["pdf", "text", "markdown"] })
    .notNull()
    .default("pdf"),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  pageCount: integer("page_count"),
  checksum: text("checksum"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── annotations ───────────────────────────────────────────────────────────
export const annotations = sqliteTable("annotations", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  noteId: text("note_id").references(() => notes.id, {
    onDelete: "set null",
  }),
  pageNumber: integer("page_number"),
  positionSelector: text("position_selector"), // JSON selector string
  highlightText: text("highlight_text"),
  comment: text("comment"),
  color: text("color").default("yellow"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── citations ─────────────────────────────────────────────────────────────
export const citations = sqliteTable("citations", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  sourceType: text("source_type", { enum: ["document", "note"] }).notNull(),
  sourceId: text("source_id").notNull(),
  targetNoteId: text("target_note_id").references(() => notes.id, {
    onDelete: "set null",
  }),
  targetAiEventId: text("target_ai_event_id").references(() => aiEvents.id, {
    onDelete: "set null",
  }),
  locationPointer: text("location_pointer"), // JSON page/line/range pointer
  quotedText: text("quoted_text"),
  isBroken: integer("is_broken", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: timestamp("created_at").notNull(),
});

// ── saved_views ───────────────────────────────────────────────────────────
export const savedViews = sqliteTable("saved_views", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  queryJson: text("query_json").notNull(), // JSON string filter specification
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── journal_entries ───────────────────────────────────────────────────────
export const journalEntries = sqliteTable("journal_entries", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  templateMode: text("template_mode", {
    enum: [
      "daily_reflection",
      "gratitude",
      "decision",
      "emotion",
      "freeform",
    ],
  })
    .notNull()
    .default("freeform"),
  optOutAi: integer("opt_out_ai", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── vault_items ───────────────────────────────────────────────────────────
export const vaultItems = sqliteTable("vault_items", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category", {
    enum: ["password", "key", "token", "secret_note"],
  })
    .notNull()
    .default("secret_note"),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── audit_logs ────────────────────────────────────────────────────────────
export const auditLogs = sqliteTable("audit_logs", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadataJson: text("metadata_json"),
  ipAddress: text("ip_address"),
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
export type Notification = typeof notifications.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type AiEvent = typeof aiEvents.$inferSelect;
export type NoteVersion = typeof noteVersions.$inferSelect;
export type GoogleCalendarConnection =
  typeof googleCalendarConnections.$inferSelect;
export type GoogleCalendarEvent = typeof googleCalendarEvents.$inferSelect;
export type DocumentEntity = typeof documents.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
export type Citation = typeof citations.$inferSelect;
export type SavedView = typeof savedViews.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type VaultItem = typeof vaultItems.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
