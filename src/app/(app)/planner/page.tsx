import { getPlannerData } from "@/server/tasks/planner-service";
import { listJournalEntries } from "@/server/journal/journal-service";
import { PlannerView } from "@/components/planner/planner-view";

export const metadata = {
  title: "Planner & Journal | Inkest",
  description: "Goal decomposition, next actions, and structured reflections.",
};

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [plannerData, journalEntries] = await Promise.all([
    getPlannerData(),
    listJournalEntries(),
  ]);

  return (
    <PlannerView
      initialData={plannerData}
      initialJournalEntries={journalEntries}
      initialTab={tab === "journal" ? "journal" : "planner"}
    />
  );
}
