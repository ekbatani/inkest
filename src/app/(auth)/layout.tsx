import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-site auth-canvas flex min-h-dvh flex-col">
      <div className="spotlight-hero__aurora spotlight-hero__aurora--a" aria-hidden="true" />
      <div className="spotlight-hero__aurora spotlight-hero__aurora--b" aria-hidden="true" />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="auth-header">
          <Link href="/dashboard" className="marketing-logo" aria-label="Inkest workspace">
            <LogoMark className="size-8" />
            <span>Inkest</span>
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          {children}
        </main>

        <footer className="auth-footer">
          <span>Inkest</span>
          <i aria-hidden="true" />
          <span>Make space for thought</span>
        </footer>
      </div>
    </div>
  );
}
