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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const idCol = () => text("id").primaryKey();

// ── users ────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: idCol(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  image: text("image"),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  status: text("status", { enum: ["active", "suspended"] })
    .notNull()
    .default("active"),
  // JSON-encoded user settings, parsed by the service: editor prefs, AI
  // provider overrides, etc.
  settings: text("settings"),
  // Per-user Telegram link (env-var TELEGRAM_CHAT_ID remains a fallback for
  // single-user self-host deployments that never link an account).
  telegramChatId: text("telegram_chat_id").unique(),
  telegramLinkCode: text("telegram_link_code"),
  telegramLinkCodeExpiresAt: timestamp("telegram_link_code_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── workspaces ───────────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── notes ────────────────────────────────────────────────────────────────
export const notes = pgTable("notes", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): AnyPgColumn => notes.id, {
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
  dueDate: timestamp("due_date", { withTimezone: true }),
  sortOrder: integer("sort_order"),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── tags ─────────────────────────────────────────────────────────────────
export const tags = pgTable("tags", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── note_tags ────────────────────────────────────────────────────
export const noteTags = pgTable("note_tags", {
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// ── project_members ──────────────────────────────────────────────
export const projectMembers = pgTable(
  "project_members",
  {
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["viewer", "editor"] })
      .notNull()
      .default("viewer"),
    addedByUserId: text("added_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_members_project_user_uq").on(
      table.projectId,
      table.userId,
    ),
    index("project_members_user_idx").on(table.userId),
    index("project_members_project_idx").on(table.projectId),
  ],
);

// ── tasks ────────────────────────────────────────────────────────────────
export const tasks = pgTable("tasks", {
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
  dueDate: timestamp("due_date", { withTimezone: true }),
  startDate: timestamp("start_date", { withTimezone: true }),
  nextAction: text("next_action"),
  ifThenCue: text("if_then_cue"),
  whenWhereHow: text("when_where_how"),
  source: text("source", { enum: ["manual", "markdown", "ai"] })
    .notNull()
    .default("manual"),
  sourceLine: integer("source_line"),
  dueReminderSentAt: timestamp("due_reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── notifications ────────────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: idCol(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "task_due",
        "delivery_failed",
        "project_shared",
        "note_shared_updated",
        "project_deadline",
        "daily_nudge",
        "weekly_review",
        "morning_briefing",
        "telegram_action",
      ],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notifications_user_dedupe_unique").on(
      table.userId,
      table.dedupeKey,
    ),
  ],
);

// ── attachments ──────────────────────────────────────────────────────────
export const attachments = pgTable("attachments", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── note_versions ────────────────────────────────────────────────────────
export const noteVersions = pgTable("note_versions", {
  id: idCol(),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  contentMd: text("content_md").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── ai_events ────────────────────────────────────────────────────────────
export const aiEvents = pgTable("ai_events", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── google_calendar_connections ──────────────────────────────────────────
export const googleCalendarConnections = pgTable(
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
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// ── google_calendar_events ──────────────────────────────────────────────
export const googleCalendarEvents = pgTable("google_calendar_events", {
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
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").notNull().default(false),
  sourceUpdatedAt: text("source_updated_at"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── documents ─────────────────────────────────────────────────────────────
export const documents = pgTable("documents", {
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
  parentId: text("parent_id").references((): AnyPgColumn => notes.id, {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── annotations ───────────────────────────────────────────────────────────
export const annotations = pgTable("annotations", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── citations ─────────────────────────────────────────────────────────────
export const citations = pgTable("citations", {
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
  isBroken: boolean("is_broken").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── saved_views ───────────────────────────────────────────────────────────
export const savedViews = pgTable("saved_views", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── journal_entries ───────────────────────────────────────────────────────
export const journalEntries = pgTable("journal_entries", {
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
  optOutAi: boolean("opt_out_ai").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── vault_items ───────────────────────────────────────────────────────────
export const vaultItems = pgTable("vault_items", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── audit_logs ────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── chat_threads ──────────────────────────────────────────────────────────
export const chatThreads = pgTable("chat_threads", {
  id: idCol(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── chat_messages ─────────────────────────────────────────────────────────
export const chatMessages = pgTable("chat_messages", {
  id: idCol(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  isError: boolean("is_error").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── document_blocks ──────────────────────────────────────────────────────
export const documentBlocks = pgTable(
  "document_blocks",
  {
    id: idCol(),
    documentId: text("document_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentVersion: integer("document_version").notNull().default(1),
    blockIndex: integer("block_index").notNull(),
    blockType: text("block_type").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    headingAnchor: text("heading_anchor"),
    sectionTitle: text("section_title"),
    metadataJson: text("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("doc_blocks_doc_idx").on(table.documentId, table.blockIndex),
    index("doc_blocks_ws_user_idx").on(table.workspaceId, table.userId),
    index("doc_blocks_hash_idx").on(table.documentId, table.contentHash),
  ],
);

// ── document_embeddings ──────────────────────────────────────────────────
export const documentEmbeddings = pgTable(
  "document_embeddings",
  {
    id: idCol(),
    documentId: text("document_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    textHash: text("text_hash").notNull(),
    embeddingModel: text("embedding_model").notNull(),
    embeddingVersion: integer("embedding_version").notNull().default(1),
    dimensions: integer("dimensions").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("doc_emb_doc_blk_idx").on(table.documentId, table.blockId),
    index("doc_emb_ws_user_idx").on(table.workspaceId, table.userId),
    index("doc_emb_hash_idx").on(table.contentHash),
  ],
);

// ── document_links ───────────────────────────────────────────────────────
export const documentLinks = pgTable(
  "document_links",
  {
    id: idCol(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    targetDocumentId: text("target_document_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    targetAnchor: text("target_anchor"),
    linkType: text("link_type", {
      enum: ["wiki", "markdown", "parent_child", "mention"],
    })
      .notNull()
      .default("wiki"),
    origin: text("origin", { enum: ["user", "parser", "ai"] })
      .notNull()
      .default("parser"),
    confidence: doublePrecision("confidence").default(1.0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("doc_links_src_idx").on(table.sourceDocumentId),
    index("doc_links_tgt_idx").on(table.targetDocumentId),
    index("doc_links_ws_user_idx").on(table.workspaceId, table.userId),
  ],
);

// ── block_relations ──────────────────────────────────────────────────────
export const blockRelations = pgTable(
  "block_relations",
  {
    id: idCol(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceBlockId: text("source_block_id").notNull(),
    targetBlockId: text("target_block_id").notNull(),
    relationType: text("relation_type", {
      enum: [
        "links_to",
        "mentions",
        "related_to",
        "supports",
        "contradicts",
        "derived_from",
        "references",
      ],
    })
      .notNull()
      .default("related_to"),
    origin: text("origin", { enum: ["user", "parser", "ai"] })
      .notNull()
      .default("parser"),
    confidence: doublePrecision("confidence").default(1.0),
    metadataJson: text("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("blk_rel_src_idx").on(table.sourceBlockId),
    index("blk_rel_tgt_idx").on(table.targetBlockId),
    index("blk_rel_ws_user_idx").on(table.workspaceId, table.userId),
  ],
);

// ── document_index_state ─────────────────────────────────────────────────
export const documentIndexState = pgTable("document_index_state", {
  documentId: text("document_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  contentVersion: integer("content_version").notNull().default(1),
  ftsVersion: integer("fts_version").notNull().default(0),
  embeddingVersion: integer("embedding_version").notNull().default(0),
  relationshipVersion: integer("relationship_version").notNull().default(0),
  status: text("status", {
    enum: ["pending", "processing", "ready", "failed", "stale"],
  })
    .notNull()
    .default("pending"),
  lastIndexedAt: timestamp("last_indexed_at", { withTimezone: true }),
  error: text("error"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── payments ─────────────────────────────────────────────────────────────
export const payments = pgTable(
  "payments",
  {
    id: idCol(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["nexapay", "cryptomus", "manual"],
    }).notNull(),
    providerInvoiceId: text("provider_invoice_id"),
    status: text("status", {
      enum: [
        "pending",
        "awaiting_confirmation",
        "confirmed",
        "failed",
        "canceled",
        "expired",
        "rejected",
      ],
    })
      .notNull()
      .default("pending"),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_provider_invoice_uq").on(table.providerInvoiceId),
    index("payments_user_idx").on(table.userId, table.createdAt),
    index("payments_status_idx").on(table.status, table.createdAt),
  ],
);

// ── credit_ledger ────────────────────────────────────────────────────────
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: idCol(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    delta: doublePrecision("delta").notNull(),
    reason: text("reason", { enum: ["payment", "admin_grant"] }).notNull(),
    paymentId: text("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("credit_ledger_payment_reason_uq").on(
      table.paymentId,
      table.reason,
    ),
    index("credit_ledger_user_idx").on(table.userId, table.createdAt),
  ],
);

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
export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatMessageEntity = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type DocumentBlockEntity = typeof documentBlocks.$inferSelect;
export type NewDocumentBlock = typeof documentBlocks.$inferInsert;
export type DocumentEmbeddingEntity = typeof documentEmbeddings.$inferSelect;
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert;
export type DocumentLinkEntity = typeof documentLinks.$inferSelect;
export type NewDocumentLink = typeof documentLinks.$inferInsert;
export type BlockRelationEntity = typeof blockRelations.$inferSelect;
export type NewBlockRelation = typeof blockRelations.$inferInsert;
export type DocumentIndexStateEntity = typeof documentIndexState.$inferSelect;
export type NewDocumentIndexState = typeof documentIndexState.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type NewCreditLedgerEntry = typeof creditLedger.$inferInsert;



