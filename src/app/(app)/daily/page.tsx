import { DailyOpener } from "./daily-opener";

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <DailyOpener date={date} />;
}
