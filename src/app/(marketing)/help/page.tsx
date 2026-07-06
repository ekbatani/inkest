import type { Metadata } from "next";
import Link from "next/link";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

export const metadata: Metadata = {
  title: "Help",
  description: "Set up an AI provider and Telegram notifications for Inkest.",
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
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <span className="ai-badge">Help</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Get set up
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Two things unlock the rest of Inkest: an AI provider (for every AI action in the
        editor) and, optionally, Telegram (for AI action results and reminders). Both are
        configured in{" "}
        <Link href="/settings" className="text-foreground underline underline-offset-4">
          Settings
        </Link>{" "}
        — the guides below just cover getting the key or bot token.
      </p>

      <section id="ai" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-semibold tracking-tight">Set up AI</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Any OpenAI-compatible endpoint works. Pick one below, paste the key (and base
          URL/model if you changed the default) into Settings → AI provider.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <GuideCard title="OpenAI">
            <p>
              Create a key at{" "}
              <a href="https://platform.openai.com/api-keys" rel="noopener noreferrer">
                platform.openai.com/api-keys
              </a>
              . Paste it in as-is — base URL and model already default to OpenAI.
            </p>
          </GuideCard>

          <GuideCard title="OpenRouter">
            <p>
              Create a key at{" "}
              <a href="https://openrouter.ai/keys" rel="noopener noreferrer">
                openrouter.ai/keys
              </a>
              . OpenRouter proxies dozens of models behind one OpenAI-compatible API —
              handy if you want to try a specific model without a direct account.
            </p>
          </GuideCard>

          <GuideCard title="opencode Zen">
            <p>
              Sign in at{" "}
              <a href="https://opencode.ai/zen" rel="noopener noreferrer">
                opencode.ai/zen
              </a>
              , add billing, and copy your API key. Zen is a curated gateway to several
              hosted models (including a few free ones) behind a single OpenAI-compatible
              endpoint — good if you don&apos;t want to pick a model provider yourself.
            </p>
          </GuideCard>

          <GuideCard title="Ollama (free, local, self-hosted)">
            <p>
              Install{" "}
              <a href="https://ollama.com" rel="noopener noreferrer">
                Ollama
              </a>
              , then pull a model:
            </p>
            <CopyCodeBlock code="ollama pull llama3.2" />
            <p>
              Select &ldquo;Ollama&rdquo; as the provider in Settings — no API key
              needed. If Inkest runs in Docker, point the base URL at your host machine
              (e.g. <code>http://host.docker.internal:11434/v1</code>) instead of
              <code> localhost</code>.
            </p>
          </GuideCard>
        </div>
      </section>

      <section id="telegram" className="mt-14 scroll-mt-20">
        <h2 className="text-xl font-semibold tracking-tight">Connect Telegram</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          One bot serves every account on your instance; each user links their own chat from
          Settings → Notifications, so reminders go to the right person.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <GuideCard title="1. Create the bot (server admin, once)">
            <p>
              Message{" "}
              <a href="https://t.me/BotFather" rel="noopener noreferrer">
                @BotFather
              </a>{" "}
              on Telegram, run <code>/newbot</code>, and copy the bot token it gives you.
            </p>
            <p>
              Set it as the server environment variable <code>TELEGRAM_BOT_TOKEN</code> and
              restart Inkest.
            </p>
            <p>
              Then tell Telegram where to send updates by calling <code>setWebhook</code>{" "}
              once (replace both placeholders):
            </p>
            <CopyCodeBlock code={`curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_DOMAIN>/api/telegram/webhook"`} />
            <p>
              Optional: set <code>TELEGRAM_WEBHOOK_SECRET</code> on the server and pass{" "}
              <code>&amp;secret_token=&lt;same value&gt;</code> in the URL above, so the
              webhook route rejects requests that aren&apos;t really from Telegram.
            </p>
          </GuideCard>

          <GuideCard title="2. Link your account (every user)">
            <p>
              In{" "}
              <Link href="/settings" className="text-foreground underline underline-offset-4">
                Settings → Notifications
              </Link>
              , click &ldquo;Generate linking code&rdquo;, then message the bot:
            </p>
            <CopyCodeBlock code="/start ABC123" />
            <p>
              The code expires after 15 minutes. Once linked, toggle which notifications you
              want — AI action results, task due reminders, daily note nudges.
            </p>
            <p>
              Self-hosting a single-user instance without a public URL? You can skip the bot
              entirely and set <code>TELEGRAM_BOT_TOKEN</code> +{" "}
              <code>TELEGRAM_CHAT_ID</code> as env vars instead — that fallback keeps working
              even with nobody linked.
            </p>
          </GuideCard>
        </div>
      </section>
    </div>
  );
}
