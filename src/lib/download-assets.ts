import { GITHUB_REPO_URL } from "@/server/github";
import type { GithubAsset, GithubRelease } from "@/server/github";

/**
 * Pure helpers that turn raw GitHub release assets into the platform-grouped
 * view model rendered by the /download page. No I/O happens here.
 */

/**
 * CI also uploads Rust `build_script_build*.exe` test artifacts to every
 * release tag. They are compiler internals, not user downloads, so they are
 * filtered out of the grouped view (everything stays available on the
 * GitHub release page, which we link to).
 */
const BUILD_ARTIFACT_PATTERN = /^build[-_]script[-_]build/i;

export type PlatformId =
  | "windows"
  | "macos"
  | "linux"
  | "android"
  | "ios"
  | "checksums";

export interface PlatformDownloads {
  id: PlatformId;
  label: string;
  hint: string;
  assets: GithubAsset[];
}

export interface GroupedRelease {
  release: GithubRelease;
  platforms: PlatformDownloads[];
  sourceArchives: GithubAsset[];
}

export function isBuildArtifact(asset: GithubAsset): boolean {
  return BUILD_ARTIFACT_PATTERN.test(asset.name);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function matchesAny(name: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(name));
}

const PLATFORM_RULES: Array<{
  id: PlatformId;
  label: string;
  hint: string;
  patterns: RegExp[];
  /** Preferred assets first inside the group (recommended installer on top). */
  priority: RegExp[];
}> = [
  {
    id: "windows",
    label: "Windows",
    hint: "Installer, portable & MSI",
    patterns: [/\.exe$/i, /\.msi$/i],
    priority: [/\.msi$/i, /-setup\.exe$/i, /\.exe$/i],
  },
  {
    id: "macos",
    label: "macOS",
    hint: "Apple Silicon & Intel",
    patterns: [/\.dmg$/i, /\.app\.tar\.gz$/i],
    priority: [/\.dmg$/i],
  },
  {
    id: "linux",
    label: "Linux",
    hint: "AppImage, deb & rpm",
    patterns: [/\.appimage$/i, /\.deb$/i, /\.rpm$/i],
    priority: [/\.appimage$/i, /\.deb$/i, /\.rpm$/i],
  },
  {
    id: "android",
    label: "Android",
    hint: "Debug & release APK builds",
    patterns: [/\.apk$/i],
    priority: [/release(?!-unsigned)/i],
  },
  {
    id: "ios",
    label: "iOS",
    hint: "Xcode project bundle",
    patterns: [/\.zip$/i],
    priority: [],
  },
];

const CHECKSUM_RULES: PlatformDownloads = {
  id: "checksums",
  label: "Checksums",
  hint: "Verify your download",
  assets: [],
};

function priorityIndex(name: string, priority: RegExp[]): number {
  const index = priority.findIndex((pattern) => pattern.test(name));
  return index === -1 ? priority.length : index;
}

/**
 * Group a release's downloadable assets by target platform, dropping CI
 * build artifacts. Source archives are synthesized from the release tag so
 * they always match the tag page ("Source code (zip)" / "(tar.gz)").
 */
export function groupReleaseForDownload(release: GithubRelease): GroupedRelease {
  const downloadable = release.assets.filter(
    (asset) => !isBuildArtifact(asset),
  );

  const platforms: PlatformDownloads[] = [];
  const checksums: GithubAsset[] = [];

  for (const asset of downloadable) {
    if (/sha256|checksum|\.sig$/i.test(asset.name)) {
      checksums.push(asset);
      continue;
    }
    const platform = PLATFORM_RULES.find((rule) =>
      matchesAny(asset.name, rule.patterns),
    );
    if (!platform) continue;
    let bucket = platforms.find((group) => group.id === platform.id);
    if (!bucket) {
      bucket = { id: platform.id, label: platform.label, hint: platform.hint, assets: [] };
      platforms.push(bucket);
    }
    bucket.assets.push(asset);
  }

  // Keep the rule order (Windows → macOS → Linux → Android → iOS) and sort
  // each group's assets so the recommended installer comes first.
  for (const group of platforms) {
    const rule = PLATFORM_RULES.find((candidate) => candidate.id === group.id);
    group.assets.sort(
      (a, b) =>
        priorityIndex(a.name, rule?.priority ?? []) -
        priorityIndex(b.name, rule?.priority ?? []),
    );
  }

  const tag = release.tagName;
  const sourceArchives: GithubAsset[] = [
    {
      name: "Source code (zip)",
      size: 0,
      downloadCount: 0,
      downloadUrl: `${GITHUB_REPO_URL}/archive/refs/tags/${tag}.zip`,
    },
    {
      name: "Source code (tar.gz)",
      size: 0,
      downloadCount: 0,
      downloadUrl: `${GITHUB_REPO_URL}/archive/refs/tags/${tag}.tar.gz`,
    },
  ];

  const checksumGroup: PlatformDownloads[] =
    checksums.length > 0
      ? [{ ...CHECKSUM_RULES, assets: checksums }]
      : [];

  return {
    release,
    platforms: [...platforms, ...checksumGroup],
    sourceArchives,
  };
}
