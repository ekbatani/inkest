"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

type BillingCycle = "monthly" | "yearly";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const plans = [
    {
      label: "For independent minds",
      name: "Self-hosted",
      price: "$0",
      suffix: "forever",
      subtext: "Free & open-source AGPL-3.0",
      description: "The complete Inkest experience on infrastructure you control.",
      features: [
        "Every product feature",
        "Unlimited notes and files",
        "Bring your own AI key",
        "Docker deployment",
        "Community updates",
      ],
      cta: "Deploy Inkest",
      href: "#open-source",
      featured: false,
    },
    {
      label: "For effortless focus",
      name: "Cloud",
      price: billingCycle === "monthly" ? "$9" : "$99",
      suffix: billingCycle === "monthly" ? "/ month" : "/ year",
      subtext:
        billingCycle === "monthly"
          ? "Flexible monthly subscription"
          : "Billed annually · save $9 / year",
      description: "The same open-source core, fully managed without a server to maintain.",
      features: [
        "Everything self-hosted includes",
        "Automatic backups & updates",
        "Seamless cloud sync",
        "Optional AI credits",
        "Priority support",
      ],
      cta: "Get started with Cloud",
      href: "/signup",
      featured: true,
    },
  ];

  return (
    <section id="pricing" className="pricing-section">
      <div className="pricing-heading reveal">
        <p className="marketing-eyebrow">Simple choices, no feature games</p>
        <h2 className="marketing-section-title">
          Pay for hosting.
          <br />
          Not permission.
        </h2>

        <div className="pricing-toggle-wrap">
          <div
            className="pricing-toggle"
            role="group"
            aria-label="Billing frequency"
          >
            <button
              type="button"
              className={`pricing-toggle-btn ${billingCycle === "monthly" ? "active" : ""}`}
              onClick={() => setBillingCycle("monthly")}
              aria-pressed={billingCycle === "monthly"}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`pricing-toggle-btn ${billingCycle === "yearly" ? "active" : ""}`}
              onClick={() => setBillingCycle("yearly")}
              aria-pressed={billingCycle === "yearly"}
            >
              Yearly
              <span className="pricing-toggle-badge">Save $9/yr</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`pricing-card reveal ${plan.featured ? "pricing-card--featured" : ""}`}
          >
            <p className="marketing-eyebrow">{plan.label}</p>
            <h3>{plan.name}</h3>
            <div className="pricing-price">
              <strong>{plan.price}</strong>
              <span>{plan.suffix}</span>
            </div>
            {plan.subtext && (
              <p className="pricing-subtext">{plan.subtext}</p>
            )}
            <p className="pricing-description">{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href={plan.href} className="pricing-cta">
              {plan.cta}
              <ArrowUpRight />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
