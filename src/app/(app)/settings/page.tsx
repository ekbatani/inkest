import Link from "next/link";
import { Settings, Download, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <p className="text-sm text-muted-foreground">
        More settings (profile, theme, editor, AI provider) arrive in a later
        phase.
      </p>

      <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
        <header className="flex items-center gap-2">
          <Archive className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Export &amp; backup</h2>
        </header>
        <p className="text-sm text-muted-foreground">
          Download all your notes, metadata, tags, and attachments as a single
          zip archive you can save offline.
        </p>
        <div>
          <Button render={<Link href="/api/export/all" />} className="gap-1.5">
            <Download className="size-4" /> Export everything
          </Button>
        </div>
      </section>
    </div>
  );
}
