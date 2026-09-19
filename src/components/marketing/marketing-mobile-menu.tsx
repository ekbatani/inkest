"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoMark } from "@/components/brand/logo-mark";

const LINKS = [
  { label: "Product", href: "/landing#product" },
  { label: "AI", href: "/landing#ai" },
  { label: "Philosophy", href: "/landing#philosophy" },
  { label: "Open source", href: "/landing#open-source" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/landing#pricing" },
] as const;

export function MarketingMobileMenu({
  user,
}: {
  user?: { id?: string; name?: string | null; email?: string | null } | null;
}) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground lg:hidden"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2.5 border-b px-5 py-4">
            <LogoMark className="size-7" />
            <span className="text-sm font-semibold tracking-tight">Inkest</span>
          </div>

          <nav className="flex flex-col gap-1 p-3" aria-label="Mobile navigation">
            {LINKS.map(({ label, href }) =>
              href.includes("#") ? (
                <a
                  key={href}
                  href={href}
                  onClick={close}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {label}
                </Link>
              ),
            )}
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t p-4">
            {user ? (
              <Link
                href="/dashboard"
                onClick={close}
                className="flex h-10 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background shadow-sm transition-opacity hover:opacity-90"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  onClick={close}
                  className="flex h-10 items-center justify-center rounded-xl border border-border/70 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={close}
                  className="flex h-10 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background shadow-sm transition-opacity hover:opacity-90"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
