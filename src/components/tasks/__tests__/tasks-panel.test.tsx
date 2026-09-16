import { describe, it, expect } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { TasksPanel } from "../tasks-panel";
import type { Task } from "@/server/db/schema";

describe("TasksPanel checklist component", () => {
  const dummyTasks: Task[] = [
    {
      id: "task-1",
      noteId: "note-1",
      userId: "user-1",
      title: "Write documentation",
      description: null,
      status: "todo",
      priority: "high",
      dueDate: null,
      startDate: null,
      nextAction: null,
      ifThenCue: null,
      whenWhereHow: null,
      source: "manual",
      sourceLine: null,
      dueReminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "task-2",
      noteId: "note-1",
      userId: "user-1",
      title: "Review pull request",
      description: null,
      status: "done",
      priority: "none",
      dueDate: null,
      startDate: null,
      nextAction: null,
      ifThenCue: null,
      whenWhereHow: null,
      source: "markdown",
      sourceLine: null,
      dueReminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("renders tasks as a checklist and has no Kanban view controls", () => {
    const html = renderToString(
      <TasksPanel noteId="note-1" initialTasks={dummyTasks} />,
    );

    // Checklist contents
    expect(html).toContain("Write documentation");
    expect(html).toContain("Review pull request");
    expect(/2<!-- --> task/.test(html)).toBe(true);

    // Strictly NO Kanban view or controls
    expect(html).not.toContain("Kanban");
    expect(html).not.toContain("column-todo");
    expect(html).not.toContain("column-doing");
    expect(html).not.toContain("Drag here");
  });

  it("renders empty state when there are no tasks", () => {
    const html = renderToString(
      <TasksPanel noteId="note-1" initialTasks={[]} />,
    );

    expect(html).toContain("No checklist items yet");
    expect(/0<!-- --> task/.test(html)).toBe(true);
    expect(html).not.toContain("Kanban");
  });
});
