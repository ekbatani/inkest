import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  GitBranch,
  Globe,
  Laptop,
  Monitor,
  Smartphone,
  TabletSmartphone,
  Terminal,
} from "lucide-react";
import { GITHUB_TAGS_URL } from "@/server/github";

const PLATFORMS = [
  { name: "Windows", kind: "Desktop", icon: Monitor },
  { name: "macOS", kind: "Desktop", icon: Laptop },
  { name: "Linux", kind: "Desktop", icon: Terminal },
  { name: "Android", kind: "Mobile", icon: Smartphone },
  { name: "iOS", kind: "Mobile", icon: TabletSmartphone },
  { name: "Web", kind: "Any browser", icon: Globe },
] as const;

export function DownloadSection() {
  return (
    <section id="download" className="download-section" aria-labelledby="download-title">
      <div className="reveal">
        <p className="marketing-eyebrow">Apps for every screen</p>
        <h2 id="download-title" className="marketing-section-title">
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
      </div>

      <ul className="download-platforms reveal" aria-label="Supported platforms">
        {PLATFORMS.map(({ name, kind, icon: Icon }) => (
          <li key={name} className="download-platform">
            <span className="download-platform-icon">
              <Icon aria-hidden="true" />
            </span>
            <span>
              <strong>{name}</strong>
              <small>{kind}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
