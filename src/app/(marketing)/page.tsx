import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Check, GitFork, Play } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { SpotlightHero } from "@/components/marketing/spotlight-hero";
import { AiShowcase } from "@/components/marketing/ai-showcase";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { SelfHostSection } from "@/components/marketing/self-host-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Inkest — Markdown notes, PDF reader, grounded AI & project planning",
  description:
    "Build your private cognitive brain with Markdown notes, PDF document reader, grounded AI citations, daily journaling, and Kanban project boards. Self-host Inkest free or choose managed cloud.",
  keywords: [
    "Markdown notes app",
    "Grounded AI citations",
    "PDF document reader",
    "self-hosted knowledge base",
    "personal digital brain",
    "private research workspace",
    "open source notes",
    "project management notes",
    "second brain app",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Inkest — Your private cognitive workspace in Markdown",
    description:
      "Notes, PDF research reader, grounded AI citations, and project boards in one calm, open-source workspace.",
    url: "/",
    type: "website",
  },
};

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
        "An open-source cognitive workspace for Markdown notes, PDF document research, grounded AI citations, projects, and daily journaling.",
      offers: [
        {
          "@type": "Offer",
          name: "Self-hosted",
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Inkest Cloud",
          availability: "https://schema.org/PreOrder",
          priceCurrency: "USD",
        },
      ],
      featureList: [
        "Markdown-native notes and wiki links",
        "Deep PDF Document Reader with margin highlights",
        "Grounded AI retrieval with source citations and diff review",
        "Projects and Kanban task management",
        "Daily notes and structured journaling templates",
        "Private self-hosting with 1-line Docker",
        "Zero-Knowledge encrypted vault storage",
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

const TRUST_POINTS = ["Markdown native", "Grounded AI citations", "100% User-owned data"];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="marketing-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <SpotlightHero>
        <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[90rem] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-12 xl:px-16">
          <div className="hero-copy max-w-2xl">
            <a className="marketing-kicker" href="#open-source">
              <span className="marketing-kicker-dot" />
              Open Source · Grounded AI · Deep Reader · Local-First
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
            <h1 className="marketing-display mt-7 text-[clamp(3.15rem,7vw,6.8rem)] leading-[0.92] tracking-[-0.065em]">
              Make space
              <span className="block font-serif italic text-[var(--marketing-accent)]">
                for deep thought.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--marketing-muted)] sm:text-xl">
              A private, evidence-based cognitive workspace for your Markdown notes, PDF research documents, daily journals, and projects—with grounded AI that cites every source.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="marketing-button marketing-button--primary" href="/signup">
                Start your workspace
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <a className="marketing-button marketing-button--ghost" href="#product">
                <Play className="size-3.5 fill-current" aria-hidden="true" />
                Explore features
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2" aria-label="Product promises">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-1.5 text-xs font-medium text-[var(--marketing-muted)]">
                  <Check className="size-3.5 text-[var(--marketing-accent)]" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-product-stage">
            <AiShowcase />
          </div>
        </div>

        <div className="marketing-marquee" aria-hidden="true">
          <div className="marketing-marquee-track">
            {["WRITE", "WIKI-LINK", "READ PDF", "GROUNDED AI", "REFLECT", "PLAN", "WRITE", "WIKI-LINK", "READ PDF", "GROUNDED AI", "REFLECT", "PLAN"].map((word, index) => (
              <span key={`${word}-${index}`}>{word}<i>✦</i></span>
            ))}
          </div>
        </div>
      </SpotlightHero>

      <section className="marketing-intro" aria-labelledby="intro-title">
        <p className="marketing-eyebrow">One workspace · complete research control</p>
        <h2 id="intro-title" className="marketing-section-title max-w-5xl">
          Your notes &amp; documents should compound your thinking—not scatter it across ten tools.
        </h2>
      </section>

      <BentoFeatures />
      <TestimonialsSection />
      <SelfHostSection />
      <PricingSection />
      <CtaSection />
      <MarketingFooter />

      <a
        href="https://github.com/ekbatani/inkest"
        target="_blank"
        rel="noreferrer"
        className="marketing-github-float"
        aria-label="View Inkest on GitHub"
      >
        <GitFork className="size-4" aria-hidden="true" />
        GitHub
      </a>
    </div>
  );
}
