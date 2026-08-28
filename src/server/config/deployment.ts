/**
 * Deployment environment helper.
 *
 * Distinguishes between Cloud (multi-tenant / managed hosted) and Self-Hosted deployments.
 * Inkest defaults to Self-Hosted mode unless explicitly configured.
 */

export type DeploymentMode = "cloud" | "self-hosted";

export function getDeploymentMode(): DeploymentMode {
  const env = (
    process.env.INKEST_DEPLOYMENT_ENV ||
    process.env.DEPLOYMENT_ENV ||
    ""
  ).toLowerCase();

  const isCloud =
    env === "cloud" ||
    process.env.INKEST_CLOUD === "true" ||
    process.env.NEXT_PUBLIC_INKEST_CLOUD === "true";

  return isCloud ? "cloud" : "self-hosted";
}

export function isCloudDeployment(): boolean {
  return getDeploymentMode() === "cloud";
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
