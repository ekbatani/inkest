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

      {/* Admin Bot Creation */}
      <section id="setup" className="surface-card flex flex-col gap-5 p-6 scroll-mt-20">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            1
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Create the Bot (Instance Admin)
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
            . Send the command <code>/newbot</code>, follow the prompts to choose a name and username, and copy the HTTP API token.
          </p>

          <p>
            Add the token to your server environment variables and restart Inkest:
          </p>
          <CopyCodeBlock code="TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVWXyz" />

          <p>
            Register your webhook by running this curl command (replace <code>&lt;TOKEN&gt;</code>, <code>&lt;YOUR_DOMAIN&gt;</code>, and <code>&lt;SECRET&gt;</code>):
          </p>
          <CopyCodeBlock
            code={`curl -F "url=https://<YOUR_DOMAIN>/api/telegram/webhook" \\
  -F "secret_token=<YOUR_TELEGRAM_WEBHOOK_SECRET>" \\
  "https://api.telegram.org/bot<TOKEN>/setWebhook"`}
          />
          <p className="text-xs text-muted-foreground">
            Make sure <code>TELEGRAM_WEBHOOK_SECRET</code> is set on the server matching the secret passed in the webhook URL.
          </p>
        </div>
      </section>

      {/* User Account Linking */}
      <section id="linking" className="surface-card flex flex-col gap-5 p-6 scroll-mt-20">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            2
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Link Your Account (Every User)
          </h2>
        </div>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground pl-10">
          <p>
            Navigate to{" "}
            <Link
              href="/settings?tab=notifications"
              className="font-medium text-primary underline underline-offset-4"
            >
              Settings → Notifications
            </Link>{" "}
            and click <strong className="text-foreground">Generate linking code</strong>.
          </p>
          <p>
            Open a private chat with your Telegram bot and send:
          </p>
          <CopyCodeBlock code="/start <YOUR_CODE>" />
          <p className="text-xs text-muted-foreground">
            Linking codes are single-use and expire after 15 minutes. Once linked, the bot securely binds your Telegram chat ID to your Inkest user account.
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
