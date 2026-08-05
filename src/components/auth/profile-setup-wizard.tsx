"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Feather,
  BookOpen,
  Sparkles,
  Coffee,
  Compass,
  Laptop,
  Check,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Moon,
  Sun,
  Monitor,
  Type,
  Loader2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { completeProfileSetupAction } from "@/server/users/profile-actions";
import type { UserSettings } from "@/server/users/settings-service";

const PRESET_AVATARS = [
  { id: "feather", label: "Quill", icon: Feather, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { id: "book", label: "Scholar", icon: BookOpen, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { id: "sparkles", label: "Creative", icon: Sparkles, color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  { id: "coffee", label: "Focus", icon: Coffee, color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  { id: "compass", label: "Explorer", icon: Compass, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { id: "tech", label: "Builder", icon: Laptop, color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
];

const PRESET_ROLES = [
  "Writer & Author",
  "Researcher & Scholar",
  "Software Engineer",
  "Student & Academic",
  "Productivity Enthusiast",
  "Knowledge Worker",
];

export function ProfileSetupWizard({
  initialUser,
  initialWorkspaceName = "Personal Workspace",
  initialSettings,
}: {
  initialUser: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  initialWorkspaceName?: string;
  initialSettings?: UserSettings | null;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [name, setName] = React.useState(initialUser.name || "");
  const [selectedAvatar, setSelectedAvatar] = React.useState<string>(
    initialUser.image || "feather",
  );
  const [customAvatarUrl, setCustomAvatarUrl] = React.useState("");
  const [bio, setBio] = React.useState(initialSettings?.bio || "");
  const [workspaceName, setWorkspaceName] = React.useState(
    initialWorkspaceName || `${initialUser.name || "Personal"}'s Workspace`,
  );

  // Theme & Preferences
  const [themePreference, setThemePreference] = React.useState<
    "system" | "light" | "dark"
  >(initialSettings?.theme?.preference || "system");
  const [themePalette, setThemePalette] = React.useState<
    "paper" | "forest" | "violet"
  >(initialSettings?.theme?.palette || "paper");
  const [themeFont, setThemeFont] = React.useState<
    "sans" | "serif" | "mono" | "persian"
  >(initialSettings?.theme?.font || "sans");

  // Get active avatar icon component
  const activeAvatarObj = PRESET_AVATARS.find((a) => a.id === selectedAvatar);
  const ActiveIcon = activeAvatarObj?.icon || Feather;

  async function handleFinish() {
    if (!name.trim()) {
      toast.error("Please enter your display name.");
      setStep(1);
      return;
    }
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name.");
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const avatarValue = customAvatarUrl.trim() || selectedAvatar;
      const res = await completeProfileSetupAction({
        name,
        image: avatarValue,
        bio,
        workspaceName,
        themePreference,
        themePalette,
        themeFont,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Profile setup complete! Welcome to Inkest.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to complete profile setup.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Wizard Step Progress Header */}
      <div className="surface-card p-4 sm:p-5 flex items-center justify-between gap-2 shadow-xs border border-border/80 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-xs">
            {step}
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {step === 1 && "Step 1: Profile & Identity"}
              {step === 2 && "Step 2: Workspace & Aesthetics"}
              {step === 3 && "Step 3: Summary & Finish"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {step === 1 && "Tell us who you are and choose your avatar icon."}
              {step === 2 && "Customize your workspace name and visual palette."}
              {step === 3 && "Review your workspace settings before entering."}
            </p>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s as 1 | 2 | 3)}
              className={cn(
                "h-2 rounded-full transition-all",
                step === s
                  ? "w-7 bg-primary"
                  : step > s
                    ? "w-2.5 bg-primary/40"
                    : "w-2.5 bg-muted",
              )}
              aria-label={`Go to step ${s}`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="surface-card p-6 sm:p-8 shadow-sm border border-border/80 rounded-2xl flex flex-col gap-6">
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-98 duration-200">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Personal Information</h3>
              <p className="text-xs text-muted-foreground">
                This name and avatar will identify you inside your workspace.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName" className="text-xs font-semibold">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                required
                className="h-10"
              />
            </div>

            {/* Avatar Selector */}
            <div className="flex flex-col gap-3">
              <Label className="text-xs font-semibold">Choose Profile Avatar</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {PRESET_AVATARS.map((av) => {
                  const Icon = av.icon;
                  const isSelected = selectedAvatar === av.id && !customAvatarUrl;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(av.id);
                        setCustomAvatarUrl("");
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-102",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-border/80 bg-card hover:bg-muted/40",
                      )}
                    >
                      <span className={cn("flex size-9 items-center justify-center rounded-lg", av.color)}>
                        <Icon className="size-5" />
                      </span>
                      <span className="text-[11px] font-medium">{av.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Custom Avatar URL */}
              <div className="flex flex-col gap-1.5 pt-2">
                <Label htmlFor="customAvatar" className="text-[11px] text-muted-foreground">
                  Or enter custom image URL (optional)
                </Label>
                <Input
                  id="customAvatar"
                  type="url"
                  value={customAvatarUrl}
                  onChange={(e) => {
                    setCustomAvatarUrl(e.target.value);
                  }}
                  placeholder="https://example.com/my-avatar.png"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Role / Bio Selection */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-xs font-semibold">Select your primary role or bio</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBio(r)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                      bio === r
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/80 bg-muted/20 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Or type a custom bio tag..."
                className="h-9 text-xs mt-1"
                maxLength={200}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-98 duration-200">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Workspace & Aesthetic Setup</h3>
              <p className="text-xs text-muted-foreground">
                Configure your workspace name and typography to fit your style.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="wsName" className="text-xs font-semibold">
                Workspace Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="wsName"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Personal Workspace"
                  required
                  className="ps-9 h-10"
                />
              </div>
            </div>

            {/* Theme Preference Selection */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-xs font-semibold">Interface Mode</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "system", label: "System", icon: Monitor },
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = themePreference === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setThemePreference(item.id as "system" | "light" | "dark")}
                      className={cn(
                        "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 font-semibold"
                          : "border-border/80 bg-card hover:bg-muted/40 text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Palette Selection */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-xs font-semibold">Color Palette Accent</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "paper", label: "Paper Warm", desc: "Classic ink feel" },
                  { id: "forest", label: "Forest Emerald", desc: "Calm green tint" },
                  { id: "violet", label: "Violet Slate", desc: "Modern indigo" },
                ].map((p) => {
                  const active = themePalette === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setThemePalette(p.id as "paper" | "forest" | "violet")}
                      className={cn(
                        "flex flex-col text-start p-3 rounded-xl border transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/80 bg-card hover:bg-muted/40",
                      )}
                    >
                      <span className="text-xs font-semibold">{p.label}</span>
                      <span className="text-[11px] text-muted-foreground">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Selection */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-xs font-semibold">Writing Typography Font</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { id: "sans", label: "Sans-Serif", sample: "Geist Clean" },
                  { id: "serif", label: "Serif", sample: "Lora Editorial" },
                  { id: "mono", label: "Monospace", sample: "Geist Mono" },
                  { id: "persian", label: "Persian / Vazir", sample: "Vazirmatn" },
                ].map((f) => {
                  const active = themeFont === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setThemeFont(f.id as "sans" | "serif" | "mono" | "persian")}
                      className={cn(
                        "flex flex-col text-start p-3 rounded-xl border transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/80 bg-card hover:bg-muted/40",
                      )}
                    >
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Type className="size-3.5" />
                        {f.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{f.sample}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-98 duration-200">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Setup Complete!</h3>
              <p className="text-xs text-muted-foreground">
                Here is a preview of your newly configured profile card.
              </p>
            </div>

            {/* Live Profile Card Preview */}
            <div className="rounded-2xl border border-primary/20 bg-muted/30 p-5 flex flex-col gap-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {customAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={customAvatarUrl}
                      alt={name}
                      className="size-14 rounded-2xl object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex size-14 items-center justify-center rounded-2xl shadow-sm",
                        activeAvatarObj?.color || "bg-primary text-primary-foreground",
                      )}
                    >
                      <ActiveIcon className="size-7" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -end-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background">
                    <Check className="size-3" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold tracking-tight truncate">{name || "Your Name"}</h4>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      User Profile
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{initialUser.email}</p>
                  {bio && (
                    <p className="mt-1 text-xs font-medium text-primary">
                      {bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Workspace</span>
                  <span className="font-semibold">{workspaceName || "Personal Workspace"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Theme & Font</span>
                  <span className="font-semibold capitalize">
                    {themePreference} • {themePalette} • {themeFont}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>
                Your profile setup is complete. You can update these settings anytime from your Account Settings page.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-border/60 pt-5 mt-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              disabled={saving}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  toast.error("Please enter a display name.");
                  return;
                }
                if (step === 2 && !workspaceName.trim()) {
                  toast.error("Please enter a workspace name.");
                  return;
                }
                setStep((s) => (s + 1) as 1 | 2 | 3);
              }}
              className="gap-1.5 ml-auto"
            >
              Next Step
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void handleFinish()}
              disabled={saving}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm ml-auto"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Complete & Launch Workspace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
