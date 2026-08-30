"use server";

import { getCurrentUser } from "@/server/auth";
import { runTextAction, type AiActionResult } from "./runner";
import { getPlannerData } from "@/server/tasks/planner-service";
import { getDailyBriefingData } from "@/server/tasks/briefing-service";

const SYSTEM_PROMPT =
  "You are the Inkest weekly review coach for a private, personal workspace. " +
  "Using only the planner snapshot provided, write a short markdown recap with " +
  "three sections: `### Momentum` (what is moving, celebrate concrete wins), " +
  "`### Risks` (overdue work and looming deadlines, honest but kind), and " +
  "`### Focus for next week` (2-4 concrete suggestions referencing real task or " +
  "project titles). Keep it under 200 words. Never invent tasks or projects.";

/**
 * AI recap of the caller's own planner state. Data is fetched server-side so
 * the client cannot inject someone else's (or fabricated) task lists.
 */
export async function summarizeWeeklyReviewAction(): Promise<AiActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const [planner, briefing] = await Promise.all([
    getPlannerData(),
    getDailyBriefingData(user.id),
  ]);

  const nothingToReview =
    planner.overdue.length === 0 &&
    planner.today.length === 0 &&
    planner.upcoming.length === 0 &&
    planner.unplanned.length === 0 &&
    planner.completedThisWeekCount === 0;
  if (nothingToReview) {
    return {
      ok: false,
      error: "Your planner is empty — add tasks before running a review.",
    };
  }

  const snapshotParts = [
    `Overdue (${planner.overdue.length}):`,
    ...planner.overdue.slice(0, 8).map((t) => `  - ${t.title} (from: ${t.noteTitle})`),
    `Due today (${planner.today.length}):`,
    ...planner.today.slice(0, 8).map((t) => `  - ${t.title} (from: ${t.noteTitle})`),
    `Upcoming 7 days (${planner.upcoming.length}):`,
    ...planner.upcoming
      .slice(0, 8)
      .map(
        (t) =>
          `  - ${t.title}${t.dueDate ? ` (due ${t.dueDate.toISOString().slice(0, 10)})` : ""}`,
      ),
    `Goals without next actions or deadlines (${planner.unplanned.length}):`,
    ...planner.unplanned.slice(0, 8).map((t) => `  - ${t.title} (from: ${t.noteTitle})`),
    briefing.projectDeadlines.length > 0
      ? `Project deadlines within 48h: ${briefing.projectDeadlines
          .map((p) => `“${p.title}”${p.isOverdue ? " (overdue)" : ""}`)
          .join(", ")}`
      : "Project deadlines within 48h: none",
    `Tasks completed in the last 7 days: ${planner.completedThisWeekCount}`,
  ].join("\n");

  const today = new Date().toISOString().slice(0, 10);
  return runTextAction({
    noteId: null,
    action: "weekly-review",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit: `Weekly review planner snapshot ${today}`,
    promptToModel: `Today is ${today}. Weekly review planner snapshot:\n\n${snapshotParts}\n\nWrite the weekly review recap per the system rules. Highlight only the most important items; do not list everything.`,
    enableGrounding: false,
  });
}
