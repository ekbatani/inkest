import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

const PLANS = [
  {
    label: "For independent minds",
    name: "Self-hosted",
    price: "$0",
    suffix: "forever",
    description: "The complete Inkest experience on infrastructure you control.",
    features: ["Every product feature", "Unlimited notes and files", "Bring your own AI key", "Docker deployment", "Community updates"],
    cta: "Deploy Inkest",
    href: "#open-source",
  },
  {
    label: "For effortless focus",
    name: "Cloud",
    price: "Soon",
    suffix: "managed for you",
    description: "The same open-source core, without a server to maintain.",
    features: ["Everything self-hosted includes", "Automatic backups", "Seamless upgrades", "Optional AI credits", "Priority support"],
    cta: "Join the early list",
    href: "/signup",
    featured: true,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="pricing-section">
      <div className="pricing-heading reveal">
        <p className="marketing-eyebrow">Simple choices, no feature games</p>
        <h2 className="marketing-section-title">Pay for hosting.<br />Not permission.</h2>
      </div>
      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <article key={plan.name} className={`pricing-card reveal ${plan.featured ? "pricing-card--featured" : ""}`}>
            <p className="marketing-eyebrow">{plan.label}</p>
            <h3>{plan.name}</h3>
            <div className="pricing-price"><strong>{plan.price}</strong><span>{plan.suffix}</span></div>
            <p className="pricing-description">{plan.description}</p>
            <ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
            <Link href={plan.href} className="pricing-cta">{plan.cta}<ArrowUpRight /></Link>
          </article>
        ))}
      </div>
    </section>
  );
}
