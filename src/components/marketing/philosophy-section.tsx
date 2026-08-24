import { Feather } from "lucide-react";

const PRINCIPLES = [
  {
    index: "01",
    title: "Calm over clutter",
    text: "No feeds to refresh, no streaks to keep, no red badges begging for attention. Inkest is a quiet room where thinking compounds instead of reacting.",
  },
  {
    index: "02",
    title: "Privacy is the product",
    text: "Your notes, your AI keys, your server. Nothing you write is analyzed, monetized, or trained on without your explicit say-so.",
  },
  {
    index: "03",
    title: "Yours, forever",
    text: "Plain Markdown on your own disk, open source under AGPL-3.0, exportable in one click — built to outlive any startup, including us.",
  },
] as const;

export function PhilosophySection() {
  return (
    <section id="philosophy" className="philosophy-section" aria-labelledby="philosophy-title">
      <div className="philosophy-grid">
        <div className="philosophy-lead reveal">
          <p className="marketing-eyebrow">Why Inkest exists</p>
          <h2 id="philosophy-title" className="marketing-section-title">
            Built on a<br />
            <em>simple belief.</em>
          </h2>
          <p>
            Most software fights for your attention. A workspace for your thoughts should do the
            opposite — it should make space, keep secrets, and never hold your mind hostage.
          </p>
          <p className="philosophy-manifesto">
            <Feather aria-hidden="true" />
            CAPTURE · ORGANIZE · THINK
          </p>
        </div>

        <div>
          <ol className="philosophy-principles">
            {PRINCIPLES.map((principle) => (
              <li key={principle.index} className="philosophy-principle reveal">
                <span className="philosophy-index" aria-hidden="true">{principle.index}</span>
                <div>
                  <h3>{principle.title}</h3>
                  <p>{principle.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <figure className="philosophy-vision reveal">
            <Feather className="watermark" aria-hidden="true" />
            <blockquote>
              Our vision: a second brain as permanent as paper and as powerful as the models that
              read it — <span className="mk-grad-text">your knowledge, your machine, your rules.</span>
            </blockquote>
            <figcaption>The Inkest vision</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
