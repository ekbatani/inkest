import Link from "next/link";
import { Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
            <Feather className="size-4" />
          </span>
          Inkest
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#self-host" className="transition-colors hover:text-foreground">
            Self-host
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <a
            href="https://github.com/ekbatani/inkest"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/signin" />}>
            Sign in
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
            Start writing
          </Button>
        </div>
      </div>
    </header>
  );
}
