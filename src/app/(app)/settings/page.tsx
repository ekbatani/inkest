import { getCurrentUser } from "@/server/auth";
import { isAdmin } from "@/server/auth/admin";
import { listUsersAdmin } from "@/server/users/admin-service";
import { getUserSettings } from "@/server/users/settings-service";
import { getTelegramLinkStatus } from "@/server/notifications/telegram-link";
import { getAiConfigurationStatus } from "@/server/ai/provider";
import { getBillingOverview } from "@/server/billing/service";
import { SettingsView } from "@/components/users/settings-view";

export const metadata = {
  title: "Settings | Inkest",
  description: "Account, appearance, AI models, billing, and workspace preferences.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; payment?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();
  const [settings, telegramStatus, isAdminUser, billingOverview] = await Promise.all([
    getUserSettings(),
    getTelegramLinkStatus(),
    isAdmin().catch(() => false),
    getBillingOverview().catch(() => null),
  ]);
  const aiConfiguration = getAiConfigurationStatus(settings);
  const initialUsersData = isAdminUser
    ? await listUsersAdmin().catch(() => null)
    : null;

  return (
    <div className="app-page-wide w-full min-h-full py-6 sm:py-8">
      <SettingsView
        user={user}
        settings={settings}
        telegramStatus={telegramStatus}
        aiConfiguration={aiConfiguration}
        initialTab={params?.tab}
        isAdmin={isAdminUser}
        initialUsersData={initialUsersData}
        initialBillingOverview={billingOverview}
        highlightedPaymentId={params?.payment ?? null}
      />
    </div>
  );
}
