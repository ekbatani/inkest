import type { Metadata } from "next";
import { Keyboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Keyboard Shortcuts",
  description: "Speed up your note-taking and navigation with keyboard shortcuts in Inkest.",
};

const SHORTCUT_GROUPS = [
  {
    category: "Global & Navigation",
    shortcuts: [
      { key: "Ctrl + K / Cmd + K", desc: "Open quick search & command palette" },
      { key: "Ctrl + N / Cmd + N", desc: "Create a new note" },
      { key: "Ctrl + Shift + D", desc: "Jump directly to today's daily journal" },
      { key: "Esc", desc: "Close open modal, sidebar, or dialog" },
    ],
  },
  {
    category: "Markdown Editor",
    shortcuts: [
      { key: "Ctrl + B / Cmd + B", desc: "Format selection as bold (**text**)" },
      { key: "Ctrl + I / Cmd + I", desc: "Format selection as italic (*text*)" },
      { key: "Ctrl + Shift + X", desc: "Format selection as strikethrough (~~text~~)" },
      { key: "Ctrl + `", desc: "Inline code or code block" },
      { key: "Ctrl + S / Cmd + S", desc: "Instant save / persist note" },
      { key: "[[", desc: "Trigger wiki-link autocomplete note search" },
      { key: "#", desc: "Add or search workspace tag" },
      { key: "- [ ] ", desc: "Create an interactive checklist item" },
    ],
  },
  {
    category: "AI & Actions",
    shortcuts: [
      { key: "Ctrl + J / Cmd + J", desc: "Toggle AI assistant sidebar" },
      { key: "/summarize", desc: "Quick prompt: summarize open note" },
      { key: "/tasks", desc: "Quick prompt: extract actionable tasks" },
      { key: "/improve", desc: "Quick prompt: improve writing & grammar" },
    ],
  },
];

export default function KeyboardShortcutsPage() {
  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Keyboard className="size-4" />
          <span>Productivity</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Keyboard Shortcuts
        </h1>
        <p className="text-sm text-muted-foreground">
          Keep your hands on the keyboard and fly through writing, connecting, and searching.
        </p>
      </div>

      {/* Shortcuts List */}
      <div className="flex flex-col gap-6">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.category} className="surface-card flex flex-col gap-4 p-6">
            <h2 className="text-base font-semibold text-foreground">
              {group.category}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-border/40">
                  {group.shortcuts.map((s) => (
                    <tr key={s.key} className="py-2.5">
                      <td className="py-2.5 pr-4 text-muted-foreground">{s.desc}</td>
                      <td className="py-2.5 text-right font-mono">
                        <kbd className="rounded border border-border/80 bg-muted/60 px-2 py-1 text-[11px] font-medium text-foreground shadow-2xs">
                          {s.key}
                        </kbd>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
