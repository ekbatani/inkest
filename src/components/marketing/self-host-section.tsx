import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

const DOCKER_COMMAND = `docker run -d \\
  -p 3000:3000 \\
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \\
  -v inkest-data:/app/data \\
  -v inkest-storage:/app/storage \\
  ghcr.io/ekbatani/inkest:latest`;

export function SelfHostSection() {
  return (
    <section id="self-host" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="surface-card grid grid-cols-1 gap-8 overflow-hidden p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="ai-badge">Open source</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Self-host it for free, forever.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Inkest is AGPL-3.0. Run it on your own server with one Docker command — your
            notes stay on your disk, your AI keys stay in your settings, and nothing is
            gated behind a subscription. A hosted Cloud plan is on the way for people who&apos;d
            rather not manage a server, but self-hosting will always be the same
            full-featured app.
          </p>
        </div>
        <CopyCodeBlock code={DOCKER_COMMAND} />
      </div>
    </section>
  );
}
