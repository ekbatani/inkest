import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>
      <p className="text-muted-foreground">
        Profile, theme, editor, AI provider, storage, and export settings arrive in a later phase.
      </p>
    </div>
  );
}
