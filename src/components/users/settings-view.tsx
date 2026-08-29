"use client";

import * as React from "react";
import {
  User,
  Palette,
  Sparkles,
  Bell,
  Archive,
  BookOpen,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProfileSection,
  AppearanceSection,
  EditorPrefsSection,
  AiProviderSection,
  AiPrivacySection,
  AiOrchestrationSection,
  AgentHarnessSection,
  NotificationsSection,
  ExportBackupSection,
  DangerZoneSection,
  HelpGuidesSection,
} from "@/components/users/settings-sections";
import { UserManagementView } from "@/components/admin/user-management-view";
import type { UserSettings } from "@/server/users/settings-service";
import type { AdminUserListResult } from "@/server/users/admin-service";

export type SettingsCategory =
  | "account"
  | "appearance"
  | "ai"
  | "notifications"
  | "data"
  | "users"
  | "help";

interface CategoryMeta {
  id: SettingsCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "account",
    label: "Account & Security",
    shortLabel: "Account",
    description: "Profile info, display name, and password management",
    icon: User,
  },
  {
    id: "appearance",
    label: "Appearance & Editor",
    shortLabel: "Appearance",
    description: "Themes, color palettes, fonts, and writing surface prefs",
    icon: Palette,
  },
  {
    id: "ai",
    label: "AI & Intelligence",
    shortLabel: "AI & Prompts",
    description: "Model providers, custom endpoints, prompt rules, and token caps",
    icon: Sparkles,
  },
  {
    id: "notifications",
    label: "Notifications & Services",
    shortLabel: "Notifications",
    description: "Telegram bot pairing and reminder notification triggers",
    icon: Bell,
  },
  {
    id: "data",
    label: "Data & Storage",
    shortLabel: "Data & Danger",
    description: "Complete ZIP backups, exports, and account deletion",
    icon: Archive,
  },
  {
    id: "help",
    label: "Help & Documentation",
    shortLabel: "Help & Docs",
    description: "AI setup, Telegram pairing, hotkeys, and workspace docs",
    icon: BookOpen,
  },
];

interface SettingsViewProps {
  user: {
    id?: string;
    email: string;
    name?: string | null;
  } | null;
  settings: UserSettings;
  telegramStatus: {
    linked: boolean;
  };
  aiConfiguration: {
    source: "user" | "instance" | "unavailable";
  };
  initialTab?: string;
  isAdmin?: boolean;
  initialUsersData?: AdminUserListResult | null;
}

export function SettingsView({
  user,
  settings,
  telegramStatus,
  aiConfiguration,
  initialTab,
  isAdmin = false,
  initialUsersData,
}: SettingsViewProps) {
  const normalizedInitialTab =
    initialTab === "admin-users" || initialTab === "user-management"
      ? "users"
      : initialTab;

  const categories = React.useMemo(() => {
    if (!isAdmin) return CATEGORIES;
    return [
      ...CATEGORIES.slice(0, 5),
      {
        id: "users" as SettingsCategory,
        label: "User Management (Admin)",
        shortLabel: "Users",
        description: "Instance user accounts, privileges, security, and workspaces",
        icon: Users,
      },
      ...CATEGORIES.slice(5),
    ];
  }, [isAdmin]);

  const [activeCategory, setActiveCategory] = React.useState<SettingsCategory>(() => {
    const valid = categories.some((c) => c.id === normalizedInitialTab);
    return valid ? (normalizedInitialTab as SettingsCategory) : "account";
  });

  const activeMeta =
    categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b pb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SettingsIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Workspace Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage account security, editor themes, AI providers, and connected tools.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Sidebar Tabs + Right Category Content */}
      <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Navigation Sidebar / Horizontal Pills */}
        <aside className="lg:col-span-3">
          <nav
            aria-label="Settings Categories"
            className="flex flex-row gap-1.5 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all text-left whitespace-nowrap lg:whitespace-normal",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{category.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-9 flex flex-col gap-6 min-w-0">
          {/* Active Category Header Banner */}
          <div className="flex flex-col gap-0.5 rounded-xl border border-border/70 bg-card/40 px-5 py-3.5 shadow-2xs">
            <h2 className="text-sm font-semibold text-foreground">
              {activeMeta.label}
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeMeta.description}
            </p>
          </div>

          {/* Account Category */}
          {activeCategory === "account" && (
            <div className="flex flex-col gap-6">
              <ProfileSection email={user?.email ?? ""} name={user?.name} />
            </div>
          )}

          {/* Appearance & Editor Category */}
          {activeCategory === "appearance" && (
            <div className="flex flex-col gap-6">
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
            </div>
          )}

          {/* AI & Prompts Category */}
          {activeCategory === "ai" && (
            <div className="flex flex-col gap-6">
              <AiProviderSection
                key={`ai:${settings.ai?.provider}:${settings.ai?.apiKey ? "set" : "unset"}:${settings.ai?.baseURL ?? ""}:${settings.ai?.model ?? ""}`}
                provider={settings.ai?.provider}
                hasApiKey={Boolean(settings.ai?.apiKey)}
                baseURL={settings.ai?.baseURL}
                model={settings.ai?.model}
                configurationSource={aiConfiguration.source}
              />
              <AiOrchestrationSection
                key={`ai-controls:${settings.ai?.temperature}:${settings.ai?.minInputTokens}:${settings.ai?.maxInputTokens}:${settings.ai?.minOutputTokens}:${settings.ai?.maxOutputTokens}:${settings.ai?.instructions ?? ""}:${settings.ai?.guardrails ?? ""}:${settings.ai?.taskTimingPrompt ?? ""}:${settings.ai?.projectPlanningPrompt ?? ""}`}
                temperature={settings.ai?.temperature}
                minInputTokens={settings.ai?.minInputTokens}
                maxInputTokens={settings.ai?.maxInputTokens}
                minOutputTokens={settings.ai?.minOutputTokens}
                maxOutputTokens={settings.ai?.maxOutputTokens}
                instructions={settings.ai?.instructions}
                guardrails={settings.ai?.guardrails}
                taskTimingPrompt={settings.ai?.taskTimingPrompt}
                projectPlanningPrompt={settings.ai?.projectPlanningPrompt}
              />
              <AiPrivacySection onboardingDismissed={settings.ai?.onboardingDismissed} />
              <AgentHarnessSection
                key={`agent-harness:${settings.agentHarness?.enabled}:${settings.agentHarness?.apiToken ? "set" : "unset"}:${settings.agentHarness?.maxLoopSteps}:${settings.agentHarness?.allowModifyNotes}:${settings.agentHarness?.allowCreateTasks}`}
                enabled={settings.agentHarness?.enabled}
                apiToken={settings.agentHarness?.apiToken}
                maxLoopSteps={settings.agentHarness?.maxLoopSteps}
                allowModifyNotes={settings.agentHarness?.allowModifyNotes}
                allowCreateTasks={settings.agentHarness?.allowCreateTasks}
              />
            </div>
          )}

          {/* Notifications & Services Category */}
          {activeCategory === "notifications" && (
            <div className="flex flex-col gap-6">
              <NotificationsSection
                key={`notifications:${telegramStatus.linked}`}
                initialLinked={telegramStatus.linked}
                inApp={settings.notifications?.inApp}
                aiResults={settings.notifications?.aiResults}
                taskDueReminders={settings.notifications?.taskDueReminders}
                dailyNoteNudge={settings.notifications?.dailyNoteNudge}
              />
            </div>
          )}

          {/* Data & Danger Zone Category */}
          {activeCategory === "data" && (
            <div className="flex flex-col gap-6">
              <ExportBackupSection />
              <DangerZoneSection />
            </div>
          )}

          {/* User Management Category (Admin Only) */}
          {activeCategory === "users" && isAdmin && (
            <div className="flex flex-col gap-6">
              {initialUsersData ? (
                <UserManagementView
                  initialData={initialUsersData}
                  currentUserId={user?.id ?? ""}
                  embedded={true}
                />
              ) : (
                <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-muted-foreground">
                  <p className="text-sm">No user management data available or unauthorized.</p>
                </div>
              )}
            </div>
          )}

          {/* Help & Documentation Category */}
          {activeCategory === "help" && (
            <div className="flex flex-col gap-6">
              <HelpGuidesSection />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
