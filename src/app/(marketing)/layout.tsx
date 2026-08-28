import { getCurrentUser } from "@/server/auth";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="marketing-site flex min-h-dvh flex-col">
      <MarketingNav user={user} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
