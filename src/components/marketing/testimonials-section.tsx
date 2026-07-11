import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  featured?: boolean;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I moved my whole second brain into Inkest in an afternoon. It's the first Markdown app where the AI actually feels like part of the page instead of a chatbot bolted onto the corner — I select a messy paragraph, hit improve, and keep writing.",
    name: "Maya Okonkwo",
    role: "Staff engineer",
    initials: "MO",
    featured: true,
  },
  {
    quote:
      "Self-hosting was one Docker command and my notes never leave my server. That's the whole pitch for me.",
    name: "Daniel Reyes",
    role: "Indie hacker",
    initials: "DR",
  },
  {
    quote:
      "The daily notes plus calendar sync replaced three separate tools. Everything I need is on one calm page.",
    name: "Priya Nair",
    role: "Product designer",
    initials: "PN",
  },
  {
    quote:
      "First-class RTL support that actually works. I write in Farsi and English in the same note and it just handles it.",
    name: "Arman Tehrani",
    role: "Researcher",
    initials: "AT",
  },
  {
    quote:
      "Extract-tasks turns my meeting scribbles into a real to-do list. It reads like magic and saves me an hour a day.",
    name: "Lena Brandt",
    role: "Founder",
    initials: "LB",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="reveal mx-auto mb-12 max-w-2xl text-center">
        <span className="ai-badge">Loved by careful writers</span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Notes that feel like yours again.
        </h2>
        <p className="mt-3 text-muted-foreground text-pretty">
          People who left heavier apps for something quieter — and stayed.
        </p>
      </div>

      <div className="reveal grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className={cn(
              "bento-cell surface-card flex flex-col p-6",
              t.featured && "sm:col-span-2 lg:row-span-2 lg:justify-between",
            )}
          >
            <div
              className="mb-4 flex gap-0.5 text-[var(--ai-start)]"
              aria-label="Five out of five stars"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" aria-hidden="true" />
              ))}
            </div>

            <blockquote
              className={cn(
                "text-pretty text-foreground/90",
                t.featured ? "text-lg leading-relaxed sm:text-xl" : "text-sm leading-relaxed",
              )}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            <figcaption className="mt-6 flex items-center gap-3">
              <span
                className={cn(
                  "avatar-ring flex items-center justify-center rounded-full font-semibold",
                  t.featured ? "size-11 text-sm" : "size-9 text-xs",
                )}
                aria-hidden="true"
              >
                {t.initials}
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
