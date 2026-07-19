import Link from "next/link";
import { Settings, Download, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { getUserSettings } from "@/server/users/settings-service";
import { getTelegramLinkStatus } from "@/server/notifications/telegram-link";
import { getAiConfigurationStatus } from "@/server/ai/provider";
import {
  ProfileSection,
  AppearanceSection,
  EditorPrefsSection,
  AiProviderSection,
  NotificationsSection,
  DangerZoneSection,
} from "@/components/users/settings-sections";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [settings, telegramStatus] = await Promise.all([
    getUserSettings(),
    getTelegramLinkStatus(),
  ]);
  const aiConfiguration = getAiConfigurationStatus(settings);

  return (
    <div className="app-page max-w-3xl gap-6">
      <header className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <p className="-mt-3 text-sm text-muted-foreground">
        Account, writing, AI, data, and connected-service preferences are kept separate below.
      </p>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</h2>
      <ProfileSection email={user?.email ?? ""} name={user?.name} />

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Writing</h2>
      <AppearanceSection
        key={`appearance:${settings.theme?.preference}:${settings.theme?.palette}:${settings.theme?.font}`}
        preference={settings.theme?.preference}
        palette={settings.theme?.palette}
        font={settings.theme?.font}
      />
      <EditorPrefsSection
        key={`editor:${settings.editor?.autosaveDelayMs}:${settings.editor?.showLineNumbers}:${settings.editor?.spellcheck}:${settings.editor?.spellcheckLanguage}`}
        autosaveDelayMs={settings.editor?.autosaveDelayMs}
        showLineNumbers={settings.editor?.showLineNumbers}
        spellcheck={settings.editor?.spellcheck}
        spellcheckLanguage={settings.editor?.spellcheckLanguage}
      />

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI setup</h2>
      <AiProviderSection
        key={`ai:${settings.ai?.provider}:${settings.ai?.apiKey ? "set" : "unset"}:${settings.ai?.baseURL ?? ""}:${settings.ai?.model ?? ""}`}
        provider={settings.ai?.provider}
        hasApiKey={Boolean(settings.ai?.apiKey)}
        baseURL={settings.ai?.baseURL}
        model={settings.ai?.model}
        configurationSource={aiConfiguration.source}
      />

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your data</h2>
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

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connected services</h2>
      <NotificationsSection
        key={`notifications:${telegramStatus.linked}`}
        initialLinked={telegramStatus.linked}
        inApp={settings.notifications?.inApp}
        aiResults={settings.notifications?.aiResults}
        taskDueReminders={settings.notifications?.taskDueReminders}
        dailyNoteNudge={settings.notifications?.dailyNoteNudge}
      />

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account deletion</h2>
      <DangerZoneSection />
    </div>
  );
}
