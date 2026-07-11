import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { SpotlightHero } from "@/components/marketing/spotlight-hero";
import { AiShowcase } from "@/components/marketing/ai-showcase";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { SelfHostSection } from "@/components/marketing/self-host-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { CtaSection } from "@/components/marketing/cta-section";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Inkest — a calm, Markdown-first workspace with AI built in",
  description:
    "Inkest is a fast, minimal, Markdown-first workspace for notes, projects, and tasks — with AI actions built in, not bolted on. Self-host it free, or let us run it.",
  keywords: [
    "markdown notes app",
    "AI note taking",
    "self-hosted notes",
    "personal knowledge base",
    "markdown editor",
    "projects and tasks",
    "open source notes",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Inkest — a calm, Markdown-first workspace with AI built in",
    description:
      "A fast, minimal, Markdown-first workspace for notes, projects, and tasks — with AI actions built in. Self-host free, or let us run it.",
    url: "/",
    type: "website",
  },
};

// Structured data for rich results — describes the product to search engines.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Inkest",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web, Docker",
      url: APP_URL,
      description:
        "A calm, fast, Markdown-first personal workspace for notes, projects, and tasks, with AI actions built in. Self-hosted or cloud.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free forever to self-host.",
      },
      featureList: [
        "Markdown-native notes",
        "AI actions (summarize, improve, extract tasks, translate)",
        "Projects and tasks with a kanban board",
        "Daily notes with calendar sync",
        "Speech to text",
        "Self-hosted or cloud",
      ],
    },
    {
      "@type": "Organization",
      name: "Inkest",
      url: APP_URL,
      sameAs: ["https://github.com/ekbatani/inkest"],
    },
  ],
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <SpotlightHero>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex-1 text-center lg:text-start">
            <span className="ai-badge">Markdown-first · AI-assisted</span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              A calm place to write, think, and let AI help.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground text-pretty lg:mx-0">
              Inkest is a fast, minimal, Markdown-first workspace for notes, projects, and
              tasks — with AI actions built in, not bolted on. Self-host it for free, or
              let us run it for you.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className="btn-sheen"
                nativeButton={false}
                render={<Link href="/signup" />}
              >
                Start writing
                <ArrowRight className="size-4" />
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
            <p className="mt-5 text-sm text-muted-foreground">
              Open source · AGPL-3.0 · your data stays yours.
            </p>
          </div>

          <div className="w-full flex-1">
            <AiShowcase />
          </div>
        </div>
      </SpotlightHero>

      <BentoFeatures />
      <TestimonialsSection />
      <SelfHostSection />
      <PricingSection />
      <CtaSection />
    </>
  );
}
