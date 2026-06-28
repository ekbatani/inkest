import { CalendarDays } from "lucide-react";

export default function DailyPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center gap-2">
        <CalendarDays className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Daily</h1>
      </header>
      <p className="text-muted-foreground">Daily notes arrive in a later phase.</p>
    </div>
  );
}
