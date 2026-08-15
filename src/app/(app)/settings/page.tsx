import { getCurrentUser } from "@/server/auth";
import { getUserSettings } from "@/server/users/settings-service";
import { getTelegramLinkStatus } from "@/server/notifications/telegram-link";
import { getAiConfigurationStatus } from "@/server/ai/provider";
import { SettingsView } from "@/components/users/settings-view";

export const metadata = {
  title: "Settings | Inkest",
  description: "Account, appearance, AI models, and workspace preferences.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();
  const [settings, telegramStatus] = await Promise.all([
    getUserSettings(),
    getTelegramLinkStatus(),
  ]);
  const aiConfiguration = getAiConfigurationStatus(settings);

  return (
    <div className="app-page-wide w-full min-h-full py-6 sm:py-8">
      <SettingsView
        user={user}
        settings={settings}
        telegramStatus={telegramStatus}
        aiConfiguration={aiConfiguration}
        initialTab={params?.tab}
      />
    </div>
  );
}
