import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Download,
  FileArchive,
  GitBranch,
  Laptop,
  Monitor,
  ShieldCheck,
  Smartphone,
  Tablet,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { formatDateShort } from "@/lib/dates";
import { formatFileSize, groupReleaseForDownload } from "@/lib/download-assets";
import type { PlatformId } from "@/lib/download-assets";
import {
  GITHUB_RELEASES_URL,
  GITHUB_REPO_URL,
  GITHUB_TAGS_URL,
  getGithubReleases,
} from "@/server/github";

export const metadata: Metadata = {
  title: "Download Inkest",
  description:
    "Download the latest Inkest release for Windows, macOS, Linux, Android, and iOS. Every installer is published on the Inkest GitHub release tags.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Download Inkest",
    description:
      "Installers for Windows, macOS, Linux, Android, and iOS — published on GitHub.",
    url: "/download",
    type: "website",
  },
};

const PLATFORM_ICONS: Record<PlatformId, LucideIcon> = {
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
  android: Smartphone,
  ios: Tablet,
  checksums: ShieldCheck,
};

export default async function DownloadPage() {
  const releases = await getGithubReleases();
  const latest = releases[0] ? groupReleaseForDownload(releases[0]) : null;
  const olderReleases = releases.slice(1);

  return (
    <div className="download-page">
      <header className="download-hero">
        <p className="marketing-eyebrow">Downloads · GitHub release tags</p>
        <h1 className="marketing-section-title">
          Take Inkest <em>everywhere.</em>
        </h1>
        <p className="download-hero-copy">
          Native installers for every platform, published automatically with each
          release tag on GitHub. No account, no telemetry — just the app.
        </p>
        <div className="download-hero-links">
          <a
            href={GITHUB_TAGS_URL}
            target="_blank"
            rel="noreferrer"
            className="marketing-button marketing-button--ghost"
          >
            <GitBranch className="size-4" aria-hidden="true" />
            Browse all tags on GitHub
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="download-inline-link"
          >
            Releases &amp; changelogs
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </header>

      {!latest ? (
        <section className="download-empty" aria-live="polite">
          <FileArchive className="size-8" aria-hidden="true" />
          <h2>Downloads are available on GitHub</h2>
          <p>
            We couldn&apos;t reach the GitHub release feed right now. Every
            installer is always available on the repository&apos;s tags page.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={GITHUB_TAGS_URL}
              target="_blank"
              rel="noreferrer"
              className="marketing-button marketing-button--primary"
            >
              Open the tags page
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="marketing-button marketing-button--ghost"
            >
              Open releases
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      ) : (
        <>
          <section className="download-latest" aria-labelledby="latest-release">
            <div className="download-latest-head">
              <div>
                <p className="download-latest-label">Latest release</p>
                <h2 id="latest-release" className="download-latest-title">
                  {latest.release.releaseName ?? latest.release.tagName}
                  {latest.release.isPrerelease ? (
                    <span className="download-badge download-badge--pre">pre-release</span>
                  ) : (
                    <span className="download-badge">stable</span>
                  )}
                </h2>
                <p className="download-latest-meta">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  Published {formatDateShort(latest.release.publishedAt)}
                  <span aria-hidden="true">·</span>
                  <a
                    href={latest.release.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="download-inline-link"
                  >
                    Release notes
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </a>
                </p>
              </div>
            </div>

            <div className="platform-grid">
              {latest.platforms.map((platform) => {
                const Icon = PLATFORM_ICONS[platform.id];
                return (
                  <article key={platform.id} className="platform-card">
                    <header className="platform-card-head">
                      <span className="platform-card-icon">
                        <Icon className="size-4.5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3>{platform.label}</h3>
                        <p>{platform.hint}</p>
                      </div>
                    </header>
                    <ul className="platform-assets">
                      {platform.assets.map((asset) => (
                        <li key={asset.downloadUrl} className="asset-row">
                          <div className="asset-meta">
                            <span className="asset-name">{asset.name}</span>
                            <span className="asset-info">
                              {asset.size > 0 && formatFileSize(asset.size)}
                              {asset.size > 0 && asset.downloadCount > 0 && " · "}
                              {asset.downloadCount > 0 &&
                                `${asset.downloadCount} download${asset.downloadCount === 1 ? "" : "s"}`}
                            </span>
                          </div>
                          <a
                            href={asset.downloadUrl}
                            className="asset-download"
                            aria-label={`Download ${asset.name}`}
                          >
                            <Download className="size-3.5" aria-hidden="true" />
                            Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

            <div className="download-source">
              <p className="download-source-label">Build it yourself</p>
              <div className="download-source-links">
                {latest.sourceArchives.map((archive) => (
                  <a
                    key={archive.downloadUrl}
                    href={archive.downloadUrl}
                    className="download-source-link"
                  >
                    <GitBranch className="size-3.5" aria-hidden="true" />
                    {archive.name}
                    <span className="sr-only"> for {latest.release.tagName}</span>
                  </a>
                ))}
                <a
                  href={`${GITHUB_REPO_URL}/blob/main/README.md`}
                  target="_blank"
                  rel="noreferrer"
                  className="download-source-link"
                >
                  Build instructions
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          {olderReleases.length > 0 && (
            <section className="download-archive" aria-labelledby="older-releases">
              <h2 id="older-releases" className="download-archive-title">
                Previous releases
              </h2>
              <ul className="download-archive-list">
                {olderReleases.map((release) => (
                  <li key={release.tagName} className="download-archive-row">
                    <span className="download-archive-tag">{release.tagName}</span>
                    <span className="download-archive-date">
                      {formatDateShort(release.publishedAt)}
                    </span>
                    <a
                      href={release.releaseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="download-inline-link"
                    >
                      View on GitHub
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="download-archive-foot">
                The full history of tags lives on{" "}
                <a href={GITHUB_TAGS_URL} target="_blank" rel="noreferrer" className="download-inline-link">
                  the GitHub tags page
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
                .
              </p>
            </section>
          )}
        </>
      )}

      <footer className="download-foot">
        <p>
          Prefer the browser?{" "}
          <Link href="/signup" className="download-inline-link">
            Start your workspace in the cloud
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>{" "}
          or <Link href="/docs/self-hosting" className="download-inline-link">self-host with Docker</Link>.
        </p>
      </footer>
    </div>
  );
}
