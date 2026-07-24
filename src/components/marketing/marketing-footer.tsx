import Link from "next/link";
import { ArrowUpRight, GitFork } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

export function MarketingFooter() {
  return (
    <footer className="marketing-footer border-t border-[var(--marketing-line)] bg-[var(--marketing-ink)] text-[var(--marketing-paper)]">
      <div className="mx-auto max-w-[90rem] px-5 py-14 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand & Status Column */}
          <div className="space-y-4">
            <Link href="/" className="marketing-logo text-white">
              <LogoMark className="size-8" />
              <span className="text-xl font-bold tracking-tight">Inkest</span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-white/60">
              A calm, open-source workspace for Markdown notes, PDF research, grounded AI citations, and Kanban project execution.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-medium text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local-First Engine · Privacy Preserved
              </span>
            </div>
          </div>

          {/* Product Features */}
          <div>
            <p className="marketing-footer-label">Workspace</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-xs text-white/70">
              <a href="#product" className="hover:text-white transition-colors">Markdown Notes &amp; Wiki</a>
              <a href="#product" className="hover:text-white transition-colors">Deep Document Reader</a>
              <a href="#product" className="hover:text-white transition-colors">Grounded AI Citations</a>
              <a href="#product" className="hover:text-white transition-colors">Kanban Action Boards</a>
            </nav>
          </div>

          {/* Architecture & Specs */}
          <div>
            <p className="marketing-footer-label">Architecture</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-xs text-white/70">
              <a href="#open-source" className="hover:text-white transition-colors">Local-First Storage</a>
              <a href="#open-source" className="hover:text-white transition-colors">Zero-Knowledge Vault</a>
              <a href="#open-source" className="hover:text-white transition-colors">Docker Deployment</a>
              <a href="#pricing" className="hover:text-white transition-colors">AGPL-3.0 License</a>
            </nav>
          </div>

          {/* Connect & Access */}
          <div>
            <p className="marketing-footer-label">Connect &amp; Access</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-xs text-white/70">
              <a
                href="https://github.com/ekbatani/inkest"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                <GitFork className="size-3.5" /> GitHub Repository <ArrowUpRight className="size-3" />
              </a>
              <Link href="/signin" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Create Workspace</Link>
            </nav>
          </div>
        </div>

        {/* Bottom copyright & details bar */}
        <div className="flex flex-col gap-3 pt-8 text-[11px] font-mono text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Inkest. Your ideas belong strictly to you.</p>
          <div className="flex flex-wrap gap-4 text-white/40">
            <span>AGPL-3.0 Open Source</span>
            <span>·</span>
            <span>RTL Persian Support</span>
            <span>·</span>
            <span>Cmd+K Navigation</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
