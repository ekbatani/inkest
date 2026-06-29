import Link from "next/link";
import { Settings, Download, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { getUserSettings } from "@/server/users/settings-service";
import {
  ProfileSection,
  EditorPrefsSection,
  AiProviderSection,
  DangerZoneSection,
} from "@/components/users/settings-sections";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const settings = await getUserSettings();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <ProfileSection email={user?.email ?? ""} name={user?.name} />

      <EditorPrefsSection
        key={`editor:${settings.editor?.defaultMode}:${settings.editor?.autosaveDelayMs}:${settings.editor?.showLineNumbers}`}
        defaultMode={settings.editor?.defaultMode}
        autosaveDelayMs={settings.editor?.autosaveDelayMs}
        showLineNumbers={settings.editor?.showLineNumbers}
      />

      <AiProviderSection
        key={`ai:${settings.ai?.provider}:${settings.ai?.apiKey ? "set" : "unset"}:${settings.ai?.baseURL ?? ""}:${settings.ai?.model ?? ""}`}
        provider={settings.ai?.provider}
        apiKey={settings.ai?.apiKey}
        baseURL={settings.ai?.baseURL}
        model={settings.ai?.model}
      />

      <section className="surface-card flex flex-col gap-3 p-5">
        <header className="flex items-center gap-2">
          <Archive className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Export & backup</h2>
        </header>
        <p className="text-sm text-muted-foreground">
          Download all your notes, metadata, tags, and attachments as a single
          zip archive you can save offline.
        </p>
        <div>
          <Button
            nativeButton={false}
            render={<Link href="/api/export/all" />}
            className="gap-1.5"
          >
            <Download className="size-4" /> Export everything
          </Button>
        </div>
      </section>

      <DangerZoneSection />
    </div>
  );
}
