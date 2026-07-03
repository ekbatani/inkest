import Link from "next/link";
import { Feather } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
            <Feather className="size-3.5" />
          </span>
          <span>© {new Date().getFullYear()} Inkest — open source, AGPL-3.0.</span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <a
            href="https://github.com/ekbatani/inkest"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Link href="#self-host" className="transition-colors hover:text-foreground">
            Self-host
          </Link>
          <Link href="/signin" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
