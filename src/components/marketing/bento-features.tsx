import {
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  Link2,
  Sparkles,
} from "lucide-react";

export function BentoFeatures() {
  return (
    <section id="product" className="marketing-section">
      <div className="marketing-feature-grid">
        <article className="feature-card feature-card--write reveal">
          <div className="feature-card-copy">
            <span className="feature-number">01</span>
            <p className="marketing-eyebrow">Write without friction</p>
            <h3>Markdown that feels like a blank page—not a syntax lesson.</h3>
            <p>Rich formatting, wiki links, diagrams, attachments, RTL writing, and full export freedom.</p>
          </div>
          <div className="writing-demo" aria-hidden="true">
            <div className="writing-demo-toolbar"><b>B</b><i>I</i><span>H1</span><Link2 /><Sparkles /></div>
            <div className="writing-demo-page">
              <small>IDEA / 12 JULY</small>
              <strong>A slower kind of ambition</strong>
              <span className="writing-line writing-line--long" />
              <span className="writing-line" />
              <mark>Make enough room for the work to surprise you.</mark>
            </div>
          </div>
        </article>

        <article className="feature-card feature-card--brain reveal">
          <span className="feature-number">02</span>
          <p className="marketing-eyebrow">Connect your digital brain</p>
          <h3>Ideas become more useful when they find each other.</h3>
          <p>Link notes, build nested spaces, add tags, and find any thought in seconds.</p>
          <div className="brain-map" aria-hidden="true">
            <span className="brain-node brain-node--center"><BrainCircuit /></span>
            <span className="brain-node brain-node--a"><FileText /></span>
            <span className="brain-node brain-node--b"><CalendarDays /></span>
            <span className="brain-node brain-node--c"><FolderKanban /></span>
            <svg viewBox="0 0 300 180"><path d="M150 90 66 38M150 90 244 42M150 90 236 145M150 90 66 145" /></svg>
          </div>
        </article>

        <article className="feature-card feature-card--ai reveal">
          <span className="feature-number">03</span>
          <p className="marketing-eyebrow">AI in the margins</p>
          <h3>Help that appears in context—and leaves when it&apos;s done.</h3>
          <p>Improve a paragraph, summarize a note, translate a passage, or turn a brainstorm into tasks.</p>
          <div className="ai-prompt-demo" aria-hidden="true">
            <span className="ai-orbit"><Sparkles /></span>
            <div><small>INKest AI</small><strong>Turn this into a clear project plan</strong></div>
            <ArrowUpRight />
          </div>
        </article>

        <article className="feature-card feature-card--plan reveal">
          <div className="feature-card-copy">
            <span className="feature-number">04</span>
            <p className="marketing-eyebrow">Turn thought into progress</p>
            <h3>Your notes and projects finally speak the same language.</h3>
            <p>Shape an idea, extract the work, and track it across a focused project board.</p>
          </div>
          <div className="kanban-demo" aria-hidden="true">
            {[
              ["TO DO", "Write the brief", "Shape the visual system"],
              ["IN PROGRESS", "Prototype the new flow"],
              ["DONE", "Collect research", "Define the goal"],
            ].map(([title, ...cards]) => (
              <div key={title} className="kanban-column">
                <small>{title}</small>
                {cards.map((card) => <span key={card}><CheckCircle2 />{card}</span>)}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
