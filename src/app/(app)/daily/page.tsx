import { redirect } from "next/navigation";
import { getOrCreateDailyNote } from "@/server/notes/service";

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const target = (() => {
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  })();
  target.setHours(0, 0, 0, 0);

  const note = await getOrCreateDailyNote(target);
  redirect(`/notes/${note.id}`);
}