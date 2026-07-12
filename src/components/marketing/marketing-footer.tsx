import Link from "next/link";
import { ArrowUpRight, GitFork } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="mx-auto max-w-[90rem] px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-10 border-b border-current/10 pb-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="marketing-logo">
              <LogoMark className="size-8" />
              <span>Inkest</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 opacity-60">
              A quiet, open-source space for everything you want to remember, shape,
              and bring to life.
            </p>
          </div>
          <div>
            <p className="marketing-footer-label">Explore</p>
            <nav className="mt-4 grid gap-2.5 text-sm opacity-70">
              <a href="#product">Product</a><a href="#workflow">Workflow</a>
              <a href="#open-source">Self-host</a><a href="#pricing">Pricing</a>
            </nav>
          </div>
          <div>
            <p className="marketing-footer-label">Connect</p>
            <nav className="mt-4 grid gap-2.5 text-sm opacity-70">
              <a href="https://github.com/ekbatani/inkest" target="_blank" rel="noreferrer" className="flex items-center gap-2"><GitFork className="size-3.5" /> GitHub <ArrowUpRight className="size-3" /></a>
              <Link href="/signin">Sign in</Link><Link href="/signup">Create account</Link>
            </nav>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-6 text-xs opacity-50 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Inkest. Your ideas belong to you.</span>
          <span>AGPL-3.0 · Built in the open</span>
        </div>
      </div>
    </footer>
  );
}
