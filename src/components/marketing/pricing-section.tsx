import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Self-hosted",
    price: "Free",
    cadence: "forever",
    description: "Run Inkest on your own server. Full features, your data, your keys.",
    features: [
      "All notes, projects & task features",
      "All AI actions (bring your own key)",
      "Unlimited notes & attachments",
      "Docker & docker-compose deploy",
      "Community support on GitHub",
    ],
    cta: { label: "Read the docs", href: "#self-host" },
    highlighted: false,
  },
  {
    name: "Cloud",
    price: "Coming soon",
    cadence: "",
    description: "Hosted for you — no server to manage. Same open-source core.",
    features: [
      "Everything in Self-hosted",
      "Managed backups & updates",
      "Optional AI credits included",
      "Priority email support",
    ],
    cta: { label: "Get notified", href: "/signup" },
    highlighted: true,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Free to self-host. Simple to scale.
        </h2>
        <p className="mt-3 text-muted-foreground">
          No feature paywalls. Cloud just means someone else runs the server for you.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "surface-card flex flex-col p-6",
              plan.highlighted && "border-foreground/30 shadow-sm",
            )}
          >
            <h3 className="text-sm font-semibold text-muted-foreground">{plan.name}</h3>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
              {plan.cadence && (
                <span className="text-sm text-muted-foreground">/{plan.cadence}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--ai-start)]" />
                  <span className="text-foreground/85">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-6"
              variant={plan.highlighted ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={plan.cta.href} />}
            >
              {plan.cta.label}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
