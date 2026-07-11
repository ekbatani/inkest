import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22 0 1.6-.02 2.9-.02 3.29 0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="cta-panel reveal surface-card overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-20">
        <div className="cta-panel__aurora" aria-hidden="true" />
        <div className="cta-panel__grid" aria-hidden="true" />

        <div className="relative mx-auto max-w-2xl">
          <span className="ai-badge">Start in seconds · free forever to self-host</span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Your next thought deserves a calmer page.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
            Spin up Inkest in one command, or let us host it. Markdown-first, AI-assisted,
            and entirely yours.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="btn-sheen w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Start writing
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={
                <a
                  href="https://github.com/ekbatani/inkest"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <GithubMark className="size-4" />
              Star on GitHub
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            No credit card · open source · AGPL-3.0
          </p>
        </div>
      </div>
    </section>
  );
}
