import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const idCol = () => text("id").primaryKey();

// ── users ────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: idCol(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  image: text("image"),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  settings: text("settings"),
  telegramChatId: text("telegram_chat_id").unique(),
  telegramLinkCode: text("telegram_link_code"),
  telegramLinkCodeExpiresAt: timestamp("telegram_link_code_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── workspaces ───────────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id: idCol(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── notes ────────────────────────────────────────────────────────────────
export const notes = pgTable("notes", {
  id: idCol(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  title: text("title").notNull().default("Untitled"),
  slug: text("slug").notNull(),
  contentMd: text("content_md").notNull().default(""),
  excerpt: text("excerpt"),
  type: text("type", { enum: ["note", "project", "daily"] }).notNull().default("note"),
  direction: text("direction", { enum: ["ltr", "rtl", "auto"] }).notNull().default("auto"),
  status: text("status", { enum: ["none", "todo", "doing", "done", "paused", "archived"] }).notNull().default("none"),
  priority: text("priority", { enum: ["none", "low", "medium", "high"] }).notNull().default("none"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  sortOrder: integer("sort_order"),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── tags ─────────────────────────────────────────────────────────────────
export const tags = pgTable("tags", {
  id: idCol(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── note_tags ────────────────────────────────────────────────────────────
export const noteTags = pgTable("note_tags", {
  noteId: text("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// ── tasks ────────────────────────────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id: idCol(),
  noteId: text("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "doing", "done", "canceled"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["none", "low", "medium", "high"] }).notNull().default("none"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  startDate: timestamp("start_date", { withTimezone: true }),
  nextAction: text("next_action"),
  ifThenCue: text("if_then_cue"),
  whenWhereHow: text("when_where_how"),
  source: text("source", { enum: ["manual", "markdown", "ai"] }).notNull().default("manual"),
  sourceLine: integer("source_line"),
  dueReminderSentAt: timestamp("due_reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── attachments ──────────────────────────────────────────────────────────
export const attachments = pgTable("attachments", {
  id: idCol(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  noteId: text("note_id").references(() => notes.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  storagePath: text("storage_path").notNull(),
  publicPath: text("public_path"),
  checksum: text("checksum"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── note_versions ────────────────────────────────────────────────────────
export const noteVersions = pgTable("note_versions", {
  id: idCol(),
  noteId: text("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  contentMd: text("content_md").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── ai_events ────────────────────────────────────────────────────────────
export const aiEvents = pgTable("ai_events", {
  id: idCol(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  noteId: text("note_id").references(() => notes.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  inputHash: text("input_hash").notNull(),
  outputMd: text("output_md"),
  outputJson: text("output_json"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── payments ─────────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: idCol(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["nexapay", "cryptomus", "manual"] }).notNull(),
  providerInvoiceId: text("provider_invoice_id"),
  status: text("status", {
    enum: ["pending", "awaiting_confirmation", "confirmed", "failed", "canceled", "expired", "rejected"],
  }).notNull().default("pending"),
  amountUsd: doublePrecision("amount_usd").notNull(),
  credits: doublePrecision("credits").notNull(),
  paidAmount: doublePrecision("paid_amount"),
  paidAsset: text("paid_asset"),
  paidNetwork: text("paid_network"),
  walletAddress: text("wallet_address"),
  txHash: text("tx_hash"),
  metadataJson: text("metadata_json"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── credit_ledger ────────────────────────────────────────────────────────
export const creditLedger = pgTable("credit_ledger", {
  id: idCol(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  delta: doublePrecision("delta").notNull(),
  reason: text("reason", { enum: ["payment", "admin_grant"] }).notNull(),
  paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
