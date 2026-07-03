import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { SpotlightHero } from "@/components/marketing/spotlight-hero";
import { AiShowcase } from "@/components/marketing/ai-showcase";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { SelfHostSection } from "@/components/marketing/self-host-section";
import { PricingSection } from "@/components/marketing/pricing-section";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <SpotlightHero className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex-1 text-center lg:text-start">
            <span className="ai-badge">Markdown-first · AI-assisted</span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              A calm place to write, think, and let AI help.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground lg:mx-0">
              Inkest is a fast, minimal, Markdown-first workspace for notes, projects, and
              tasks — with AI actions built in, not bolted on. Self-host it for free, or
              let us run it for you.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
                Start writing
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="#self-host" />}
              >
                Self-host it
              </Button>
            </div>
          </div>

          <div className="w-full flex-1">
            <AiShowcase />
          </div>
        </div>
      </SpotlightHero>

      <FeaturesGrid />
      <SelfHostSection />
      <PricingSection />
    </>
  );
}
