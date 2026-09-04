import { z } from "zod";

/**
 * GitHub releases integration.
 *
 * Public download assets are attached to release tags on
 * https://github.com/ekbatani/inkest — this module is the single place that
 * talks to the GitHub REST API to read them. No secrets involved: the
 * repository is public, so requests are unauthenticated and aggressively
 * cached through the Next.js data cache to stay well inside the rate limit.
 */

export const GITHUB_REPO_OWNER = "ekbatani";
export const GITHUB_REPO_NAME = "inkest";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
export const GITHUB_TAGS_URL = `${GITHUB_REPO_URL}/tags`;

const RELEASES_PER_PAGE = 10;

export interface GithubAsset {
  name: string;
  size: number;
  downloadCount: number;
  downloadUrl: string;
}

export interface GithubRelease {
  tagName: string;
  releaseName: string | null;
  releaseUrl: string;
  isPrerelease: boolean;
  publishedAt: string;
  assets: GithubAsset[];
}

const githubApiReleaseSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullable(),
  html_url: z.string().url(),
  prerelease: z.boolean(),
  published_at: z.string(),
  assets: z.array(
    z.object({
      name: z.string(),
      size: z.number(),
      download_count: z.number(),
      browser_download_url: z.string().url(),
    }),
  ),
});

/**
 * Fetch the repository's GitHub releases (newest first). Returns an empty
 * array when the API is unreachable or rate-limited — callers must render a
 * fallback that still points people at the GitHub releases page.
 */
export async function getGithubReleases(): Promise<GithubRelease[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases?per_page=${RELEASES_PER_PAGE}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 60 * 60 },
      },
    );
    if (!response.ok) {
      return [];
    }

    const payload: unknown = await response.json();
    return z.array(githubApiReleaseSchema).parse(payload).map((release) => ({
      tagName: release.tag_name,
      releaseName: release.name,
      releaseUrl: release.html_url,
      isPrerelease: release.prerelease,
      publishedAt: release.published_at,
      assets: release.assets.map((asset) => ({
        name: asset.name,
        size: asset.size,
        downloadCount: asset.download_count,
        downloadUrl: asset.browser_download_url,
      })),
    }));
  } catch {
    return [];
  }
}
