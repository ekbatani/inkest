import { listJournalEntries } from "@/server/journal/journal-service";
import { JournalView } from "@/components/journal/journal-view";

export const metadata = {
  title: "Journal | Inkest",
  description: "Structured journaling templates and reflection timeline.",
};

export default async function JournalPage() {
  const entries = await listJournalEntries();
  return <JournalView initialEntries={entries} />;
}
