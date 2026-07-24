import { Check, Cloud, Database, GitFork, LockKeyhole, Server, Terminal } from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

const DOCKER_COMMAND = `docker run -d \\
  -p 3000:3000 \\
  -v inkest-data:/app/data \\
  ghcr.io/ekbatani/inkest:latest`;

export function SelfHostSection() {
  return (
    <section id="open-source" className="ownership-section">
      <div className="ownership-copy reveal">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Open Source &amp; Data Sovereign
        </div>
        
        <h2 className="marketing-section-title mt-4">
          Own the place<br />
          <span className="font-serif italic text-[var(--marketing-accent-bright)]">where you think.</span>
        </h2>

        <p className="mt-6 max-w-xl text-lg leading-8 text-[color-mix(in_oklch,var(--marketing-paper)_72%,transparent)]">
          Inkest is open source because private knowledge should never depend on a subscription service or cloud lock-in. Run it on your infrastructure, audit every line of code, and retain your Markdown files forever.
        </p>

        <ul className="ownership-points">
          <li>
            <LockKeyhole />
            <span>
              <strong>Private &amp; Encrypted Credentials</strong>
              AI API keys and vault secrets are AES-256 encrypted on the client. Your notes remain strictly your property.
            </span>
          </li>
          <li>
            <Database />
            <span>
              <strong>Zero Lock-in &amp; Plain Markdown</strong>
              Every note is stored as standard Markdown files and SQLite data. Full ZIP export with one click anytime.
            </span>
          </li>
          <li>
            <GitFork />
            <span>
              <strong>AGPL-3.0 Open Source Core</strong>
              Transparent development, community auditability, and zero telemetry tracking.
            </span>
          </li>
        </ul>
      </div>

      <div className="ownership-visual reveal">
        <div className="ownership-choice ownership-choice--primary">
          <Server className="size-6 text-[var(--marketing-accent-bright)] shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <small className="font-mono text-[10px] uppercase tracking-widest text-[var(--marketing-accent-bright)]">
                Recommended
              </small>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 font-semibold">
                100% Control
              </span>
            </div>
            <strong className="text-base text-white">Self-Hosted Docker Engine</strong>
            <span className="text-xs text-white/60 block">Your server · Your SQLite/libSQL database · Your AI keys</span>
          </div>
          <div className="size-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="size-3.5" />
          </div>
        </div>

        <div className="ownership-connector">
          <span>OR</span>
        </div>

        <div className="ownership-choice ownership-choice--cloud">
          <Cloud className="size-6 text-white/50 shrink-0" />
          <div>
            <small className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              Zero Maintenance
            </small>
            <strong className="text-base text-white/80">Inkest Cloud (Managed)</strong>
            <span className="text-xs text-white/40 block">Fully managed · Automated daily backups · Instant updates</span>
          </div>
        </div>

        <div className="terminal-card mt-6 rounded-xl border border-white/15 bg-black/60 backdrop-blur-md p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3 text-xs font-mono text-white/50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500/80" />
                <span className="size-2.5 rounded-full bg-amber-500/80" />
                <span className="size-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="flex items-center gap-1 text-[11px] text-white/70 ml-2">
                <Terminal className="size-3 text-emerald-400" /> Docker 1-Line Deploy
              </span>
            </div>
            <span>v0.4.0</span>
          </div>
          <CopyCodeBlock code={DOCKER_COMMAND} />
        </div>
      </div>
    </section>
  );
}
