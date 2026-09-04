"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, ArrowUpRight, GitFork } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

const PRODUCT_LINKS = [
  { label: "Notes & Markdown", href: "/docs/notes-editor" },
  { label: "AI assistant", href: "/docs/ai-assistant" },
  { label: "Projects & tasks", href: "/docs/projects-tasks" },
  { label: "Daily journal", href: "/docs/daily-journal" },
] as const;

const LEARN_LINKS = [
  { label: "Quickstart", href: "/docs/quickstart" },
  { label: "Self-hosting", href: "/docs/self-hosting" },
  { label: "Reader & vault", href: "/docs/reader-vault" },
  { label: "Keyboard shortcuts", href: "/docs/keyboard-shortcuts" },
] as const;

const PROJECT_LINKS = [
  { label: "Download apps", href: "/download" },
  { label: "GitHub repository", href: "https://github.com/ekbatani/inkest", external: true },
  { label: "Changelog & releases", href: "https://github.com/ekbatani/inkest/releases", external: true },
  { label: "Self-host vs cloud", href: "/#pricing" },
  { label: "All documentation", href: "/docs" },
] as const;

const COLUMNS = [
  { label: "Product", links: PRODUCT_LINKS },
  { label: "Learn", links: LEARN_LINKS },
  { label: "Project", links: PROJECT_LINKS },
] as const;

export function MarketingFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="marketing-footer" role="contentinfo">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12 xl:px-16">
        <div className="marketing-footer-top">
          <div className="marketing-footer-brand">
            <Link href="/" className="marketing-logo" aria-label="Inkest home">
              <LogoMark className="size-8" />
              <span>Inkest</span>
            </Link>
            <p className="marketing-footer-tagline">CAPTURE · ORGANIZE · THINK</p>
            <p className="marketing-footer-mission">
              A private, Markdown-first workspace where notes, projects, and a citing AI grow
              together.
            </p>
          </div>

          <div className="marketing-footer-actions">
            <a
              href="https://github.com/ekbatani/inkest"
              target="_blank"
              rel="noreferrer"
              className="marketing-footer-github"
            >
              <GitFork className="size-4" aria-hidden="true" />
              Star on GitHub
            </a>
            <Link href="/signup" className="marketing-footer-cta">
              Start free
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="marketing-footer-grid">
          {COLUMNS.map((column) => (
            <nav key={column.label} aria-label={`${column.label} links`}>
              <p className="marketing-footer-label">{column.label}</p>
              <div className="marketing-footer-col">
                {column.links.map((link) =>
                  "external" in link && link.external ? (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="marketing-footer-link inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ArrowUpRight className="size-3 opacity-50" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link key={link.href} href={link.href} className="marketing-footer-link">
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            </nav>
          ))}
        </div>

        <div className="marketing-footer-bottom">
          <div className="marketing-footer-meta">
            <span>© {currentYear} Inkest</span>
            <span aria-hidden="true">·</span>
            <span>AGPL-3.0 open source</span>
            <span aria-hidden="true">·</span>
            <span>Your ideas belong to you</span>
          </div>
          <button
            type="button"
            onClick={scrollToTop}
            className="marketing-footer-top-btn"
            aria-label="Scroll back to top of page"
          >
            Top
            <ArrowUp className="size-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
