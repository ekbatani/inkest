"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  GitFork,
  Lock,
  Sparkles,
  Terminal,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

const DOCKER_QUICK_COMMAND =
  "docker run -d -p 3000:3000 -v inkest-data:/app/data ghcr.io/ekbatani/inkest:latest";

const PRODUCT_LINKS = [
  { label: "Notes & Markdown", href: "/docs/notes-editor" },
  { label: "AI Writing Assistant", href: "/docs/ai-assistant", badge: "AI" },
  { label: "Projects & Kanban", href: "/docs/projects-tasks" },
  { label: "Daily Journal & Logs", href: "/docs/daily-journal" },
  { label: "Reader & Vault", href: "/docs/reader-vault" },
  { label: "Interactive Workflow", href: "/#workflow" },
] as const;

const GUIDE_LINKS = [
  { label: "Quickstart Guide", href: "/docs/quickstart", badge: "Start" },
  { label: "Docker Self-Hosting", href: "/docs/self-hosting" },
  { label: "Telegram Bot Sync", href: "/docs/telegram" },
  { label: "Keyboard Shortcuts", href: "/docs/keyboard-shortcuts" },
  { label: "Documentation Hub", href: "/docs" },
] as const;

const TRUST_LINKS = [
  { label: "AGPL-3.0 Open Source", href: "/#open-source" },
  {
    label: "GitHub Repository",
    href: "https://github.com/ekbatani/inkest",
    external: true,
  },
  { label: "Self-Host vs Cloud", href: "/#pricing" },
  { label: "BYOK AI & Privacy", href: "/docs/ai-assistant" },
  {
    label: "Changelog & Releases",
    href: "https://github.com/ekbatani/inkest/releases",
    external: true,
  },
] as const;

const WORKSPACE_LINKS = [
  { label: "Start Free Workspace", href: "/signup", highlight: true },
  { label: "Sign In", href: "/signin" },
  { label: "Pricing & Cloud", href: "/#pricing" },
  { label: "Knowledge Base", href: "/docs" },
] as const;

export function MarketingFooter() {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DOCKER_QUICK_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="marketing-footer" role="contentinfo">
      {/* Background ambient lighting */}
      <div className="marketing-footer-glow" aria-hidden="true" />

      <div className="relative mx-auto max-w-[90rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-12 xl:px-16">
        {/* Top Hero / Interactive Quick-Start Tier */}
        <div className="marketing-footer-hero mb-12 grid gap-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" className="marketing-logo" aria-label="Inkest Home">
                <LogoMark className="size-8 text-[var(--marketing-accent-bright)]" />
                <span className="text-xl font-bold tracking-tight text-white">Inkest</span>
              </Link>
              <span className="marketing-footer-status">
                <span className="marketing-footer-status-dot" />
                Local-first · AGPL-3.0
              </span>
            </div>
            <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-white/70">
              A private, Markdown-native digital brain for deep thinkers, writers, and builders.
              Keep your data sovereign on your own servers, or let us manage the cloud for you.
            </p>
          </div>

          {/* Quick Docker Pull Box */}
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-sm sm:p-4">
            <div className="flex items-center justify-between text-xs font-medium text-white/60">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Terminal className="size-3.5 text-[var(--marketing-accent)]" />
                Quick Self-Host Command
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Copy Docker command"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto font-mono text-xs text-white/90">
              <code className="select-all whitespace-nowrap text-emerald-300/90">
                docker run -d -p 3000:3000 ghcr.io/ekbatani/inkest
              </code>
            </div>
          </div>
        </div>

        {/* Multi-Column Navigation Grid */}
        <div className="grid grid-cols-2 gap-8 border-b border-white/10 pb-14 md:grid-cols-4 lg:gap-12">
          {/* Column 1: Product */}
          <div>
            <p className="marketing-footer-label">Product</p>
            <nav className="mt-4 flex flex-col gap-2.5" aria-label="Product links">
              {PRODUCT_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="marketing-footer-link group flex items-center justify-between text-sm text-white/70 hover:text-white"
                >
                  <span>{link.label}</span>
                  {"badge" in link && link.badge && (
                    <span className="rounded-full bg-[var(--marketing-accent)]/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--marketing-accent-bright)]">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 2: Guides & Docs */}
          <div>
            <p className="marketing-footer-label">Guides & Docs</p>
            <nav className="mt-4 flex flex-col gap-2.5" aria-label="Guides and Documentation">
              {GUIDE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="marketing-footer-link group flex items-center justify-between text-sm text-white/70 hover:text-white"
                >
                  <span>{link.label}</span>
                  {"badge" in link && link.badge && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/90">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3: Trust & Open Source */}
          <div>
            <p className="marketing-footer-label">Open Source</p>
            <nav className="mt-4 flex flex-col gap-2.5" aria-label="Open Source and Trust">
              {TRUST_LINKS.map((link) =>
                "external" in link && link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="marketing-footer-link group inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="size-3 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="marketing-footer-link text-sm text-white/70 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          </div>

          {/* Column 4: Workspace & Connect */}
          <div>
            <p className="marketing-footer-label">Workspace</p>
            <nav className="mt-4 flex flex-col gap-2.5" aria-label="Workspace Access">
              {WORKSPACE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`marketing-footer-link text-sm ${
                    "highlight" in link && link.highlight
                      ? "font-semibold text-[var(--marketing-accent-bright)] hover:text-emerald-300"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 pt-3 border-t border-white/10">
                <a
                  href="https://github.com/ekbatani/inkest"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/90 transition-all hover:border-[var(--marketing-accent)] hover:bg-white/10 hover:text-white"
                >
                  <GitFork className="size-3.5 text-[var(--marketing-accent)]" />
                  <span>Star on GitHub</span>
                  <ArrowUpRight className="size-3 text-white/50" />
                </a>
              </div>
            </nav>
          </div>
        </div>

        {/* Bottom Metadata & Utilities Bar */}
        <div className="flex flex-col gap-4 pt-8 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {currentYear} Inkest. Your ideas belong to you.</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Lock className="size-3 text-white/40" />
              Private & Self-hostable
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-white/40">
              <Sparkles className="size-3 text-[var(--marketing-accent)]" />
              Markdown-First
            </span>
            <button
              type="button"
              onClick={scrollToTop}
              className="marketing-footer-back-to-top inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-accent)]"
              aria-label="Scroll back to top of page"
            >
              <span>Top</span>
              <ArrowUp className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
