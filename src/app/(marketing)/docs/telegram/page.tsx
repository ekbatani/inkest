import type { Metadata } from "next";
import Link from "next/link";
import { Send, Bell } from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

export const metadata: Metadata = {
  title: "Telegram Bot Integration",
  description:
    "Step-by-step guide to setting up a Telegram bot, webhook secret, linking user accounts, and receiving task reminders.",
};

export default function TelegramDocsPage() {
  return (
    <article className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Send className="size-4" />
          <span>Integrations</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Telegram Bot & Notification Setup
        </h1>
        <p className="text-sm text-muted-foreground">
          Receive asynchronous AI results, morning task reminders, and daily journaling nudges directly in Telegram.
        </p>
      </div>

      {/* Bot Creation & Token */}
      <section id="setup" className="surface-card flex flex-col gap-5 p-6 scroll-mt-20">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            1
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Create Your Bot on Telegram
          </h2>
        </div>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground pl-10">
          <p>
            Open Telegram and message{" "}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              @BotFather
            </a>
            . Send the command <code>/newbot</code>, follow the prompts to choose a name and username (e.g. <code>my_inkest_bot</code>), and copy the HTTP API token.
          </p>
        </div>
      </section>

      {/* In-App Webhook Setup */}
      <section id="webhook" className="surface-card flex flex-col gap-5 p-6 scroll-mt-20">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            2
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Save Bot Token & Register Webhook (In-App)
          </h2>
        </div>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground pl-10">
          <p>
            Navigate to{" "}
            <Link
              href="/settings?tab=notifications"
              className="font-medium text-primary underline underline-offset-4"
            >
              Settings → Notifications & Services
            </Link>
            .
          </p>
          <ol className="list-decimal pl-4 flex flex-col gap-2">
            <li>
              Paste your HTTP API token in the <strong>Bot API Token</strong> field and click <strong>Save Bot Token</strong>.
            </li>
            <li>
              Under <strong>Webhook Registration</strong>, click <strong>Register Webhook</strong>. Inkest will securely register your endpoint with Telegram&apos;s servers directly.
            </li>
          </ol>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
            ✨ <strong>Zero terminal setup:</strong> You do not need to run manual <code>curl</code> commands or edit server environment variables. Everything is configured and verified directly in the UI.
          </div>
        </div>
      </section>

      {/* User Account Linking */}
      <section id="linking" className="surface-card flex flex-col gap-5 p-6 scroll-mt-20">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            3
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Pair Your Telegram Account
          </h2>
        </div>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground pl-10">
          <p>
            In <Link href="/settings?tab=notifications" className="font-medium text-primary underline underline-offset-4">Settings → Notifications</Link>, click <strong>Generate Pairing Code</strong>.
          </p>
          <p>
            Click the <strong>Open in Telegram & Press Start</strong> button to launch Telegram with your one-time code preloaded, or manually message your bot:
          </p>
          <CopyCodeBlock code="/start <YOUR_CODE>" />
          <p className="text-xs text-muted-foreground">
            Linking codes expire after 15 minutes. Once paired, Inkest securely binds your Telegram chat ID to your workspace.
          </p>
        </div>
      </section>

      {/* Notification Options */}
      <section id="notifications" className="surface-card flex flex-col gap-4 p-6 scroll-mt-20">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Bell className="size-4.5 text-primary" />
          <h2>Available Notification Triggers</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-1.5">
            <h4 className="text-xs font-semibold text-foreground">AI Action Results</h4>
            <p className="text-[11px] text-muted-foreground">
              Get notified immediately when long-running agent tasks or document transformations complete.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-1.5">
            <h4 className="text-xs font-semibold text-foreground">Task Due Reminders</h4>
            <p className="text-[11px] text-muted-foreground">
              Receive timely morning digests of tasks and project milestones scheduled for today.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-1.5">
            <h4 className="text-xs font-semibold text-foreground">Daily Journal Nudges</h4>
            <p className="text-[11px] text-muted-foreground">
              A gentle daily reminder to capture reflections and review your notes.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
