"use client";

import * as React from "react";
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
  defaultMode,
  autosaveDelayMs,
  showLineNumbers,
}: {
  defaultMode?: "edit" | "split" | "preview" | "focus";
  autosaveDelayMs?: number;
  showLineNumbers?: boolean;
}) {
  const [mode, setMode] = React.useState(defaultMode ?? "edit");
  const [delay, setDelay] = React.useState(String(autosaveDelayMs ?? 1500));
  const [lineNumbers, setLineNumbers] = React.useState(!!showLineNumbers);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const delayMs = Math.max(0, Math.min(60_000, Number(delay) || 1500));
      await import("@/server/users/settings-actions").then((m) =>
        m.updateUserSettingsAction({
          editor: {
            defaultMode: mode,
            autosaveDelayMs: delayMs,
            showLineNumbers: lineNumbers,
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
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Default mode</Label>
          <Select value={mode} onValueChange={(v) => v && setMode(v as typeof mode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edit">Edit</SelectItem>
              <SelectItem value="split">Split</SelectItem>
              <SelectItem value="preview">Preview</SelectItem>
              <SelectItem value="focus">Focus</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      </div>
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
  apiKey,
  baseURL,
  model,
}: {
  provider?: AiProviderId;
  apiKey?: string;
  baseURL?: string;
  model?: string;
}) {
  const initialProvider = provider ?? "openai";
  const [selectedProvider, setSelectedProvider] =
    React.useState<AiProviderId>(initialProvider);
  const [key, setKey] = React.useState(apiKey ?? "");
  const [url, setUrl] = React.useState(baseURL ?? "");
  const [mdl, setMdl] = React.useState(model ?? "");
  const [saving, setSaving] = React.useState(false);
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
    setSaving(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.updateUserSettingsAction({
          ai: {
            provider: selectedProvider,
            apiKey: key.trim() || undefined,
            baseURL: url.trim() || undefined,
            model: mdl.trim() || undefined,
          },
        }),
      );
      toast.success("AI provider saved.");
    } catch {
      toast.error("Failed to save AI provider.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface-card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <AiBadge />
        <h2 className="text-sm font-semibold">AI provider</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Choose your provider and save your own API key. When these fields are
        left empty, the app falls back to the server environment variables. The
        key is stored locally in your self-hosted database.
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
          <Label className="text-xs text-muted-foreground">API key</Label>
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={providerDef.apiKeyPlaceholder}
            autoComplete="off"
          />
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
      <div>
        <Button size="sm" onClick={save} disabled={saving}>
          Save AI provider
        </Button>
      </div>
    </section>
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
