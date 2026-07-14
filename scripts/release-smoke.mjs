#!/usr/bin/env bun

const DEFAULT_BASE_URL = "http://localhost:3000";

function usage() {
  console.log(`Usage: bun run smoke -- [--base-url <url>]

Runs the unauthenticated release preflight. Continue with
docs/release-smoke-test.md for the authenticated browser checks.`);
}

function parseArgs(args) {
  let baseUrl = process.env.SMOKE_BASE_URL ?? DEFAULT_BASE_URL;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--base-url") {
      const value = args[index + 1];
      if (!value) throw new Error("--base-url requires a URL.");
      baseUrl = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("--base-url must use http or https.");
  }
  return url.toString().replace(/\/$/, "");
}

const baseUrl = parseArgs(process.argv.slice(2));

const checks = [
  { name: "landing page", path: "/", status: 200 },
  { name: "sign-in page", path: "/signin", status: 200 },
  { name: "sign-up page", path: "/signup", status: 200 },
  {
    name: "dashboard requires sign-in",
    path: "/dashboard",
    redirectTo: "/signin",
  },
  {
    name: "Google Calendar connect requires sign-in",
    path: "/api/calendar/google/connect",
    redirectTo: "/signin",
  },
];

let failures = 0;
console.log(`Release smoke preflight: ${baseUrl}`);

for (const check of checks) {
  const url = new URL(check.path, `${baseUrl}/`);
  try {
    const response = await fetch(url, { redirect: "manual" });
    const location = response.headers.get("location");
    const passed =
      check.status !== undefined
        ? response.status === check.status
        : response.status >= 300 &&
          response.status < 400 &&
          location !== null &&
          new URL(location, url).pathname === check.redirectTo;

    if (passed) {
      console.log(`PASS  ${check.name}`);
    } else {
      failures += 1;
      const expected =
        check.status !== undefined
          ? `HTTP ${check.status}`
          : `redirect to ${check.redirectTo}`;
      console.error(
        `FAIL  ${check.name}: expected ${expected}; received HTTP ${response.status}${location ? ` (${location})` : ""}`,
      );
    }
  } catch (error) {
    failures += 1;
    console.error(
      `FAIL  ${check.name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} preflight check(s) failed.`);
  process.exit(1);
}

console.log("\nPreflight passed. Complete the authenticated checks in docs/release-smoke-test.md.");
