import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, GitFork, Play } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { SpotlightHero } from "@/components/marketing/spotlight-hero";
import { AiShowcase } from "@/components/marketing/ai-showcase";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { AiCapabilitiesSection } from "@/components/marketing/ai-capabilities-section";
import { PhilosophySection } from "@/components/marketing/philosophy-section";
import { WorkflowSection } from "@/components/marketing/workflow-section";
import { SelfHostSection } from "@/components/marketing/self-host-section";
import { DownloadSection } from "@/components/marketing/download-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { CtaSection } from "@/components/marketing/cta-section";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Inkest — a calm, Markdown-first workspace with a citing AI",
  description:
    "Build your private digital brain with Markdown notes, daily journaling, a citing AI assistant, projects and tasks. Self-host Inkest free or choose managed cloud.",
  keywords: [
    "Markdown notes app",
    "AI writing workspace",
    "AI knowledge base",
    "self-hosted knowledge base",
    "personal digital brain",
    "private journal app",
    "open source notes",
    "project management notes",
    "second brain app",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Inkest — Your private space to think in Markdown",
    description:
      "Notes, daily journaling, a citing AI, and project planning in one calm, open-source workspace.",
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
        "An open-source Markdown workspace for notes, daily journaling, projects, tasks and AI-assisted writing.",
      offers: [
        {
          "@type": "Offer",
          name: "Self-hosted",
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Inkest Cloud (Monthly)",
          price: "9",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Inkest Cloud (Yearly)",
          price: "99",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      ],
      featureList: [
        "Markdown-native notes and wiki links",
        "AI assistant with citations over a private knowledge layer",
        "Projects and task management",
        "Daily notes and journaling",
        "Private self-hosting with Docker",
        "Managed cloud option",
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

const TRUST_POINTS = ["Markdown native", "Open source", "Your data, always"];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="marketing-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <SpotlightHero>
        <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[90rem] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-12 xl:px-16">
          <div className="hero-copy max-w-2xl">
            <a className="marketing-kicker" href="#philosophy">
              <span className="marketing-kicker-dot" />
              Capture · Organize · Think
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
            <h1 className="marketing-display mt-7 text-[clamp(3.15rem,7vw,6.8rem)] leading-[0.92] tracking-[-0.065em]">
              Make space
              <span className="block">
                <em>for thought.</em>
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--mk-muted)] sm:text-xl">
              A private, Markdown-native home for your notes, diary, projects, and ideas—with an
              AI that answers from your knowledge and shows its sources.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="marketing-button marketing-button--primary btn-sheen"
                href={user ? "/dashboard" : "/signup"}
              >
                {user ? "Open workspace" : "Start your workspace"}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <a className="marketing-button marketing-button--ghost" href="#product">
                <Play className="size-3.5 fill-current" aria-hidden="true" />
                See how it works
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2" aria-label="Product promises">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-1.5 text-xs font-medium text-[var(--mk-muted)]">
                  <Check className="size-3.5 text-[var(--mk-indigo-bright)]" aria-hidden="true" />
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
            {["WRITE", "CONNECT", "PLAN", "REFLECT", "CREATE", "WRITE", "CONNECT", "PLAN", "REFLECT", "CREATE"].map((word, index) => (
              <span key={`${word}-${index}`}>{word}<i>✦</i></span>
            ))}
          </div>
        </div>
      </SpotlightHero>

      <section className="marketing-intro" aria-labelledby="intro-title">
        <p className="marketing-eyebrow">One workspace · every kind of thought</p>
        <h2 id="intro-title" className="marketing-section-title max-w-5xl">
          Your notes should grow with your thinking—<span className="mk-grad-text">not get in its way.</span>
        </h2>
      </section>

      <BentoFeatures />
      <AiCapabilitiesSection />
      <PhilosophySection />
      <WorkflowSection />
      <SelfHostSection />
      <DownloadSection />
      <PricingSection />
      <CtaSection user={user} />

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

