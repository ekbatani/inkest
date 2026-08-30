import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getBillingOverview } from "@/server/billing/service";
import { BillingView } from "@/components/billing/billing-view";

export const metadata = {
  title: "Billing | Inkest",
  description: "Credit balance, crypto top-ups, and payment history.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ payment?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  // NO_WORKSPACE (fresh account mid-onboarding) should render a calm empty
  // state instead of a runtime error page.
  const overview = await getBillingOverview().catch(() => null);

  return (
    <div className="app-page-wide w-full min-h-full py-6 sm:py-8">
      <BillingView
        initialOverview={overview}
        highlightedPaymentId={params?.payment ?? null}
      />
    </div>
  );
}
