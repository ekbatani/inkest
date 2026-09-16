import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

const LINKS = [
  { label: "Product", href: "/landing#product" },
  { label: "AI", href: "/landing#ai" },
  { label: "Philosophy", href: "/landing#philosophy" },
  { label: "Open source", href: "/landing#open-source" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/landing#pricing" },
] as const;

export function MarketingNav({
  user,
}: {
  user?: { id?: string; name?: string | null; email?: string | null } | null;
}) {
  return (
    <header className="marketing-nav">
      <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12 xl:px-16">
        <Link href="/landing" className="marketing-logo" aria-label="Inkest home">
          <LogoMark className="size-8" />
          <span>Inkest</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          {LINKS.map(({ label, href }) =>
            href.startsWith("/#") || href.startsWith("#") || href.startsWith("/landing#") ? (
              <a key={href} href={href} className="marketing-nav-link">
                {label}
              </a>
            ) : (
              <Link key={href} href={href} className="marketing-nav-link">
                {label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <Link href="/dashboard" className="marketing-nav-cta btn-sheen">
              Dashboard
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link href="/signin" className="marketing-signin">Sign in</Link>
              <Link href="/signup" className="marketing-nav-cta btn-sheen">
                Get started
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
