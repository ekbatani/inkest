import Link from "next/link";
import { ArrowUpRight, Feather } from "lucide-react";

export function CtaSection() {
  return (
    <section className="final-cta">
      <div className="final-cta-orbit" aria-hidden="true"><span /><span /><span /></div>
      <Feather className="final-cta-feather" aria-hidden="true" />
      <p className="marketing-eyebrow">The page is yours</p>
      <h2 className="marketing-display">Your best thinking<br /><em>needs a home.</em></h2>
      <p>Start free. Stay private. Take everything with you, whenever you want.</p>
      <Link href="/signup" className="marketing-button marketing-button--light">
        Create your workspace <ArrowUpRight />
      </Link>
      <small>No credit card · Open source · Self-host forever</small>
    </section>
  );
}
