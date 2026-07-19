"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AI_PROVIDERS,
  getAiProviderDefinition,
  type AiProviderId,
} from "@/lib/ai/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateProfileAction,
  changePasswordAction,
} from "@/server/users/settings-actions";
import { AiBadge } from "@/components/ai/ai-badge";
import { useTheme } from "next-themes";
import {
  applyAppearance,
  type AppearanceFont,
  type AppearancePalette,
  type AppearanceTheme,
} from "@/components/users/appearance-sync";

export function AppearanceSection({
  preference = "system",
  palette = "paper",
  font = "sans",
}: {
  preference?: AppearanceTheme;
  palette?: AppearancePalette;
  font?: AppearanceFont;
}) {
  const { setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = React.useState(preference);
  const [selectedPalette, setSelectedPalette] = React.useState(palette);
  const [selectedFont, setSelectedFont] = React.useState(font);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      setTheme(selectedTheme);
      applyAppearance({ palette: selectedPalette, font: selectedFont });
      await import("@/server/users/settings-actions").then((actions) =>
        actions.updateUserSettingsAction({ theme: { preference: selectedTheme, palette: selectedPalette, font: selectedFont } }),
      );
      toast.success("Appearance saved.");
    } catch {
      toast.error("Failed to save appearance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface-card flex flex-col gap-4 p-5">
      <div><h2 className="text-sm font-semibold">Appearance</h2><p className="mt-1 text-xs text-muted-foreground">Bundled fonts and semantic color tokens keep the editor and preview spacing stable.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="theme-preference" className="text-xs text-muted-foreground">Mode</Label><Select value={selectedTheme} onValueChange={(value) => setSelectedTheme(value as AppearanceTheme)}><SelectTrigger id="theme-preference" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">System</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem></SelectContent></Select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="theme-palette" className="text-xs text-muted-foreground">Palette</Label><Select value={selectedPalette} onValueChange={(value) => setSelectedPalette(value as AppearancePalette)}><SelectTrigger id="theme-palette" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paper">Paper</SelectItem><SelectItem value="forest">Forest</SelectItem><SelectItem value="violet">Violet</SelectItem></SelectContent></Select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="theme-font" className="text-xs text-muted-foreground">Writing font</Label><Select value={selectedFont} onValueChange={(value) => setSelectedFont(value as AppearanceFont)}><SelectTrigger id="theme-font" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sans">Clean sans</SelectItem><SelectItem value="serif">Editorial serif</SelectItem><SelectItem value="persian">Persian-friendly</SelectItem></SelectContent></Select></div>
      </div>
      <div><Button size="sm" onClick={save} disabled={saving}>Save appearance</Button></div>
    </section>
  );
}

export function ProfileSection({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  const [profileName, setProfileName] = React.useState(name ?? "");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [savingPw, setSavingPw] = React.useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfileAction(profileName);
      toast.success("Profile saved.");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!currentPw || !newPw) return;
    setSavingPw(true);
    try {
      await changePasswordAction(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <section className="surface-card flex flex-col gap-4 p-5">
      <h2 className="text-sm font-semibold">Profile</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input value={email} readOnly disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Your name"
          />
        </div>
      </div>
      <div>
        <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
          Save profile
        </Button>
      </div>

      <div className="mt-2 border-t pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Change password
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Current password
            </Label>
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              New password
            </Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3"
          variant="outline"
          onClick={savePassword}
          disabled={savingPw || !currentPw || !newPw}
        >
          Update password
        </Button>
      </div>
    </section>
  );
}

export function EditorPrefsSection({
  autosaveDelayMs,
  showLineNumbers,
  spellcheck,
  spellcheckLanguage,
}: {
  autosaveDelayMs?: number;
  showLineNumbers?: boolean;
  spellcheck?: boolean;
  spellcheckLanguage?: "auto" | "en" | "fa";
}) {
  const [delay, setDelay] = React.useState(String(autosaveDelayMs ?? 1500));
  const [lineNumbers, setLineNumbers] = React.useState(!!showLineNumbers);
  const [spellcheckEnabled, setSpellcheckEnabled] = React.useState(
    spellcheck ?? true,
  );
  const [language, setLanguage] = React.useState(spellcheckLanguage ?? "auto");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const delayMs = Math.max(0, Math.min(60_000, Number(delay) || 1500));
      await import("@/server/users/settings-actions").then((m) =>
        m.updateUserSettingsAction({
          editor: {
            autosaveDelayMs: delayMs,
            showLineNumbers: lineNumbers,
            spellcheck: spellcheckEnabled,
            spellcheckLanguage: language,
          },
        }),
      );
      toast.success("Editor preferences saved.");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface-card flex flex-col gap-4 p-5">
      <h2 className="text-sm font-semibold">Editor</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Autosave delay (ms)
          </Label>
          <Input
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            type="number"
            min={0}
            max={60_000}
            step={250}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Line numbers</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-8 justify-start"
            onClick={() => setLineNumbers((v) => !v)}
          >
            {lineNumbers ? "On" : "Off"}
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Spellcheck</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-8 justify-start"
            aria-pressed={spellcheckEnabled}
            onClick={() => setSpellcheckEnabled((value) => !value)}
          >
            {spellcheckEnabled ? "On" : "Off"}
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground" htmlFor="spellcheck-language">
            Writing language
          </Label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as "auto" | "en" | "fa")}
            disabled={!spellcheckEnabled}
          >
            <SelectTrigger id="spellcheck-language" className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Browser default</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fa">Persian</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Suggestions come from your browser and its installed dictionaries. Inkest never sends note text to AI for spellcheck; AI writing actions remain manual and use only text you select.
      </p>
      <div>
        <Button size="sm" onClick={save} disabled={saving}>
          Save editor prefs
        </Button>
      </div>
    </section>
  );
}

export function AiProviderSection({
  provider,
  hasApiKey,
  baseURL,
  model,
  configurationSource,
}: {
  provider?: AiProviderId;
  hasApiKey: boolean;
  baseURL?: string;
  model?: string;
  configurationSource: "user" | "instance" | "unavailable";
}) {
  const initialProvider = provider ?? "openai";
  const [selectedProvider, setSelectedProvider] =
    React.useState<AiProviderId>(initialProvider);
  const [key, setKey] = React.useState("");
  const [url, setUrl] = React.useState(
    baseURL ?? getAiProviderDefinition(initialProvider).defaultBaseURL,
  );
  const [mdl, setMdl] = React.useState(
    model ?? getAiProviderDefinition(initialProvider).defaultModel,
  );
  const [saving, setSaving] = React.useState(false);
  const [removingKey, setRemovingKey] = React.useState(false);
  const providerDef = getAiProviderDefinition(selectedProvider);

  const onProviderChange = (nextProvider: AiProviderId) => {
    const currentDef = getAiProviderDefinition(selectedProvider);
    const nextDef = getAiProviderDefinition(nextProvider);
    setSelectedProvider(nextProvider);

    if (!url.trim() || url === currentDef.defaultBaseURL) {
      setUrl(nextDef.defaultBaseURL);
    }
    if (!mdl.trim() || mdl === currentDef.defaultModel) {
      setMdl(nextDef.defaultModel);
    }
  };

  const save = async () => {
    const trimmedUrl = url.trim();
    const trimmedModel = mdl.trim();
    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        toast.error("Enter a valid OpenAI-compatible base URL.");
        return;
      }
    }
    if (!trimmedModel) {
      toast.error("Enter the model name to use.");
      return;
    }
    if (!providerDef.apiKeyOptional && !key.trim() && !hasApiKey && configurationSource === "unavailable") {
      toast.error("Add an API key or ask the instance administrator to configure one.");
      return;
    }
    setSaving(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.updateAiProviderSettingsAction({
          provider: selectedProvider,
          ...(key.trim() ? { apiKey: key.trim() } : {}),
          baseURL: trimmedUrl,
          model: trimmedModel,
        }),
      );
      setKey("");
      toast.success("AI provider saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save AI provider.");
    } finally {
      setSaving(false);
    }
  };

  const removeSavedKey = async () => {
    if (!confirm("Remove your saved AI API key? The instance default will be used instead.")) return;
    setRemovingKey(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.clearAiProviderApiKeyAction(),
      );
      toast.success("Saved AI API key removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove the saved key.");
    } finally {
      setRemovingKey(false);
    }
  };

  return (
    <section className="surface-card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AiBadge />
          <h2 className="text-sm font-semibold">AI provider</h2>
        </div>
        <Link
          href="/help#ai"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Need a key? →
        </Link>
      </div>
      <div className="rounded-md border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
        {configurationSource === "user"
          ? "Using your saved API key. It is encrypted at rest and never shown here again."
          : configurationSource === "instance"
            ? "Using the instance default. Add your own key below to override it just for your account."
            : "AI is unavailable: add your own key below, or ask the instance administrator to configure a provider."}
      </div>
      <p className="text-xs text-muted-foreground">
        Provider, base URL, and model are personal preferences. A blank API key keeps your existing saved key; otherwise the instance default is used. Ollama does not require a key.
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Provider</Label>
          <Select
            value={selectedProvider}
            onValueChange={(value) => onProviderChange(value as AiProviderId)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">API key {hasApiKey ? "(saved)" : "(optional)"}</Label>
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={providerDef.apiKeyPlaceholder}
            autoComplete="off"
          />
          {hasApiKey ? <p className="text-[11px] text-muted-foreground">Leave blank to keep the saved key.</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Base URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={providerDef.defaultBaseURL}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Model</Label>
          <Input
            value={mdl}
            onChange={(e) => setMdl(e.target.value)}
            placeholder={providerDef.defaultModel}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          Save AI provider
        </Button>
        {hasApiKey ? (
          <Button size="sm" variant="outline" onClick={removeSavedKey} disabled={removingKey}>
            Remove saved key
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function NotificationsSection({
  initialLinked,
  inApp,
  aiResults,
  taskDueReminders,
  dailyNoteNudge,
}: {
  initialLinked: boolean;
  inApp?: boolean;
  aiResults?: boolean;
  taskDueReminders?: boolean;
  dailyNoteNudge?: boolean;
}) {
  const [linked, setLinked] = React.useState(initialLinked);
  const [linkCode, setLinkCode] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [unlinking, setUnlinking] = React.useState(false);
  const [prefs, setPrefs] = React.useState({
    inApp: inApp ?? true,
    aiResults: aiResults ?? true,
    taskDueReminders: taskDueReminders ?? false,
    dailyNoteNudge: dailyNoteNudge ?? false,
  });
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const { code } = await import("@/server/notifications/telegram-actions").then((m) =>
        m.generateTelegramLinkCodeAction(),
      );
      setLinkCode(code);
    } catch {
      toast.error("Failed to generate a linking code.");
    } finally {
      setGenerating(false);
    }
  };

  const unlink = async () => {
    if (!confirm("Disconnect Telegram from your account?")) return;
    setUnlinking(true);
    try {
      await import("@/server/notifications/telegram-actions").then((m) =>
        m.unlinkTelegramAction(),
      );
      setLinked(false);
      setLinkCode(null);
      toast.success("Telegram disconnected.");
    } catch {
      toast.error("Failed to disconnect Telegram.");
    } finally {
      setUnlinking(false);
    }
  };

  const savePrefs = async (next: typeof prefs) => {
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.updateUserSettingsAction({ notifications: next }),
      );
    } catch {
      toast.error("Failed to save notification preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <section className="surface-card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Notifications · Telegram</h2>
        <Link
          href="/help#telegram"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          How do I connect this? →
        </Link>
      </div>

      {linked ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            Your Telegram account is connected.
          </p>
          <Button variant="outline" size="sm" onClick={unlink} disabled={unlinking}>
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          {linkCode ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">
                Message your Telegram bot with:
              </p>
              <code className="w-fit rounded-md bg-background px-2 py-1 text-sm font-semibold">
                /start {linkCode}
              </code>
              <p className="text-xs text-muted-foreground">
                Code expires in 15 minutes.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Not connected. Generate a code to link your Telegram account.
            </p>
          )}
          <Button
            size="sm"
            className="mt-3"
            onClick={generateCode}
            disabled={generating}
          >
            {linkCode ? "Generate new code" : "Generate linking code"}
          </Button>
        </div>
      )}

      <div className="grid gap-2 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <NotificationToggle
          label="In-app activity"
          checked={prefs.inApp}
          disabled={savingPrefs}
          onChange={(v) => savePrefs({ ...prefs, inApp: v })}
        />
        <NotificationToggle
          label="AI action results"
          checked={prefs.aiResults}
          disabled={savingPrefs}
          onChange={(v) => savePrefs({ ...prefs, aiResults: v })}
        />
        <NotificationToggle
          label="Task due reminders"
          checked={prefs.taskDueReminders}
          disabled={savingPrefs}
          onChange={(v) => savePrefs({ ...prefs, taskDueReminders: v })}
        />
        <NotificationToggle
          label="Daily note nudge"
          checked={prefs.dailyNoteNudge}
          disabled={savingPrefs}
          onChange={(v) => savePrefs({ ...prefs, dailyNoteNudge: v })}
        />
      </div>
    </section>
  );
}

function NotificationToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Button
        variant="outline"
        size="sm"
        className="h-8 justify-start"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        {checked ? "On" : "Off"}
      </Button>
    </div>
  );
}

export function DangerZoneSection() {
  const [busy, setBusy] = React.useState(false);
  const onConfirm = async () => {
    if (!confirm("Permanently delete your account and all notes? This cannot be undone.")) return;
    setBusy(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.deleteAccountAction(),
      );
    } catch {
      toast.error("Failed to delete account.");
      setBusy(false);
    }
  };
  return (
    <section className="surface-card flex flex-col gap-3 border-destructive/40 bg-destructive/5 p-5">
      <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
      <p className="text-xs text-muted-foreground">
        Permanently delete your account and every note, task, tag, and attachment
        you own. This cannot be undone.
      </p>
      <Button
        variant="destructive"
        size="sm"
        onClick={onConfirm}
        disabled={busy}
        className="w-fit"
      >
        Delete account
      </Button>
    </section>
  );
}
