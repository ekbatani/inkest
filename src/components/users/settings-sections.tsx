"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparkles,
  User,
  Lock,
  Palette,
  Sliders,
  Bell,
  Send,
  Download,
  Check,
  Copy,
  Sun,
  Moon,
  Laptop,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Bot,
  Key,
  Terminal,
  BookOpen,
  Keyboard,
  ArrowRight,
  Type,
  FileText,
  LayoutGrid,
  Languages,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Trash2,
  Globe,
} from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";
import {
  AI_PROVIDERS,
  getAiProviderDefinition,
  type AiProviderId,
} from "@/lib/ai/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  PALETTES,
  FONTS,
} from "@/components/users/appearance-sync";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Appearance Live Preview Studio
// ---------------------------------------------------------------------------

export function AppearanceLivePreview({
  palette,
  font,
  theme,
}: {
  palette: AppearancePalette;
  font: AppearanceFont;
  theme: AppearanceTheme;
}) {
  const { resolvedTheme } = useTheme();
  const [userTab, setUserTab] = React.useState<"persian" | "english" | "ui" | null>(null);
  const [fontSize, setFontSize] = React.useState<"sm" | "base" | "lg">("base");
  const [forceDark, setForceDark] = React.useState<boolean | null>(null);

  const activeTab = userTab ?? (font.startsWith("persian") ? "persian" : "english");

  const fontDef = React.useMemo(
    () => FONTS.find((f) => f.id === font) ?? FONTS[0],
    [font],
  );
  const paletteDef = React.useMemo(
    () => PALETTES.find((p) => p.id === palette) ?? PALETTES[0],
    [palette],
  );

  const isDark = forceDark !== null
    ? forceDark
    : theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Appearance Studio · پیش‌نمایش زنده استایل
          </Label>
          <Badge variant="outline" className="text-[10px] font-normal py-0 h-5">
            {paletteDef.name} • {fontDef.nativeName || fontDef.name}
          </Badge>
        </div>

        {/* Preview quick tools */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                fontSize === "sm"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Small text"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                fontSize === "base"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Normal text"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                fontSize === "lg"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Large text"
            >
              A+
            </button>
          </div>

          {/* Quick theme toggle for preview */}
          <button
            type="button"
            onClick={() => setForceDark(!isDark)}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            title="Toggle preview light/dark mode"
          >
            {isDark ? (
              <>
                <Moon className="size-3 text-indigo-400" />
                <span>Dark View</span>
              </>
            ) : (
              <>
                <Sun className="size-3 text-amber-500" />
                <span>Light View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* The preview canvas */}
      <div
        data-palette={palette}
        data-font={font}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/80 shadow-md transition-all duration-200",
          isDark ? "dark bg-background text-foreground" : "bg-background text-foreground",
        )}
        style={{
          fontFamily: fontDef.fontFamily,
        }}
      >
        {/* Studio Window Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground ps-2">
              inkest-studio / {fontDef.id}.md
            </span>
          </div>

          {/* Preview Document View Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setUserTab("persian")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                activeTab === "persian"
                  ? "bg-background text-primary shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Languages className="size-3" />
              <span>فارسی (Persian)</span>
            </button>
            <button
              type="button"
              onClick={() => setUserTab("english")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                activeTab === "english"
                  ? "bg-background text-primary shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="size-3" />
              <span>English</span>
            </button>
            <button
              type="button"
              onClick={() => setUserTab("ui")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                activeTab === "ui"
                  ? "bg-background text-primary shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3" />
              <span>UI Studio</span>
            </button>
          </div>
        </div>

        {/* Studio Content Body */}
        <div
          className={cn(
            "p-5 sm:p-6 transition-all",
            fontSize === "sm" && "text-sm leading-relaxed",
            fontSize === "base" && "text-[15px] leading-relaxed",
            fontSize === "lg" && "text-base leading-loose",
          )}
        >
          {/* Persian Sample Document */}
          {activeTab === "persian" && (
            <article dir="rtl" className="flex flex-col gap-4 text-start font-normal animate-in fade-in duration-200">
              {/* Document Header */}
              <div className="border-b border-border/60 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    آخرین ویرایش: ۲ دقیقه پیش · ۴۲۵ کلمه
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      #معماری_فکر
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      #تایپوگرافی_آرام
                    </span>
                  </div>
                </div>
                <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  معماری تفکر — یادداشت‌های روزانه و آرامش ذهنی
                </h1>
              </div>

              {/* Prose Content */}
              <p className="text-foreground/90">
                نوشتن در محیطی آرام و بدون حواس‌پرتی، به ذهن اجازه می‌دهد افکار پراکنده را به بینش‌های ارزشمند و ساختاریافته تبدیل کند. با انتخاب قلم و پالت رنگی هماهنگ، تجربه مطالعه و نگارش متون طولانی لذت‌بخش و پایدار می‌شود.
              </p>

              {/* Literary Callout Quote */}
              <blockquote className="rounded-xl border-s-4 border-primary bg-primary/5 p-4 text-foreground/90 shadow-2xs">
                <p className="text-sm font-medium italic">
                  «درخت دوستی بنشان که کام دل به بار آرد / نهال دشمنی برکن که رنج بی‌شمار آرد»
                </p>
                <footer className="mt-1 text-xs text-primary font-semibold">
                  — دیوان حافظ شیرازی
                </footer>
              </blockquote>

              <div className="flex flex-col gap-2 pt-1">
                <h3 className="text-base font-semibold text-foreground">
                  برنامه‌ها و اقدامات کلیدی امروز:
                </h3>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground/85">
                  <li className="flex items-center gap-2">
                    <span className="flex size-4 items-center justify-center rounded bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                    <span className="line-through text-muted-foreground">
                      پیکربندی قلم‌های اصیل فارسی و هماهنگی تایپوگرافی راست‌به‌چپ
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex size-4 items-center justify-center rounded bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                    <span className="line-through text-muted-foreground">
                      تست استایل پالت‌های رنگی در حالت‌های روشن و تاریک
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-4 rounded border border-muted-foreground/60" />
                    <span>بازبینی ساختار یادداشت‌ها و مستندسازی ایده‌های نو</span>
                  </li>
                </ul>
              </div>

              {/* Code block in Persian note */}
              <div className="mt-2 rounded-xl border border-border/70 bg-card/80 p-3 font-mono text-xs text-foreground/90">
                <span className="text-primary font-semibold">const</span> workspace = inkest.<span className="text-amber-500">create</span>({`{`} font: <span className="text-emerald-500">{`"${fontDef.id}"`}</span>, calm: <span className="text-blue-500">true</span> {`}`});
              </div>
            </article>
          )}

          {/* English Sample Document */}
          {activeTab === "english" && (
            <article dir="ltr" className="flex flex-col gap-4 text-start font-normal animate-in fade-in duration-200">
              <div className="border-b border-border/60 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Last edited 2 min ago · 380 words · 2 min read
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      #architecture
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      #calm-software
                    </span>
                  </div>
                </div>
                <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  The Architecture of Mindful Writing
                </h1>
              </div>

              <p className="text-foreground/90">
                A calm, markdown-first workspace lets thinking breathe. When typography and color rhythm respect the flow of thought, ideas translate naturally into resilient knowledge graphs.
              </p>

              <blockquote className="rounded-xl border-s-4 border-primary bg-primary/5 p-4 text-foreground/90 shadow-2xs">
                <p className="text-sm font-medium italic">
                  “Simplicity is prerequisite for reliability. Complex systems always break down when you need them most.”
                </p>
                <footer className="mt-1 text-xs text-primary font-semibold">
                  — Edsger W. Dijkstra
                </footer>
              </blockquote>

              <div className="flex flex-col gap-2 pt-1">
                <h3 className="text-base font-semibold text-foreground">
                  Key Milestones & Focus Areas:
                </h3>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground/85">
                  <li className="flex items-center gap-2">
                    <span className="flex size-4 items-center justify-center rounded bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                    <span className="line-through text-muted-foreground">
                      Fine-tune typography metrics and letter spacing
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex size-4 items-center justify-center rounded bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                    <span className="line-through text-muted-foreground">
                      Harmonize contrast across all 8 interface palettes
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-4 rounded border border-muted-foreground/60" />
                    <span>Review daily reflections in quiet reader mode</span>
                  </li>
                </ul>
              </div>

              <div className="mt-2 rounded-xl border border-border/70 bg-card/80 p-3 font-mono text-xs text-foreground/90">
                <span className="text-primary font-semibold">import</span> {`{ renderNote }`} <span className="text-primary font-semibold">from</span> <span className="text-emerald-500">{`"@inkest/engine"`}</span>;
              </div>
            </article>
          )}

          {/* UI Studio Component Showcase */}
          {activeTab === "ui" && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Interface Components & Token Harmony
                </h3>
                <p className="text-xs text-muted-foreground">
                  See how primary accents, surfaces, badges, and controls adapt to this theme.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card/60 p-4">
                  <span className="text-xs font-semibold text-muted-foreground">Button Styles</span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="shadow-xs gap-1.5">
                      <Sparkles className="size-3.5" /> Primary Action
                    </Button>
                    <Button size="sm" variant="secondary">
                      Secondary
                    </Button>
                    <Button size="sm" variant="outline">
                      Outline
                    </Button>
                  </div>
                </div>

                {/* Badges & Status */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card/60 p-4">
                  <span className="text-xs font-semibold text-muted-foreground">Badges & Tags</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">Primary Badge</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Active Sync
                    </span>
                  </div>
                </div>

                {/* Input & Form Control */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card/60 p-4">
                  <span className="text-xs font-semibold text-muted-foreground">Interactive Input</span>
                  <Input placeholder="Quick search notes, tags, commands..." className="h-9 text-xs" />
                </div>

                {/* Switches & Toggles */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">Distraction Free Writing</span>
                    <span className="text-[11px] text-muted-foreground">Focus mode with dimmed chrome</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Studio Footer Metrics Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3 font-mono">
            <span>Font: <strong className="text-foreground font-sans">{fontDef.nativeName} ({fontDef.name})</strong></span>
            <span>·</span>
            <span>Palette: <strong className="text-foreground">{paletteDef.name}</strong></span>
            <span>·</span>
            <span>Mode: <strong className="text-foreground capitalize">{isDark ? "Dark" : "Light"}</strong></span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground/80">
            {fontDef.tag}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Appearance Section
// ---------------------------------------------------------------------------

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
  const [fontFilter, setFontFilter] = React.useState<"all" | "persian" | "latin">("all");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      setTheme(selectedTheme);
      applyAppearance({ palette: selectedPalette, font: selectedFont });
      await import("@/server/users/settings-actions").then((actions) =>
        actions.updateUserSettingsAction({
          theme: {
            preference: selectedTheme,
            palette: selectedPalette,
            font: selectedFont,
          },
        }),
      );
      toast.success("Appearance preferences saved.");
    } catch {
      toast.error("Failed to save appearance.");
    } finally {
      setSaving(false);
    }
  };

  const palettes = PALETTES;

  const themes: { id: AppearanceTheme; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "System", icon: <Laptop className="size-4" /> },
    { id: "light", label: "Light", icon: <Sun className="size-4" /> },
    { id: "dark", label: "Dark", icon: <Moon className="size-4" /> },
  ];

  const filteredFonts = React.useMemo(() => {
    if (fontFilter === "persian") return FONTS.filter((f) => f.category === "persian");
    if (fontFilter === "latin") return FONTS.filter((f) => f.category === "latin");
    return FONTS;
  }, [fontFilter]);

  return (
    <section className="surface-card flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Theme & Appearance</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Customize interface theme, palette accents, Persian and Latin typography, with real-time live preview.
          </p>
        </div>
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5 shadow-xs">
          {saving ? "Saving..." : "Save appearance"}
        </Button>
      </div>

      {/* Live Preview Studio */}
      <AppearanceLivePreview
        palette={selectedPalette}
        font={selectedFont}
        theme={selectedTheme}
      />

      <div className="flex flex-col gap-7 pt-2">
        {/* Color Mode */}
        <div className="flex flex-col gap-2.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Color Mode · تم محیط کاربری
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((item) => {
              const active = selectedTheme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTheme(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-xs font-medium transition-all",
                    active
                      ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                      : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Palette Swatches */}
        <div className="flex flex-col gap-2.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Color Palette · پالت رنگی و لهجه‌ها
          </Label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {palettes.map((p) => {
              const active = selectedPalette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPalette(p.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                      : "border-border/70 bg-card hover:bg-muted/30",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold">{p.name}</span>
                    {active && <Check className="size-3.5 text-primary" />}
                  </div>
                  <div
                    className={cn(
                      "flex h-7 w-full items-center gap-1.5 rounded-lg border px-2.5 shadow-2xs",
                      p.bgClass,
                      p.borderClass,
                    )}
                  >
                    <span className={cn("size-2.5 rounded-full", p.accentClass)} />
                    <span className="h-1.5 w-12 rounded-full bg-foreground/20" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Writing & Typography Font */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Typography & Font · قلم و تایپوگرافی
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                قلم مورد نظر خود را برای متون فارسی، مقالات لاتین و ویرایشگر انتخاب کنید.
              </p>
            </div>

            {/* Font category filter tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFontFilter("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                  fontFilter === "all"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                همه ({FONTS.length})
              </button>
              <button
                type="button"
                onClick={() => setFontFilter("persian")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                  fontFilter === "persian"
                    ? "bg-background text-primary shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>فارسی (Persian)</span>
                <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                  {FONTS.filter((f) => f.category === "persian").length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFontFilter("latin")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                  fontFilter === "latin"
                    ? "bg-background text-primary shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Latin / English</span>
                <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                  {FONTS.filter((f) => f.category === "latin").length}
                </span>
              </button>
            </div>
          </div>

          {/* Rich Font Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFonts.map((f) => {
              const active = selectedFont === f.id;
              const isPersian = f.category === "persian";
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFont(f.id)}
                  className={cn(
                    "flex flex-col justify-between gap-3 rounded-xl border p-4 text-start transition-all hover:border-primary/50",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                      : "border-border/70 bg-card hover:bg-muted/30",
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <Type className="size-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          {f.nativeName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          ({f.name})
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {f.tag}
                      </span>
                    </div>
                    {active && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                        <Check className="size-3" />
                      </span>
                    )}
                  </div>

                  {/* Sample glyph rendering in actual font */}
                  <div
                    className={cn(
                      "rounded-lg border border-border/50 bg-muted/20 p-2.5 text-foreground/90 transition-colors",
                      isPersian ? "text-right" : "text-left",
                    )}
                    dir={isPersian ? "rtl" : "ltr"}
                    style={{ fontFamily: f.fontFamily }}
                  >
                    <p className="text-sm font-medium line-clamp-1">
                      {f.sample}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                    {f.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Editor Preferences Section
// ---------------------------------------------------------------------------

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
    <section className="surface-card flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Editor Preferences</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure autosave intervals, line numbers, and spellcheck settings.
          </p>
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save editor prefs"}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Autosave Interval */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="autosave-delay" className="text-xs font-semibold">
              Autosave Delay
            </Label>
            <span className="text-xs font-mono text-muted-foreground">{delay} ms</span>
          </div>
          <Input
            id="autosave-delay"
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            type="number"
            min={0}
            max={60_000}
            step={250}
            className="h-9"
          />
          <p className="text-[11px] text-muted-foreground">
            Debounce delay before note edits are synced to the local database.
          </p>
        </div>

        {/* Writing Language */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
          <Label htmlFor="spellcheck-lang" className="text-xs font-semibold">
            Spellcheck Language
          </Label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as "auto" | "en" | "fa")}
            disabled={!spellcheckEnabled}
          >
            <SelectTrigger id="spellcheck-lang" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Browser default</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fa">Persian (Farsi)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Uses browser-native dictionary. Inkest never transmits text to AI for spellcheck.
          </p>
        </div>

        {/* Line Numbers Switch */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">Show Line Numbers</span>
            <span className="text-[11px] text-muted-foreground">
              Display line numbers in the markdown gutter.
            </span>
          </div>
          <Switch
            checked={lineNumbers}
            onCheckedChange={(checked) => setLineNumbers(checked)}
          />
        </div>

        {/* Spellcheck Switch */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">Browser Spellcheck</span>
            <span className="text-[11px] text-muted-foreground">
              Highlight typos directly inside the writing surface.
            </span>
          </div>
          <Switch
            checked={spellcheckEnabled}
            onCheckedChange={(checked) => setSpellcheckEnabled(checked)}
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Profile & Password Section
// ---------------------------------------------------------------------------

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
  const [confirmPw, setConfirmPw] = React.useState("");
  const [savingPw, setSavingPw] = React.useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfileAction(profileName);
      toast.success("Profile details updated.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!currentPw || !newPw) {
      toast.error("Please fill in current and new password.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      await changePasswordAction(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast.success("Password updated successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Details Card */}
      <section className="surface-card flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <User className="size-4 text-primary" />
              <h2 className="text-base font-semibold">User Profile</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage your personal workspace identity and email address.
            </p>
          </div>
          <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Email Address</Label>
            <Input value={email} readOnly disabled className="bg-muted/40" />
            <p className="text-[11px] text-muted-foreground">
              Your primary workspace login account.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name" className="text-xs font-medium text-muted-foreground">Display Name</Label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Your full name or handle"
            />
            <p className="text-[11px] text-muted-foreground">
              Shown across notes, journals, and export author tags.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          <div>
            <h3 className="text-xs font-semibold">Workspace Setup Wizard</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Revisit onboarding to configure themes, writing targets, and starter notes.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/onboarding" />}
            className="gap-1.5 shrink-0"
          >
            <Sparkles className="size-3.5 text-primary" /> Launch Wizard
          </Button>
        </div>
      </section>

      {/* Password Security Card */}
      <section className="surface-card flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Security & Password</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Update your account password. All passwords are encrypted with Argon2.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={savePassword}
            disabled={savingPw || !currentPw || !newPw || !confirmPw}
          >
            {savingPw ? "Updating..." : "Update password"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Current Password
            </Label>
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              New Password
            </Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Confirm New Password
            </Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Provider Section
// ---------------------------------------------------------------------------

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

    const isOpencodeUrl = (u: string) =>
      u.trim() === "https://opencode.ai" || u.trim().startsWith("https://opencode.ai/");

    if (
      !url.trim() ||
      url === currentDef.defaultBaseURL ||
      (isOpencodeUrl(url) && (nextProvider === "opencode" || nextProvider === "opencode-go"))
    ) {
      setUrl(nextDef.defaultBaseURL);
    }
    if (
      !mdl.trim() ||
      mdl === currentDef.defaultModel ||
      (selectedProvider === "opencode" && nextProvider === "opencode-go" && mdl === "deepseek-v4-flash-free") ||
      (selectedProvider === "opencode-go" && nextProvider === "opencode" && mdl === "deepseek-v4-flash")
    ) {
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
      toast.success("AI provider preferences saved.");
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
    <section className="surface-card flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <AiBadge />
            <h2 className="text-base font-semibold">AI Model & Provider</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure local or cloud LLM endpoints. Keys are encrypted at rest and never returned to the client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/docs/ai-assistant#ai-setup"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground mr-2"
          >
            Need a key? →
          </Link>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save AI provider"}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-xs">
        <ShieldCheck className="size-4 text-primary shrink-0" />
        <span className="flex-1 text-muted-foreground">
          {configurationSource === "user"
            ? "Using your custom saved API key. It is securely encrypted at rest."
            : configurationSource === "instance"
              ? "Using the server instance default AI provider. Add your own key below to override it."
              : "AI is currently unavailable: please add your own API key below to enable intelligent assistant features."}
        </span>
        <Badge variant={configurationSource === "unavailable" ? "outline" : "secondary"} className="shrink-0 text-[10px]">
          {configurationSource === "user" ? "User Override" : configurationSource === "instance" ? "Instance Default" : "Disabled"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Provider Select */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">AI Provider</Label>
          <Select
            value={selectedProvider}
            onValueChange={(value) => onProviderChange(value as AiProviderId)}
          >
            <SelectTrigger className="h-9 w-full">
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

        {/* API Key */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">
              API Key {hasApiKey ? "(Saved & Active)" : providerDef.apiKeyOptional ? "(Optional)" : ""}
            </Label>
            {hasApiKey && (
              <button
                type="button"
                onClick={removeSavedKey}
                disabled={removingKey}
                className="text-[11px] text-destructive hover:underline"
              >
                Clear key
              </button>
            )}
          </div>
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={providerDef.apiKeyPlaceholder}
            autoComplete="off"
            className="h-9"
          />
          {hasApiKey ? (
            <p className="text-[11px] text-muted-foreground">Leave blank to keep your current saved key.</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">Key is never exposed to browser logs or client bundles.</p>
          )}
        </div>

        {/* Base URL */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Base Endpoint URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={providerDef.defaultBaseURL}
            className="h-9"
          />
          <p className="text-[11px] text-muted-foreground">OpenAI-compatible chat completions endpoint.</p>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Model Identifier</Label>
          <Input
            value={mdl}
            onChange={(e) => setMdl(e.target.value)}
            placeholder={providerDef.defaultModel}
            className="h-9"
          />
          <p className="text-[11px] text-muted-foreground">e.g. gpt-4o, claude-3-7-sonnet, llama3.2:latest.</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AI Privacy Section
// ---------------------------------------------------------------------------

export function AiPrivacySection({ onboardingDismissed = false }: { onboardingDismissed?: boolean }) {
  const [dismissed, setDismissed] = React.useState(onboardingDismissed);
  const [saving, setSaving] = React.useState(false);

  const restoreGuide = async () => {
    setSaving(true);
    try {
      await import("@/server/users/settings-actions").then((actions) =>
        actions.restoreAiOnboardingAction(),
      );
      setDismissed(false);
      toast.success("AI quick guide will appear the next time you open AI assistance.");
    } catch {
      toast.error("Failed to restore the AI quick guide.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface-card flex flex-col gap-4 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">AI Privacy & Data Flow</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            AI features in Inkest are strictly opt-in and manual. Notes are only sent when you trigger an action or conversation.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/docs/ai-assistant#privacy"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground mr-2"
          >
            Read privacy doc
          </Link>
          {dismissed ? (
            <Button size="sm" variant="outline" onClick={restoreGuide} disabled={saving} className="gap-1.5">
              <RotateCcw className="size-3.5" /> Re-enable quick guide
            </Button>
          ) : (
            <Badge variant="secondary" className="gap-1 py-1 px-2 text-[11px]">
              <CheckCircle2 className="size-3 text-emerald-500" /> Guide Active
            </Badge>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AI Orchestration Section
// ---------------------------------------------------------------------------

export function AiOrchestrationSection({
  temperature = 0.4,
  minInputTokens = 0,
  maxInputTokens = 8_000,
  minOutputTokens = 0,
  maxOutputTokens = 1_200,
  instructions = "",
  guardrails = "",
  taskTimingPrompt = "",
  projectPlanningPrompt = "",
}: {
  temperature?: number;
  minInputTokens?: number;
  maxInputTokens?: number;
  minOutputTokens?: number;
  maxOutputTokens?: number;
  instructions?: string;
  guardrails?: string;
  taskTimingPrompt?: string;
  projectPlanningPrompt?: string;
}) {
  const [nextTemperature, setNextTemperature] = React.useState(String(temperature));
  const [nextMinInputTokens, setNextMinInputTokens] = React.useState(String(minInputTokens));
  const [nextMaxInputTokens, setNextMaxInputTokens] = React.useState(String(maxInputTokens));
  const [nextMinOutputTokens, setNextMinOutputTokens] = React.useState(String(minOutputTokens));
  const [nextMaxOutputTokens, setNextMaxOutputTokens] = React.useState(String(maxOutputTokens));
  const [nextInstructions, setNextInstructions] = React.useState(instructions);
  const [nextGuardrails, setNextGuardrails] = React.useState(guardrails);
  const [nextTaskTimingPrompt, setNextTaskTimingPrompt] = React.useState(taskTimingPrompt);
  const [nextProjectPlanningPrompt, setNextProjectPlanningPrompt] = React.useState(projectPlanningPrompt);
  const [saving, setSaving] = React.useState(false);

  const tempPresets = [
    { label: "Precise", value: 0.2 },
    { label: "Balanced", value: 0.4 },
    { label: "Creative", value: 0.7 },
    { label: "Expressive", value: 1.0 },
  ];

  const save = async () => {
    const parsedTemp = Number(nextTemperature);
    const parsedMinIn = Number(nextMinInputTokens);
    const parsedMaxIn = Number(nextMaxInputTokens);
    const parsedMinOut = Number(nextMinOutputTokens);
    const parsedMaxOut = Number(nextMaxOutputTokens);

    if (!Number.isFinite(parsedTemp) || parsedTemp < 0 || parsedTemp > 2) {
      toast.error("Temperature must be a number between 0 and 2.");
      return;
    }
    if (!Number.isInteger(parsedMinIn) || parsedMinIn < 0 || parsedMinIn > 32_768) {
      toast.error("Min input tokens must be a whole number between 0 and 32,768.");
      return;
    }
    if (!Number.isInteger(parsedMaxIn) || parsedMaxIn < 64 || parsedMaxIn > 128_000) {
      toast.error("Max input tokens must be a whole number between 64 and 128,000.");
      return;
    }
    if (parsedMaxIn < parsedMinIn) {
      toast.error("Max input tokens must be greater than or equal to min input tokens.");
      return;
    }
    if (!Number.isInteger(parsedMinOut) || parsedMinOut < 0 || parsedMinOut > 8_192) {
      toast.error("Min output tokens must be a whole number between 0 and 8,192.");
      return;
    }
    if (!Number.isInteger(parsedMaxOut) || parsedMaxOut < 16 || parsedMaxOut > 32_768) {
      toast.error("Max output tokens must be a whole number between 16 and 32,768.");
      return;
    }
    if (parsedMaxOut < parsedMinOut) {
      toast.error("Max output tokens must be greater than or equal to min output tokens.");
      return;
    }

    setSaving(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.updateAiOrchestrationSettingsAction({
          temperature: parsedTemp,
          minInputTokens: parsedMinIn,
          maxInputTokens: parsedMaxIn,
          minOutputTokens: parsedMinOut,
          maxOutputTokens: parsedMaxOut,
          instructions: nextInstructions.trim(),
          guardrails: nextGuardrails.trim(),
          taskTimingPrompt: nextTaskTimingPrompt.trim(),
          projectPlanningPrompt: nextProjectPlanningPrompt.trim(),
        }),
      );
      toast.success("AI orchestration settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save AI orchestration settings.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.resetAiOrchestrationSettingsAction(),
      );
      setNextTemperature("0.4");
      setNextMinInputTokens("0");
      setNextMaxInputTokens("8000");
      setNextMinOutputTokens("0");
      setNextMaxOutputTokens("1200");
      setNextInstructions("");
      setNextGuardrails("");
      setNextTaskTimingPrompt("");
      setNextProjectPlanningPrompt("");
      toast.success("AI orchestration controls reset to defaults.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset AI controls.");
    } finally {
      setSaving(false);
    }
  };

  const currentTempNum = Number(nextTemperature);

  return (
    <section className="surface-card flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <h2 className="text-base font-semibold">AI Orchestration & Parameters</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure per-user temperature, token budgets, timing heuristics prompts, and safety guardrails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={reset} disabled={saving}>
            Reset defaults
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save orchestration"}
          </Button>
        </div>
      </div>

      {/* Temperature */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="ai-temperature" className="text-xs font-semibold">
              Sampling Temperature
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Controls output randomness and creativity. Lower values are more deterministic and focused.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {tempPresets.map((p) => {
                const isSelected = Math.abs(currentTempNum - p.value) < 0.05;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setNextTemperature(String(p.value))}
                    className={cn(
                      "rounded-lg px-2 py-1 text-[11px] font-medium transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.label} ({p.value})
                  </button>
                );
              })}
            </div>
            <Input
              id="ai-temperature"
              type="number"
              min="0"
              max="2"
              step="0.05"
              value={nextTemperature}
              onChange={(e) => setNextTemperature(e.target.value)}
              className="h-8 w-20 text-center font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Token Budgets (Min & Max Input/Output) */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Input Tokens Group */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
          <div>
            <h4 className="text-xs font-semibold">Input Token Limits</h4>
            <p className="text-[11px] text-muted-foreground">
              Context window allocation for prompts, notes, and attachments.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-min-input" className="text-[11px] font-medium text-muted-foreground">
                Min Input Tokens
              </Label>
              <Input
                id="ai-min-input"
                type="number"
                min="0"
                max="32768"
                step="100"
                value={nextMinInputTokens}
                onChange={(e) => setNextMinInputTokens(e.target.value)}
                className="h-9 font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground">0 = no minimum required</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-max-input" className="text-[11px] font-medium text-muted-foreground">
                Max Input Tokens
              </Label>
              <Input
                id="ai-max-input"
                type="number"
                min="64"
                max="128000"
                step="500"
                value={nextMaxInputTokens}
                onChange={(e) => setNextMaxInputTokens(e.target.value)}
                className="h-9 font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground">Context truncation ceiling</span>
            </div>
          </div>
        </div>

        {/* Output Tokens Group */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
          <div>
            <h4 className="text-xs font-semibold">Output Token Limits</h4>
            <p className="text-[11px] text-muted-foreground">
              Completion length limits for generation, summary, and action responses.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-min-output" className="text-[11px] font-medium text-muted-foreground">
                Min Output Tokens
              </Label>
              <Input
                id="ai-min-output"
                type="number"
                min="0"
                max="8192"
                step="100"
                value={nextMinOutputTokens}
                onChange={(e) => setNextMinOutputTokens(e.target.value)}
                className="h-9 font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground">Target minimum response length</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-max-output" className="text-[11px] font-medium text-muted-foreground">
                Max Output Tokens
              </Label>
              <Input
                id="ai-max-output"
                type="number"
                min="16"
                max="32768"
                step="100"
                value={nextMaxOutputTokens}
                onChange={(e) => setNextMaxOutputTokens(e.target.value)}
                className="h-9 font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground">Hard cap on completion length</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Timing & Project Planning Heuristics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-task-timing-prompt" className="text-xs font-semibold text-foreground">
              Task Timing & Due Date Prompt
            </Label>
            <span className="text-[11px] text-muted-foreground">{nextTaskTimingPrompt.length}/4000</span>
          </div>
          <Textarea
            id="ai-task-timing-prompt"
            value={nextTaskTimingPrompt}
            maxLength={4000}
            rows={5}
            onChange={(event) => setNextTaskTimingPrompt(event.target.value)}
            placeholder="e.g. Schedule urgent tasks within 1-2 days, medium priority within 1 week, and low priority within 2-3 weeks. Do not assign weekends as due dates."
            className="text-xs leading-relaxed font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Custom rules and timing heuristics used by AI when extracting tasks and calculating start and due dates. Leave blank to use defaults.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-project-planning-prompt" className="text-xs font-semibold text-foreground">
              Project Planning Roadmap Prompt
            </Label>
            <span className="text-[11px] text-muted-foreground">{nextProjectPlanningPrompt.length}/4000</span>
          </div>
          <Textarea
            id="ai-project-planning-prompt"
            value={nextProjectPlanningPrompt}
            maxLength={4000}
            rows={5}
            onChange={(event) => setNextProjectPlanningPrompt(event.target.value)}
            placeholder="e.g. Break projects into 3-4 distinct milestones spanning 2-6 weeks. Ensure every milestone has concrete delivery criteria."
            className="text-xs leading-relaxed font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Guidelines and milestone duration heuristics for project roadmap generation.
          </p>
        </div>
      </div>

      {/* Instructions & Guardrails */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-instructions" className="text-xs font-medium text-muted-foreground">
              Personal System Instructions
            </Label>
            <span className="text-[11px] text-muted-foreground">{nextInstructions.length}/4000</span>
          </div>
          <Textarea
            id="ai-instructions"
            value={nextInstructions}
            maxLength={4000}
            rows={5}
            onChange={(event) => setNextInstructions(event.target.value)}
            placeholder="e.g. Prefer concise, direct language. Use bulleted Markdown for summaries. Maintain a supportive editorial tone."
            className="text-xs leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">
            Appended to system prompts on every AI request, tuning formatting and tone to your workflow.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-guardrails" className="text-xs font-medium text-muted-foreground">
              Custom Safety Guardrails & Constraints
            </Label>
            <span className="text-[11px] text-muted-foreground">{nextGuardrails.length}/4000</span>
          </div>
          <Textarea
            id="ai-guardrails"
            value={nextGuardrails}
            maxLength={4000}
            rows={5}
            onChange={(event) => setNextGuardrails(event.target.value)}
            placeholder="e.g. Never invent unverified dates or facts. Do not delete existing code blocks when refactoring notes. Add uncertainty flags when ambiguous."
            className="text-xs leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">
            Strict negative constraints and safety rules that the AI must never violate.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Agent Harness & External Integration Section (Hermes, OpenClaw)
// ---------------------------------------------------------------------------

export function AgentHarnessSection({
  enabled = true,
  apiToken = "",
  maxLoopSteps = 6,
  allowModifyNotes = true,
  allowCreateTasks = true,
}: {
  enabled?: boolean;
  apiToken?: string;
  maxLoopSteps?: number;
  allowModifyNotes?: boolean;
  allowCreateTasks?: boolean;
}) {
  const [isEnabled, setIsEnabled] = React.useState(enabled);
  const [token, setToken] = React.useState(apiToken);
  const [steps, setSteps] = React.useState(maxLoopSteps);
  const [canModify, setCanModify] = React.useState(allowModifyNotes);
  const [canTasks, setCanTasks] = React.useState(allowCreateTasks);
  const [generating, setGenerating] = React.useState(false);
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [copiedHermes, setCopiedHermes] = React.useState(false);
  const [copiedOpenClaw, setCopiedOpenClaw] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const generateToken = async () => {
    setGenerating(true);
    try {
      const { generateAgentTokenAction } = await import("@/server/agent/actions");
      const { token: newToken } = await generateAgentTokenAction();
      setToken(newToken);
      toast.success("New Agent API Token generated!");
    } catch {
      toast.error("Failed to generate Agent API token.");
    } finally {
      setGenerating(false);
    }
  };

  const revokeToken = async () => {
    if (!confirm("Revoke this Agent API token? Connected harnesses will lose access immediately.")) return;
    try {
      const { clearAgentTokenAction } = await import("@/server/agent/actions");
      await clearAgentTokenAction();
      setToken("");
      toast.success("Agent API Token revoked.");
    } catch {
      toast.error("Failed to revoke Agent API token.");
    }
  };

  const savePreferences = async (patch: {
    enabled?: boolean;
    maxLoopSteps?: number;
    allowModifyNotes?: boolean;
    allowCreateTasks?: boolean;
  }) => {
    setSaving(true);
    try {
      await import("@/server/users/settings-actions").then((m) =>
        m.updateUserSettingsAction({
          agentHarness: {
            enabled: patch.enabled ?? isEnabled,
            maxLoopSteps: patch.maxLoopSteps ?? steps,
            allowModifyNotes: patch.allowModifyNotes ?? canModify,
            allowCreateTasks: patch.allowCreateTasks ?? canTasks,
          },
        }),
      );
      toast.success("Agent harness preferences saved.");
    } catch {
      toast.error("Failed to save agent harness settings.");
    } finally {
      setSaving(false);
    }
  };

  const copyText = (text: string, setter: (val: boolean) => void) => {
    void navigator.clipboard.writeText(text);
    setter(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setter(false), 2000);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const hermesCmd = `hermes run --tools ${origin}/api/agent/v1/tools?format=hermes --header "Authorization: Bearer ${token || "<YOUR_AGENT_TOKEN>"}"`;
  const openclawCmd = `openclaw connect --endpoint ${origin}/api/agent/v1/execute --token "${token || "<YOUR_AGENT_TOKEN>"}"`;

  return (
    <section className="surface-card flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Agent Harness & External Integrations</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect external autonomous agent harnesses such as <strong>Hermes</strong> and <strong>OpenClaw</strong> / <strong>OpenHands</strong> to this workspace.
          </p>
        </div>
        <Badge variant={token ? "secondary" : "outline"} className="text-[10px]">
          {token ? "Harness Ready" : "Unconnected"}
        </Badge>
      </div>

      {/* Token & Authentication */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold">Agent API Token</h4>
              <p className="text-[11px] text-muted-foreground">
                Bearer token used by Hermes and OpenClaw CLI harnesses to authenticate against your workspace.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {token ? (
              <Button size="sm" variant="outline" onClick={revokeToken} className="text-destructive hover:bg-destructive/10">
                Revoke Token
              </Button>
            ) : (
              <Button size="sm" onClick={generateToken} disabled={generating}>
                {generating ? "Generating..." : "Generate Agent Token"}
              </Button>
            )}
          </div>
        </div>

        {token && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 mt-1">
            <code className="flex-1 font-mono text-xs text-primary truncate">
              {token}
            </code>
            <Button
              size="xs"
              variant="outline"
              onClick={() => copyText(token, setCopiedToken)}
              className="gap-1 h-7 px-2 text-[10px]"
            >
              {copiedToken ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copiedToken ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>

      {/* Harness Integration Quick Connects */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Hermes Harness */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Terminal className="size-3.5 text-primary" /> Hermes Agent Harness
            </span>
            <button
              type="button"
              onClick={() => copyText(hermesCmd, setCopiedHermes)}
              className="text-[10px] text-primary hover:underline"
            >
              {copiedHermes ? "Copied Command" : "Copy Command"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Auto-discovers tools via <code>/api/agent/v1/tools?format=hermes</code>.
          </p>
          <pre className="mt-1 rounded-lg border bg-background/80 p-2.5 font-mono text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
            {hermesCmd}
          </pre>
        </div>

        {/* OpenClaw Harness */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Terminal className="size-3.5 text-primary" /> OpenClaw / OpenHands Harness
            </span>
            <button
              type="button"
              onClick={() => copyText(openclawCmd, setCopiedOpenClaw)}
              className="text-[10px] text-primary hover:underline"
            >
              {copiedOpenClaw ? "Copied Command" : "Copy Command"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Executes autonomous steps via <code>/api/agent/v1/execute</code>.
          </p>
          <pre className="mt-1 rounded-lg border bg-background/80 p-2.5 font-mono text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
            {openclawCmd}
          </pre>
        </div>
      </div>

      {/* Autonomous Permissions & Harness Controls */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">Enable Agent Harness</span>
            <span className="text-[11px] text-muted-foreground">
              Allow external agent harnesses to connect to this workspace.
            </span>
          </div>
          <Switch
            checked={isEnabled}
            disabled={saving}
            onCheckedChange={(checked) => {
              setIsEnabled(checked);
              void savePreferences({ enabled: checked });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">Max Loop Steps</span>
            <span className="text-[11px] text-muted-foreground">
              Limit continuous automated tool execution cycles (default: {steps}).
            </span>
          </div>
          <input
            type="number"
            min={1}
            max={50}
            value={steps}
            disabled={saving}
            onChange={(e) => {
              const val = Number(e.target.value) || 10;
              setSteps(val);
              void savePreferences({ maxLoopSteps: val });
            }}
            className="w-16 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-right font-medium"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">Allow Note Modifications</span>
            <span className="text-[11px] text-muted-foreground">
              Permit agents to update note bodies and append content.
            </span>
          </div>
          <Switch
            checked={canModify}
            disabled={saving}
            onCheckedChange={(checked) => {
              setCanModify(checked);
              void savePreferences({ allowModifyNotes: checked });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">Allow Task Generation</span>
            <span className="text-[11px] text-muted-foreground">
              Permit agents to create and update actionable tasks.
            </span>
          </div>
          <Switch
            checked={canTasks}
            disabled={saving}
            onCheckedChange={(checked) => {
              setCanTasks(checked);
              void savePreferences({ allowCreateTasks: checked });
            }}
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Notifications & Telegram Section
// ---------------------------------------------------------------------------

export function NotificationsSection({
  initialLinked,
  initialChatId,
  telegramSettings,
  inApp,
  aiResults,
  taskDueReminders,
  dailyNoteNudge,
}: {
  initialLinked: boolean;
  initialChatId?: string | null;
  telegramSettings?: {
    botToken?: string;
    botUsername?: string;
    botName?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    webhookConfiguredAt?: number;
  };
  inApp?: boolean;
  aiResults?: boolean;
  taskDueReminders?: boolean;
  dailyNoteNudge?: boolean;
}) {
  const [linked, setLinked] = React.useState(initialLinked);
  const [chatId, setChatId] = React.useState<string | null>(initialChatId ?? null);

  // Bot Token state
  const [botTokenInput, setBotTokenInput] = React.useState(telegramSettings?.botToken ?? "");
  const [showBotToken, setShowBotToken] = React.useState(false);
  const [hasCustomBot, setHasCustomBot] = React.useState(Boolean(telegramSettings?.botToken));
  const [botUsername, setBotUsername] = React.useState<string | null>(telegramSettings?.botUsername ?? null);
  const [botName, setBotName] = React.useState<string | null>(telegramSettings?.botName ?? null);
  const [isEditingToken, setIsEditingToken] = React.useState(!telegramSettings?.botToken);
  const [savingToken, setSavingToken] = React.useState(false);
  const [removingBot, setRemovingBot] = React.useState(false);

  // Webhook state
  const [webhookConfigured, setWebhookConfigured] = React.useState(
    Boolean(telegramSettings?.webhookConfiguredAt || telegramSettings?.webhookUrl),
  );
  const [registeredWebhookUrl, setRegisteredWebhookUrl] = React.useState(telegramSettings?.webhookUrl ?? "");
  const [customWebhookUrl, setCustomWebhookUrl] = React.useState("");
  const [showCustomUrlInput, setShowCustomUrlInput] = React.useState(false);
  const [registeringWebhook, setRegisteringWebhook] = React.useState(false);
  const [checkingWebhook, setCheckingWebhook] = React.useState(false);
  const [webhookInfo, setWebhookInfo] = React.useState<{
    url: string;
    pendingUpdateCount: number;
    lastErrorMessage?: string;
  } | null>(null);

  // Pairing state
  const [linkCode, setLinkCode] = React.useState<string | null>(null);
  const [deepLink, setDeepLink] = React.useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = React.useState(false);
  const [unlinking, setUnlinking] = React.useState(false);
  const [sendingTest, setSendingTest] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Notification prefs state
  const [prefs, setPrefs] = React.useState({
    inApp: inApp ?? true,
    aiResults: aiResults ?? true,
    taskDueReminders: taskDueReminders ?? false,
    dailyNoteNudge: dailyNoteNudge ?? false,
  });
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  const defaultClientWebhookUrl = React.useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/telegram/webhook`;
    }
    return "";
  }, []);

  const saveBotToken = async () => {
    if (!botTokenInput.trim()) {
      toast.error("Please enter a valid Telegram Bot Token.");
      return;
    }
    setSavingToken(true);
    try {
      const { saveTelegramBotTokenAction } = await import("@/server/notifications/telegram-actions");
      const result = await saveTelegramBotTokenAction(botTokenInput.trim());
      if (result.ok) {
        setHasCustomBot(true);
        setBotUsername(result.bot.username ?? null);
        setBotName(result.bot.firstName ?? null);
        setIsEditingToken(false);
        toast.success(`Connected to bot ${result.bot.username ? `@${result.bot.username}` : result.bot.firstName}!`);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bot token.");
    } finally {
      setSavingToken(false);
    }
  };

  const removeBot = async () => {
    if (!confirm("Are you sure you want to remove this Telegram bot configuration?")) return;
    setRemovingBot(true);
    try {
      const { removeTelegramBotTokenAction } = await import("@/server/notifications/telegram-actions");
      await removeTelegramBotTokenAction();
      setHasCustomBot(false);
      setBotTokenInput("");
      setBotUsername(null);
      setBotName(null);
      setWebhookConfigured(false);
      setRegisteredWebhookUrl("");
      setIsEditingToken(true);
      toast.success("Telegram bot removed.");
    } catch {
      toast.error("Failed to remove bot.");
    } finally {
      setRemovingBot(false);
    }
  };

  const registerWebhook = async () => {
    setRegisteringWebhook(true);
    try {
      const { registerTelegramWebhookAction } = await import("@/server/notifications/telegram-actions");
      const targetUrl = showCustomUrlInput && customWebhookUrl.trim() ? customWebhookUrl.trim() : undefined;
      const result = await registerTelegramWebhookAction({ customWebhookUrl: targetUrl });
      if (result.ok) {
        setWebhookConfigured(true);
        setRegisteredWebhookUrl(result.webhookUrl);
        toast.success("Webhook registered with Telegram successfully!");
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register webhook.");
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const checkWebhookStatus = async () => {
    setCheckingWebhook(true);
    try {
      const { getTelegramWebhookStatusAction } = await import("@/server/notifications/telegram-actions");
      const result = await getTelegramWebhookStatusAction();
      if (result.ok) {
        setWebhookInfo({
          url: result.info.url,
          pendingUpdateCount: result.info.pendingUpdateCount,
          lastErrorMessage: result.info.lastErrorMessage,
        });
        toast.success("Webhook status updated from Telegram.");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to check webhook status.");
    } finally {
      setCheckingWebhook(false);
    }
  };

  const generateCode = async () => {
    setGeneratingCode(true);
    try {
      const { generateTelegramLinkCodeAction } = await import("@/server/notifications/telegram-actions");
      const result = await generateTelegramLinkCodeAction();
      setLinkCode(result.code);
      setDeepLink(result.deepLink);
    } catch {
      toast.error("Failed to generate a linking code.");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(`/start ${code}`);
    setCopied(true);
    toast.success("Command copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const unlink = async () => {
    if (!confirm("Disconnect your Telegram account from this workspace?")) return;
    setUnlinking(true);
    try {
      const { unlinkTelegramAction } = await import("@/server/notifications/telegram-actions");
      await unlinkTelegramAction();
      setLinked(false);
      setChatId(null);
      setLinkCode(null);
      setDeepLink(null);
      toast.success("Telegram account disconnected.");
    } catch {
      toast.error("Failed to disconnect Telegram.");
    } finally {
      setUnlinking(false);
    }
  };

  const sendTestNotification = async () => {
    setSendingTest(true);
    try {
      const { sendTelegramTestAction } = await import("@/server/notifications/telegram-actions");
      const result = await sendTelegramTestAction();
      if (result.ok) {
        toast.success("Test notification sent! Check your Telegram chat.");
      } else {
        toast.error(result.error || "Failed to deliver test notification.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test notification.");
    } finally {
      setSendingTest(false);
    }
  };

  const savePrefs = async (next: typeof prefs) => {
    setPrefs(next);
    setSavingPrefs(true);
    try {
      const { updateUserSettingsAction } = await import("@/server/users/settings-actions");
      await updateUserSettingsAction({ notifications: next });
      toast.success("Preferences updated.");
    } catch {
      toast.error("Failed to save notification preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Bot Configuration Card */}
      <section className="surface-card flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              <h2 className="text-base font-semibold">1. Telegram Bot Configuration</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Provide your Telegram bot API token so Inkest can deliver push notifications and handle remote commands.
            </p>
          </div>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary underline underline-offset-4 hover:text-foreground shrink-0"
          >
            <span>Create via @BotFather</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {hasCustomBot && !isEditingToken ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-foreground">
                    {botName || "Custom Bot"}
                  </h4>
                  {botUsername && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      @{botUsername}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Token Saved
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Your custom bot credentials are encrypted at rest.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingToken(true)}
                className="text-xs h-8"
              >
                Change Token
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={removeBot}
                disabled={removingBot}
                className="text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
              >
                <Trash2 className="size-3.5" />
                <span>{removingBot ? "Removing..." : "Remove"}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 rounded-xl border border-border/70 bg-card/60 p-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Bot API Token
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Copy the HTTP API token from @BotFather after creating your bot.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showBotToken ? "text" : "password"}
                  value={botTokenInput}
                  onChange={(e) => setBotTokenInput(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowBotToken(!showBotToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={showBotToken ? "Hide token" : "Show token"}
                >
                  {showBotToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={saveBotToken}
                  disabled={savingToken || !botTokenInput.trim()}
                  className="h-9 gap-1.5"
                >
                  <Key className="size-3.5" />
                  <span>{savingToken ? "Validating & Saving..." : "Save Bot Token"}</span>
                </Button>
                {hasCustomBot && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingToken(false)}
                    className="h-9 text-xs"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Automated Webhook Registration Card */}
      <section className="surface-card flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <h2 className="text-base font-semibold">2. Webhook Registration</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect Telegram servers directly to your Inkest instance with 1-click — no terminal or curl command needed.
            </p>
          </div>
          <Badge
            variant={webhookConfigured ? "default" : "outline"}
            className={cn(
              "text-[10px] shrink-0",
              webhookConfigured
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "text-amber-600 border-amber-500/40 bg-amber-500/10",
            )}
          >
            {webhookConfigured ? "Webhook Active" : "Not Registered"}
          </Badge>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-semibold text-foreground">
                One-Click Webhook Sync
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {registeredWebhookUrl
                  ? `Registered at: ${registeredWebhookUrl}`
                  : "Registers this Inkest instance endpoint directly with the Telegram Bot API."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={registerWebhook}
                disabled={registeringWebhook || !hasCustomBot}
                className="gap-1.5 h-8.5"
              >
                <RefreshCw className={cn("size-3.5", registeringWebhook && "animate-spin")} />
                <span>{registeringWebhook ? "Registering..." : "Register Webhook"}</span>
              </Button>
              {webhookConfigured && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkWebhookStatus}
                  disabled={checkingWebhook}
                  className="h-8.5 text-xs"
                >
                  {checkingWebhook ? "Checking..." : "Check Status"}
                </Button>
              )}
            </div>
          </div>

          {/* Optional Custom Webhook URL Toggle */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                className="text-[11px] font-medium text-primary hover:underline text-left"
              >
                {showCustomUrlInput ? "− Hide custom URL options" : "+ Advanced: Custom Webhook URL (Reverse proxy / ngrok)"}
              </button>
            </div>

            {showCustomUrlInput && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                <Label className="text-[11px] text-muted-foreground">
                  Custom Webhook Endpoint (must be HTTPS)
                </Label>
                <Input
                  type="url"
                  value={customWebhookUrl}
                  onChange={(e) => setCustomWebhookUrl(e.target.value)}
                  placeholder={defaultClientWebhookUrl || "https://your-domain.com/api/telegram/webhook"}
                  className="h-8 text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Webhook live diagnostic feedback */}
          {webhookInfo && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] flex flex-col gap-1">
              <span className="font-semibold text-foreground">Telegram Webhook Diagnostics:</span>
              <span className="text-muted-foreground font-mono">Endpoint: {webhookInfo.url || "None"}</span>
              <span className="text-muted-foreground">Pending updates in queue: {webhookInfo.pendingUpdateCount}</span>
              {webhookInfo.lastErrorMessage && (
                <span className="text-destructive">Last Telegram error: {webhookInfo.lastErrorMessage}</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3. Account Pairing Card */}
      <section className="surface-card flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Send className="size-4 text-primary" />
              <h2 className="text-base font-semibold">3. Telegram Account Pairing</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bind your personal Telegram account to this workspace to receive reminders and AI task updates.
            </p>
          </div>
          <Link
            href="/docs/telegram"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground shrink-0"
          >
            Setup Guide →
          </Link>
        </div>

        {linked ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Check className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Connected to Telegram</h4>
                <p className="text-[11px] text-muted-foreground">
                  {chatId ? `Linked to Chat ID: ${chatId}` : "Your Telegram chat is paired with this workspace."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestNotification}
                disabled={sendingTest}
                className="h-8 text-xs gap-1.5"
              >
                <Send className="size-3.5" />
                <span>{sendingTest ? "Sending..." : "Send Test Ping"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={unlink}
                disabled={unlinking}
                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {unlinking ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Not Connected</h4>
                <p className="text-[11px] text-muted-foreground">
                  Generate a temporary 15-minute pairing code to link your Telegram chat.
                </p>
              </div>
              <Button
                size="sm"
                onClick={generateCode}
                disabled={generatingCode}
                className="shrink-0 h-8.5"
              >
                {generatingCode ? "Generating..." : linkCode ? "Generate new code" : "Generate Pairing Code"}
              </Button>
            </div>

            {linkCode && (
              <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 animate-in fade-in duration-200">
                <p className="text-xs font-medium text-foreground">
                  Complete pairing using either of the following methods:
                </p>

                {/* Method A: One-click deep link */}
                {deepLink && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/80 p-3">
                    <span className="text-[11px] font-semibold text-primary">Method 1 (Fastest — 1 Click):</span>
                    <a
                      href={deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                    >
                      <Send className="size-3.5" />
                      <span>Open in Telegram & Press Start</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {/* Method B: Manual code copy */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/80 p-3">
                  <span className="text-[11px] font-semibold text-muted-foreground">Method 2 (Manual Copy):</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-1.5 font-mono text-xs font-semibold text-primary border">
                      /start {linkCode}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyCode(linkCode)}
                      className="gap-1.5 shrink-0 h-8"
                    >
                      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <span className="text-[11px] text-muted-foreground">
                  Expires in 15 minutes. Once you tap Start in Telegram, refresh this page to see the active connection.
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Notification Preferences Card */}
      <section className="surface-card flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Notification Channels</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Select which events send in-app alerts and Telegram push reminders.
            </p>
          </div>
          {savingPrefs && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Saving...
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NotificationSwitchItem
            label="In-App Activity"
            desc="Show live activity badges and toast updates."
            checked={prefs.inApp}
            disabled={savingPrefs}
            onChange={(v) => savePrefs({ ...prefs, inApp: v })}
          />
          <NotificationSwitchItem
            label="AI Action Results"
            desc="Notify when background AI summaries and plans finish."
            checked={prefs.aiResults}
            disabled={savingPrefs}
            onChange={(v) => savePrefs({ ...prefs, aiResults: v })}
          />
          <NotificationSwitchItem
            label="Task Due Reminders"
            desc="Alerts for planner actions due today or overdue."
            checked={prefs.taskDueReminders}
            disabled={savingPrefs}
            onChange={(v) => savePrefs({ ...prefs, taskDueReminders: v })}
          />
          <NotificationSwitchItem
            label="Daily Note Nudge"
            desc="Friendly reminder to open your journal and daily log."
            checked={prefs.dailyNoteNudge}
            disabled={savingPrefs}
            onChange={(v) => savePrefs({ ...prefs, dailyNoteNudge: v })}
          />
        </div>
      </section>
    </div>
  );
}

function NotificationSwitchItem({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-[11px] text-muted-foreground">{desc}</span>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export & Backup Section
// ---------------------------------------------------------------------------

export function ExportBackupSection() {
  return (
    <section className="surface-card flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Data Export & Backup</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Download your complete note archive, attachments, metadata, and tags as a portable ZIP.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold">Full Workspace ZIP Archive</span>
          <span className="text-[11px] text-muted-foreground">
            Standard Markdown files formatted with YAML frontmatter + full image attachments folder.
          </span>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/api/export/all" />}
          className="gap-2 shrink-0"
        >
          <Download className="size-4" /> Export Everything (.zip)
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Danger Zone Section
// ---------------------------------------------------------------------------

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
    <section className="surface-card flex flex-col gap-6 border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start justify-between gap-4 border-b border-destructive/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Irreversible actions that affect your entire account data.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-background/50 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-destructive">Delete Entire Account</span>
          <span className="text-[11px] text-muted-foreground">
            Permanently deletes your user credentials, notes, journals, tasks, and stored attachments.
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          disabled={busy}
          className="shrink-0"
        >
          {busy ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Help & Documentation Guides Section
// ---------------------------------------------------------------------------

export function HelpGuidesSection() {
  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner with Docs Hub Link */}
      <section className="surface-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Inkest Documentation & Guides Hub
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Browse complete setup tutorials, API references, self-hosting guides, and hotkeys.
            </p>
          </div>
        </div>
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 shrink-0"
        >
          <span>Open Full Documentation</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </section>

      {/* Quick Jump Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/docs/ai-assistant"
          className="surface-card flex items-center justify-between p-4 transition-all hover:border-primary/50 group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="size-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">AI Providers & Privacy</span>
              <span className="text-[10px] text-muted-foreground">Endpoints, keys & caps</span>
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/docs/telegram"
          className="surface-card flex items-center justify-between p-4 transition-all hover:border-primary/50 group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Send className="size-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">Telegram Bot Setup</span>
              <span className="text-[10px] text-muted-foreground">BotFather & reminders</span>
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/docs/keyboard-shortcuts"
          className="surface-card flex items-center justify-between p-4 transition-all hover:border-primary/50 group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Keyboard className="size-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">Keyboard Shortcuts</span>
              <span className="text-[10px] text-muted-foreground">Command palette & hotkeys</span>
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>

      {/* AI Provider Setup Embedded Guide */}
      <section className="surface-card flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-base font-semibold">AI Provider Quick Guide</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure any OpenAI-compatible API endpoint in Settings → AI & Prompts.
            </p>
          </div>
          <Link
            href="/docs/ai-assistant#ai-setup"
            className="text-xs text-primary underline underline-offset-4 hover:text-foreground shrink-0"
          >
            Full AI doc →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-foreground">OpenAI</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Create a key at{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                platform.openai.com
              </a>
              . Base URL (<code>https://api.openai.com/v1</code>) and model (<code>gpt-4o</code>) default automatically.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-foreground">OpenRouter</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Generate a key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                openrouter.ai
              </a>{" "}
              to access Claude 3.7, DeepSeek R1, Llama 3.3, and Gemini behind one key.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-foreground">opencode Zen</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sign in at{" "}
              <a
                href="https://opencode.ai/zen"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                opencode.ai/zen
              </a>
              , set billing, and paste your API key for curated hosted models.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-foreground">NVIDIA Build</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Get an API key at{" "}
              <a
                href="https://build.nvidia.com"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                build.nvidia.com
              </a>{" "}
              for accelerated NIM endpoints (Llama 3.3 70B, Nemotron).
            </p>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-foreground">Ollama (Free, Local & Offline)</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">ollama.com</a>, pull a model, and select Ollama with no key needed:
            </p>
            <CopyCodeBlock code="ollama pull llama3.2" />
          </div>
        </div>
      </section>

      {/* Telegram Bot Setup Embedded Guide */}
      <section className="surface-card flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Send className="size-4 text-primary" />
              <h3 className="text-base font-semibold">Telegram Notifications Setup</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect your Telegram chat to receive AI task outputs, morning reminders, and daily journaling nudges.
            </p>
          </div>
          <Link
            href="/docs/telegram"
            className="text-xs text-primary underline underline-offset-4 hover:text-foreground shrink-0"
          >
            Full Telegram doc →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Step 1</span>
            <h4 className="text-xs font-semibold text-foreground">Create the Bot</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">@BotFather</a> on Telegram, run <code>/newbot</code>, and copy your API token.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Step 2</span>
            <h4 className="text-xs font-semibold text-foreground">Register Webhook</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Paste your token in <Link href="/settings?tab=notifications" className="text-primary underline underline-offset-4">Settings → Notifications</Link> and click <strong>Register Webhook</strong> for 1-click sync.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Step 3</span>
            <h4 className="text-xs font-semibold text-foreground">Link Account</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Generate a pairing code and click <strong>Open in Telegram</strong> to start receiving notifications immediately.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
