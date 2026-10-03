import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

export function CtaSection({
  user,
}: {
  user?: { id?: string; name?: string | null; email?: string | null } | null;
}) {
  return (
    <section className="final-cta cta-panel" aria-labelledby="cta-title">
      <div className="cta-panel__aurora" aria-hidden="true" />
      <div className="cta-panel__grid" aria-hidden="true" />
      <div className="final-cta-orbit" aria-hidden="true"><span /><span /><span /></div>
      <LogoMark variant="monochrome" className="final-cta-feather" />
      <p className="marketing-eyebrow">The page is yours</p>
      <h2 id="cta-title" className="marketing-display">Your best thinking<br /><em>needs a home.</em></h2>
      <p>Start free. Stay private. Take everything with you, whenever you want.</p>
      <Link
        href={user ? "/dashboard" : "/signup"}
        className="marketing-button marketing-button--light btn-sheen"
      >
        {user ? "Open your workspace" : "Create your workspace"} <ArrowUpRight />
      </Link>
      <small>No credit card · Open source · Self-host forever</small>
    </section>
  );
}
