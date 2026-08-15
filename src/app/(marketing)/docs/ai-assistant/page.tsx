import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Bot,
} from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

export const metadata: Metadata = {
  title: "AI Assistant & Privacy",
  description:
    "Complete setup guide for OpenAI, OpenRouter, Ollama, Zen, NVIDIA Build, and AI privacy in Inkest.",
};

function GuideCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col gap-3 p-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  return (
    <article className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-4" />
          <span>AI & Intelligence</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          AI Assistant & Privacy Architecture
        </h1>
        <p className="text-sm text-muted-foreground">
          Inkest brings thoughtful AI directly into your writing and thinking workflow. Configure any OpenAI-compatible provider
          or run private local models offline with Ollama.
        </p>
      </div>

      {/* Setup Section */}
      <section id="ai-setup" className="flex flex-col gap-4 scroll-mt-20">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Cpu className="size-4.5 text-primary" />
          <h2>Configuring an AI Provider</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Go to{" "}
          <Link href="/settings?tab=ai" className="text-primary underline underline-offset-4 font-medium">
            Settings → AI & Prompts
          </Link>{" "}
          and pick any provider below. Your personal API key is securely encrypted at rest and resolved only on the server.
        </p>

        <div id="providers" className="mt-2 grid gap-4 sm:grid-cols-2 scroll-mt-20">
          <GuideCard title="OpenAI">
            <p>
              Create an API key at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                platform.openai.com/api-keys
              </a>
              . Paste it directly into Inkest Settings — the default endpoint (<code>https://api.openai.com/v1</code>) and model (<code>gpt-4o</code>) are pre-configured.
            </p>
          </GuideCard>

          <GuideCard title="OpenRouter">
            <p>
              Create a key at{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                openrouter.ai/keys
              </a>
              . OpenRouter provides a single unified OpenAI-compatible endpoint to access hundreds of models (Claude 3.7 Sonnet, DeepSeek R1, Llama 3.3, Gemini 2.0 Flash).
            </p>
          </GuideCard>

          <GuideCard title="opencode Zen">
            <p>
              Sign in at{" "}
              <a href="https://opencode.ai/zen" target="_blank" rel="noopener noreferrer">
                opencode.ai/zen
              </a>
              , set up billing, and copy your key. Zen provides hosted open-weights models behind a dependable OpenAI-compatible proxy.
            </p>
          </GuideCard>

          <GuideCard title="NVIDIA Build">
            <p>
              Generate an API key at{" "}
              <a href="https://build.nvidia.com" target="_blank" rel="noopener noreferrer">
                build.nvidia.com
              </a>
              . NVIDIA Build provides fast NIM endpoints for open models including Llama 3.3 70B and Nemotron.
            </p>
          </GuideCard>

          <div className="sm:col-span-2">
            <GuideCard title="Ollama (100% Free, Local, Offline)">
              <p>
                Run local models directly on your hardware without sending data across the internet. Install{" "}
                <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">
                  Ollama
                </a>
                , then pull your preferred model:
              </p>
              <CopyCodeBlock code="ollama pull llama3.2" />
              <p>
                Select &ldquo;Ollama&rdquo; in Inkest Settings. If running Inkest inside Docker, point the base URL to your host machine:
              </p>
              <CopyCodeBlock code="http://host.docker.internal:11434/v1" />
            </GuideCard>
          </div>
        </div>
      </section>

      {/* AI Privacy & Data Flow */}
      <section id="privacy" className="surface-card flex flex-col gap-6 p-6 scroll-mt-20">
        <div className="flex items-center gap-2 border-b border-border/70 pb-4">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Privacy, Safety & Control</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">When Data is Sent</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Inkest never sends note text to AI models in the background. AI calls execute strictly when you explicitly invoke an action from the editor or AI sidebar.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Writing, reading, searching, spellchecking, and exporting happen 100% locally on your machine or private server.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Review Before Applying</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              All AI generations (summaries, text improvements, extracted tasks, Mermaid diagrams) are presented as reviewable proposals. Nothing overwrites your note unless you confirm.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Key Security & Isolation</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your API keys are encrypted at rest using server secrets and are never exposed in browser bundles, DOM trees, or client network logs.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Token Limits & Cost Controls</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Configure maximum input and output token caps in Settings. Oversized inputs are safely truncated before reaching provider APIs to prevent surprise billing charges.
            </p>
          </div>
        </div>
      </section>

      {/* Agent Harness */}
      <section id="agent-harness" className="surface-card flex flex-col gap-4 p-6 scroll-mt-20">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Bot className="size-4.5 text-primary" />
          <h2>Agent Harness & Background Reasoning</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The Agent Harness enables multi-step autonomous workflows such as structuring raw thoughts into formatted project briefs or organizing interconnected tasks.
        </p>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Step Limits:</strong> Configure maximum reasoning loops in Settings to avoid unbounded loops.
          </p>
          <p>
            <strong className="text-foreground">Granular Permissions:</strong> Explicitly toggle whether agents have permission to modify notes or create tasks.
          </p>
        </div>
      </section>
    </article>
  );
}
