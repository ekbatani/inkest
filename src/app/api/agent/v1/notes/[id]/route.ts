import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentRequest } from "@/server/agent/harness-protocol";
import { getNoteById, updateNote } from "@/server/notes/service";
import { listTasks } from "@/server/tasks/service";
import { runWithAuthContext } from "@/server/auth/context";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = req.headers.get("authorization");
  const auth = await authenticateAgentRequest(authHeader);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  return runWithAuthContext(
    { userId: auth.userId, workspaceId: auth.workspaceId, isAgent: true },
    async () => {
      const note = await getNoteById(id);
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      const tasks = await listTasks(id).catch(() => []);

      return NextResponse.json({
        id: note.id,
        title: note.title,
        contentMd: note.contentMd,
        type: note.type,
        status: note.status,
        priority: note.priority,
        dueDate: note.dueDate,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
        })),
      });
    },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = req.headers.get("authorization");
  const auth = await authenticateAgentRequest(authHeader);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  return runWithAuthContext(
    { userId: auth.userId, workspaceId: auth.workspaceId, isAgent: true },
    async () => {
      try {
        const body = await req.json();
        const existing = await getNoteById(id);
        if (!existing) {
          return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        let nextContent = existing.contentMd;
        if (typeof body.contentMd === "string") {
          nextContent = body.contentMd;
        } else if (typeof body.appendContent === "string") {
          nextContent = `${existing.contentMd.trimEnd()}\n\n${body.appendContent.trim()}`;
        }

        const updated = await updateNote(id, {
          title: body.title ? String(body.title) : undefined,
          contentMd: nextContent,
          status: body.status ? body.status : undefined,
        });

        return NextResponse.json({
          success: true,
          note: updated,
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Failed to update note",
          },
          { status: 400 },
        );
      }
    },
  );
}
