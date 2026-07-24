import { eq, and, desc, isNull } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId, slugify } from "@/lib/slug";
import { JOURNAL_TEMPLATES, type JournalTemplateType } from "@/lib/journal-templates";

const MODE_MAP: Record<JournalTemplateType, typeof schema.journalEntries.$inferInsert.templateMode> = {
  daily_reflection: "daily_reflection",
  weekly_review: "freeform",
  decision_log: "decision",
  research_log: "freeform",
  meeting_note: "freeform",
};

export async function createJournalEntry(args: {
  templateType: JournalTemplateType;
  customTitle?: string;
  moodTag?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  const template = JOURNAL_TEMPLATES[args.templateType];
  const noteId = randomId("note");
  const title = args.customTitle || `${template.title} - ${new Date().toLocaleDateString()}`;

  // Create underlying note
  await db.insert(schema.notes).values({
    id: noteId,
    userId: user.id,
    workspaceId: workspace.id,
    title,
    slug: slugify(title) || noteId,
    contentMd: template.defaultMarkdown,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create journal entry metadata
  const entryId = randomId("jrn");
  await db.insert(schema.journalEntries).values({
    id: entryId,
    noteId,
    userId: user.id,
    workspaceId: workspace.id,
    templateMode: MODE_MAP[args.templateType],
    optOutAi: false,
    createdAt: new Date(),
  });

  return { noteId, entryId };
}

export async function listJournalEntries() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const rows = await db
    .select({
      entry: schema.journalEntries,
      noteTitle: schema.notes.title,
      contentMd: schema.notes.contentMd,
      updatedAt: schema.notes.updatedAt,
    })
    .from(schema.journalEntries)
    .innerJoin(schema.notes, eq(schema.journalEntries.noteId, schema.notes.id))
    .where(
      and(
        eq(schema.journalEntries.userId, user.id),
        isNull(schema.notes.deletedAt),
      ),
    )
    .orderBy(desc(schema.journalEntries.createdAt));

  return rows;
}
