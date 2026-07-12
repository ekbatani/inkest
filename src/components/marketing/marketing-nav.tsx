import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";

const LINKS = [
  ["Product", "#product"],
  ["Philosophy", "#workflow"],
  ["Open source", "#open-source"],
  ["Pricing", "#pricing"],
] as const;

export function MarketingNav() {
  return (
    <header className="marketing-nav">
      <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12 xl:px-16">
        <Link href="/" className="marketing-logo" aria-label="Inkest home">
          <LogoMark className="size-8" />
          <span>Inkest</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="marketing-nav-link">{label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link href="/signin" className="marketing-signin">Sign in</Link>
          <Link href="/signup" className="marketing-nav-cta">
            Get started
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
