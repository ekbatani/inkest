import type { Metadata } from "next";
import { Server, Terminal, HardDrive, Settings, RefreshCw } from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

export const metadata: Metadata = {
  title: "Self-Hosting & Docker",
  description:
    "Deploy Inkest on your own hardware or server with Docker, configure environment variables, and manage backups.",
};

const COMPOSE_EXAMPLE = `version: "3.8"

services:
  inkest:
    image: ghcr.io/ekbatani/inkest:latest
    container_name: inkest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
      - BETTER_AUTH_SECRET=generate_a_strong_random_secret_string
      - BETTER_AUTH_URL=http://localhost:3000
      - DATABASE_URL=file:/app/data/inkest.db
      - STORAGE_DRIVER=local
      - STORAGE_LOCAL_PATH=/app/data/attachments
      - TELEGRAM_BOT_TOKEN=
      - TELEGRAM_WEBHOOK_SECRET=
    volumes:
      - inkest-data:/app/data

volumes:
  inkest-data:
    driver: local`;

export default function SelfHostingPage() {
  return (
    <article className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Server className="size-4" />
          <span>Operations</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Self-Hosting & Docker Deployment
        </h1>
        <p className="text-sm text-muted-foreground">
          Inkest is open-source (AGPL-3.0) and designed to run completely isolated on your own hardware or VPS without third-party dependencies.
        </p>
      </div>

      {/* Quick Run */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Terminal className="size-4.5 text-primary" />
          <h2>Single Command Docker Run</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The fastest way to test or run a single-node instance of Inkest:
        </p>
        <CopyCodeBlock
          code={`docker run -d \\
  --name inkest \\
  -p 3000:3000 \\
  -e BETTER_AUTH_SECRET="change-this-to-a-secure-random-secret" \\
  -v inkest-data:/app/data \\
  ghcr.io/ekbatani/inkest:latest`}
        />
      </section>

      {/* Docker Compose */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <HardDrive className="size-4.5 text-primary" />
          <h2>Production docker-compose.yml</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Save the following configuration as <code>docker-compose.yml</code> and run <code>docker compose up -d</code>:
        </p>
        <CopyCodeBlock code={COMPOSE_EXAMPLE} />
      </section>

      {/* Environment Variables Table */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Settings className="size-4.5 text-primary" />
          <h2>Environment Variables</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/70 text-muted-foreground">
              <tr>
                <th className="pb-2 font-semibold">Variable</th>
                <th className="pb-2 font-semibold">Default</th>
                <th className="pb-2 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-muted-foreground">
              <tr>
                <td className="py-2.5 font-mono text-foreground">BETTER_AUTH_SECRET</td>
                <td className="py-2.5"><em>Required</em></td>
                <td className="py-2.5">Secret used to sign session tokens and encrypt sensitive data at rest.</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono text-foreground">NEXT_PUBLIC_APP_URL</td>
                <td className="py-2.5"><code>http://localhost:3000</code></td>
                <td className="py-2.5">Publicly accessible domain name for your instance.</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono text-foreground">DATABASE_URL</td>
                <td className="py-2.5"><code>file:./data/inkest.db</code></td>
                <td className="py-2.5">SQLite database location or Turso/libSQL endpoint connection string.</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono text-foreground">STORAGE_DRIVER</td>
                <td className="py-2.5"><code>local</code></td>
                <td className="py-2.5">Attachment storage backend: <code>local</code> or <code>s3</code> (MinIO / AWS).</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono text-foreground">TELEGRAM_BOT_TOKEN</td>
                <td className="py-2.5"><em>Optional</em></td>
                <td className="py-2.5">HTTP Bot token obtained from @BotFather for reminders.</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono text-foreground">TELEGRAM_WEBHOOK_SECRET</td>
                <td className="py-2.5"><em>Optional</em></td>
                <td className="py-2.5">Secret token passed to authenticate incoming webhook requests.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Backups & Maintenance */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <RefreshCw className="size-4.5 text-primary" />
          <h2>Backups & Restores</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Because Inkest stores all data inside the SQLite database file and local attachment directory, backing up is as simple as copying the volume:
        </p>
        <CopyCodeBlock code="docker cp inkest:/app/data ./inkest-backup-$(date +%F)" />
      </section>
    </article>
  );
}
