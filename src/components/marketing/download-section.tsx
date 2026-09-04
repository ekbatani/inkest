import Link from "next/link";
import { ArrowUpRight, Download, GitBranch, Monitor, Smartphone } from "lucide-react";
import { GITHUB_TAGS_URL } from "@/server/github";

const DEVICES = ["Windows", "macOS", "Linux", "Android", "iOS"] as const;

export function DownloadSection() {
  return (
    <section id="download" className="download-section">
      <div className="reveal">
        <p className="marketing-eyebrow">Apps for every screen</p>
        <h2 className="marketing-section-title">
          Your brain, <em>installed.</em>
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--mk-muted)]">
          Inkest ships as native apps alongside the web workspace. Every installer
          is published with a release tag on GitHub — grab the latest build, or
          pin the exact version you trust.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link className="marketing-button marketing-button--primary btn-sheen" href="/download">
            <Download className="size-4" aria-hidden="true" />
            Get the apps
          </Link>
          <a
            className="marketing-button marketing-button--ghost"
            href={GITHUB_TAGS_URL}
            target="_blank"
            rel="noreferrer"
          >
            <GitBranch className="size-4" aria-hidden="true" />
            All release tags
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2" aria-label="Supported platforms">
          <li className="flex items-center gap-1.5 text-xs font-medium text-[var(--mk-muted)]">
            <Monitor className="size-3.5 text-[var(--mk-indigo-bright)]" aria-hidden="true" />
            Desktop
          </li>
          <li className="flex items-center gap-1.5 text-xs font-medium text-[var(--mk-muted)]">
            <Smartphone className="size-3.5 text-[var(--mk-indigo-bright)]" aria-hidden="true" />
            Mobile
          </li>
          {DEVICES.map((device) => (
            <li key={device} className="text-xs font-medium text-[var(--mk-faint)]">
              {device}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
