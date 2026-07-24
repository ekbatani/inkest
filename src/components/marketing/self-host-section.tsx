import { Check, Cloud, Database, GitFork, LockKeyhole, Server } from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

const DOCKER_COMMAND = `docker run -d \\
  -p 3000:3000 \\
  -v inkest-data:/app/data \\
  ghcr.io/ekbatani/inkest:latest`;

export function SelfHostSection() {
  return (
    <section id="open-source" className="ownership-section">
      <div className="ownership-copy reveal">
        <p className="marketing-eyebrow">Your vault · your rules</p>
        <h2 className="marketing-section-title">Own the place<br />where you think.</h2>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--marketing-muted)]">
          Inkest is open source because your private knowledge should never depend on a
          company&apos;s permission. Keep it on your server, inspect every line, and leave any time.
        </p>
        <ul className="ownership-points">
          <li><LockKeyhole /><span><strong>Private by default</strong>Your notes and AI keys stay under your control.</span></li>
          <li><Database /><span><strong>Portable forever</strong>Standard Markdown and complete data exports.</span></li>
          <li><GitFork /><span><strong>Built in public</strong>AGPL-3.0 source, available to everyone.</span></li>
        </ul>
      </div>

      <div className="ownership-visual reveal">
        <div className="ownership-choice">
          <Server />
          <div><small>FULL CONTROL</small><strong>Self-hosted</strong><span>Your server · Your database</span></div>
          <Check />
        </div>
        <div className="ownership-connector"><span>or</span></div>
        <div className="ownership-choice ownership-choice--cloud">
          <Cloud />
          <div><small>ZERO MAINTENANCE</small><strong>Inkest Cloud</strong><span>Managed · Backed up · Updated</span></div>
        </div>
        <CopyCodeBlock code={DOCKER_COMMAND} />
      </div>
    </section>
  );
}
