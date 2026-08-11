"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Sparkles,
  Loader2,
  Send,
  Trash2,
  X,
  Copy,
  Check,
  Plus,
  Replace,
  FileText,
  Wand2,
  ListChecks,
  GitGraph,
  Languages,
  HelpCircle,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getSelectedEditorText,
  insertTextAtCursor,
  replaceEntireEditorContent,
  replaceSelectedEditorText,
} from "@/components/editor/markdown-editor-utils";
import {
  runAiChatPromptAction,
  summarizeNoteAction,
  improveWritingAction,
  extractTasksAction,
  generateMermaidAction,
  translateTextAction,
  explainTextAction,
} from "@/server/ai/chat-actions";
import { cn } from "@/lib/utils";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

const MarkdownPreview = dynamic(
  () => import("@/components/markdown/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  timestamp: Date;
};

type Props = {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
  onClose?: () => void;
};

const PRESET_PROMPTS = [
  {
    id: "summarize",
    label: "Summarize note",
    icon: Sparkles,
    prompt: "Summarize the key points of this note concisely.",
  },
  {
    id: "improve",
    label: "Improve writing",
    icon: Wand2,
    prompt: "Improve the writing style, grammar, and structure of this note.",
  },
  {
    id: "extract-tasks",
    label: "Extract tasks",
    icon: ListChecks,
    prompt: "Extract all actionable tasks and checklist items from this note into a clean task list.",
  },
  {
    id: "mermaid",
    label: "Generate diagram",
    icon: GitGraph,
    prompt: "Generate a Mermaid flowchart or diagram representing the core concept in this note.",
  },
  {
    id: "translate",
    label: "Translate to English",
    icon: Languages,
    prompt: "Translate the content or selection to clear English.",
  },
  {
    id: "explain",
    label: "Explain context",
    icon: HelpCircle,
    prompt: "Explain the concepts and background of this note in simple terms.",
  },
];

export function AiChatSidebar({
  noteId,
  noteTitle,
  noteContent,
  editorRef,
  onClose,
}: Props) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [selectedText, setSelectedText] = React.useState<string | null>(null);

  const scrollBottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Check selection whenever user focuses or clicks inside the chat
  const refreshSelection = React.useCallback(() => {
    const sel = getSelectedEditorText(editorRef);
    setSelectedText(sel);
  }, [editorRef]);

  React.useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSendPrompt = React.useCallback(
    async (overridePrompt?: string, presetId?: string) => {
      const userText = (overridePrompt ?? input).trim();
      if (!userText || isGenerating) return;

      const currentSelection = getSelectedEditorText(editorRef);
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!overridePrompt) setInput("");
      setIsGenerating(true);

      try {
        let resultOutput = "";
        let isSuccess = false;
        let errorMessage = "";

        // Use dedicated specs when preset matches, else use general chat action
        if (presetId === "summarize") {
          const res = await summarizeNoteAction({
            noteId,
            noteTitle,
            noteContent,
            selectedText: currentSelection ?? undefined,
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "improve") {
          const res = await improveWritingAction({
            noteId,
            noteTitle,
            noteContent,
            selectedText: currentSelection ?? undefined,
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "extract-tasks") {
          const res = await extractTasksAction({
            noteId,
            noteTitle,
            noteContent,
            selectedText: currentSelection ?? undefined,
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output.tasks
              .map((t) => `- [ ] ${t.title}${t.description ? `: ${t.description}` : ""}`)
              .join("\n");
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "mermaid") {
          const res = await generateMermaidAction({
            noteId,
            noteTitle,
            noteContent,
            selectedText: currentSelection ?? undefined,
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "translate") {
          const res = await translateTextAction({
            noteId,
            noteTitle,
            selectedText: currentSelection || noteContent,
            targetLanguage: "English",
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "explain") {
          const res = await explainTextAction({
            noteId,
            noteTitle,
            selectedText: currentSelection || noteContent,
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
          } else {
            errorMessage = res.error;
          }
        } else {
          // General conversation prompt
          const historyForServer = messages
            .filter((m) => !m.isError)
            .map((m) => ({ role: m.role, content: m.content }));

          const res = await runAiChatPromptAction({
            noteId,
            noteTitle,
            noteContent,
            selectedText: currentSelection ?? undefined,
            userPrompt: userText,
            history: historyForServer,
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
          } else {
            errorMessage = res.error;
          }
        }

        if (isSuccess) {
          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: resultOutput,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          const errorMsg: ChatMessage = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: errorMessage || "Failed to generate AI response.",
            isError: true,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } catch {
        toast.error("Error communicating with AI provider.");
      } finally {
        setIsGenerating(false);
      }
    },
    [input, isGenerating, editorRef, messages, noteId, noteTitle, noteContent],
  );

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied response to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertAtCursor = (text: string) => {
    insertTextAtCursor(editorRef, text);
    toast.success("Inserted text into note");
  };

  const handleReplaceSelection = (text: string) => {
    const sel = getSelectedEditorText(editorRef);
    if (!sel) {
      toast.error("No text selected in editor to replace");
      return;
    }
    replaceSelectedEditorText(editorRef, text);
    toast.success("Replaced selection in note");
  };

  const handleReplaceEntireNote = (text: string) => {
    replaceEntireEditorContent(editorRef, text);
    toast.success("Replaced entire note content");
  };

  const handleClearHistory = () => {
    setMessages([]);
    toast.info("Cleared conversation history");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-none">AI Assistant</h2>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                <FileCode2 className="size-3 text-muted-foreground" />
                {selectedText ? "Selected text" : "Current note"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClearHistory}
              title="Clear chat history"
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close AI Assistant">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Message History */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-medium text-foreground">How can I help with this note?</h3>
            <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
              Ask questions, transform writing, or choose a quick preset action below.
            </p>

            <div className="mt-5 w-full space-y-1.5">
              <p className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Quick Actions
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_PROMPTS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSendPrompt(preset.prompt, preset.id)}
                      className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-muted/50"
                    >
                      <Icon className="size-3.5 text-violet-500 shrink-0" />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1.5 text-xs",
                  msg.role === "user" ? "items-end" : "items-start",
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                  {msg.role === "user" ? "You" : "AI Assistant"}
                </span>

                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[95%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : msg.isError
                        ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-xs"
                        : "bg-muted/40 border border-border/60 text-foreground rounded-tl-xs w-full",
                  )}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : msg.isError ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownPreview content={msg.content} />
                    </div>
                  )}

                  {/* Actions bar for Assistant responses */}
                  {msg.role === "assistant" && !msg.isError && (
                    <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border/40 pt-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleInsertAtCursor(msg.content)}
                        className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        title="Insert response at current cursor position"
                      >
                        <Plus className="size-3" />
                        Insert
                      </Button>

                      {selectedText && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleReplaceSelection(msg.content)}
                          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          title="Replace currently selected text"
                        >
                          <Replace className="size-3" />
                          Replace Selection
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleReplaceEntireNote(msg.content)}
                        className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        title="Replace entire note content"
                      >
                        <FileText className="size-3" />
                        Replace Note
                      </Button>

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="ml-auto h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {copiedId === msg.id ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin text-violet-500" />
                <span>Thinking & generating response...</span>
              </div>
            )}
            <div ref={scrollBottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-3 bg-background">
        <div className="relative flex flex-col rounded-2xl border border-border/70 bg-muted/20 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <Textarea
            ref={textareaRef}
            value={input}
            onFocus={refreshSelection}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendPrompt();
              }
            }}
            placeholder={
              selectedText
                ? "Ask AI about selected text..."
                : "Ask AI or type a prompt... (Enter to send)"
            }
            className="min-h-[64px] max-h-[160px] resize-none border-0 bg-transparent px-3 py-2.5 text-xs shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-[10px] text-muted-foreground/60">
              Shift+Enter for newline
            </span>
            <Button
              size="icon-sm"
              disabled={!input.trim() || isGenerating}
              onClick={() => void handleSendPrompt()}
              className="size-7 rounded-xl bg-primary text-primary-foreground shadow-xs"
            >
              {isGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
