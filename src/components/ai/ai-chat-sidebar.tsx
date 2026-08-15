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
  Split,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  History,
  AtSign,
  Lock,
  Unlock,
  KeyRound,
  Folder,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getSelectedEditorText,
  insertTextAtCursor,
  replaceEntireEditorContent,
  replaceSelectedEditorText,
  appendTextToEditor,
  prependTextToEditor,
  applyGentlePatch,
} from "@/components/editor/markdown-editor-utils";
import { AiCitationList, type CitationItem } from "@/components/ai/ai-citation-list";
import { AiDiffViewer } from "@/components/ai/ai-diff-viewer";
import {
  runAiChatPromptAction,
  summarizeNoteAction,
  improveWritingAction,
  gentlyEditNoteAction,
  extractTasksAction,
  generateMermaidAction,
  translateTextAction,
  explainTextAction,
  getChatThreadMessagesAction,
  deleteChatThreadAction,
  searchContextItemsAction,
  type AiContextItem,
} from "@/server/ai/chat-actions";
import { decryptVaultSecret } from "@/lib/vault-crypto";
import { usePageContext } from "@/components/providers/page-context-provider";
import { ChatHistoryDrawer } from "./chat-history-drawer";
import { useChatScroll, ScrollToBottomButton } from "./scroll-controls";
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
  citations?: CitationItem[];
  transformType?: string;
  uncertaintyNote?: string;
  timestamp: Date;
  targetScope?: "selection" | "note";
  originalSourceSnippet?: string;
};

type Props = {
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
  onClose?: () => void;
};

const PRESET_PROMPTS = [
  {
    id: "gently-polish",
    label: "Gently polish note",
    icon: Wand2,
    prompt: "Gently polish the text, refining sentence flow, phrasing, and clarity without changing meaning or formatting.",
  },
  {
    id: "summarize",
    label: "Summarize note",
    icon: Sparkles,
    prompt: "Summarize the key points of this note concisely.",
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
}: Props = {}) {
  const { pageContext } = usePageContext();
  const fallbackEditorRef = React.useRef<ReactCodeMirrorRef | null>(null);

  const activeNoteId = noteId ?? pageContext.noteId ?? "";
  const activeNoteTitle = noteTitle ?? pageContext.pageTitle ?? "Workspace";
  const activeNoteContent = noteContent ?? pageContext.pageContent ?? "";
  const activeEditorRef = editorRef ?? pageContext.editorRef ?? fallbackEditorRef;

  const [isPageContextAttached, setIsPageContextAttached] = React.useState(true);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [selectedText, setSelectedText] = React.useState<string | null>(null);

  // Diff Review Modal state
  const [diffModal, setDiffModal] = React.useState<{
    isOpen: boolean;
    original: string;
    modified: string;
    targetScope: "selection" | "note";
  } | null>(null);

  // Context Referencing state
  const [attachedContexts, setAttachedContexts] = React.useState<AiContextItem[]>([]);
  const [contextPickerOpen, setContextPickerOpen] = React.useState(false);
  const [contextSearchQuery, setContextSearchQuery] = React.useState("");
  const [contextSearchResults, setContextSearchResults] = React.useState<AiContextItem[]>([]);
  const [isSearchingContext, setIsSearchingContext] = React.useState(false);

  // Vault Password Modal state
  const [vaultModalOpen, setVaultModalOpen] = React.useState(false);
  const [pendingVaultItem, setPendingVaultItem] = React.useState<AiContextItem | null>(null);
  const [vaultMasterPassword, setVaultMasterPassword] = React.useState("");
  const [isVerifyingVault, setIsVerifyingVault] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const refreshSelection = React.useCallback(() => {
    const sel = getSelectedEditorText(activeEditorRef);
    setSelectedText(sel);
  }, [activeEditorRef]);

  const {
    containerRef,
    isAtBottom,
    hasUnread,
    scrollToBottom,
    handleKeyDown,
  } = useChatScroll({
    deps: [messages],
    isGenerating,
  });

  // Search context items on query change or when picker opens
  React.useEffect(() => {
    if (!contextPickerOpen) return;
    let isMounted = true;
    const doSearch = async () => {
      setIsSearchingContext(true);
      try {
        const res = await searchContextItemsAction(contextSearchQuery);
        if (isMounted && res.success && res.items) {
          setContextSearchResults(res.items);
        }
      } catch {
        if (isMounted) toast.error("Failed to search workspace context");
      } finally {
        if (isMounted) setIsSearchingContext(false);
      }
    };
    const debounce = setTimeout(doSearch, 150);
    return () => {
      isMounted = false;
      clearTimeout(debounce);
    };
  }, [contextPickerOpen, contextSearchQuery]);

  // Load thread messages when activeThreadId changes
  const handleSelectThread = React.useCallback(async (threadId: string) => {
    setActiveThreadId(threadId);
    setIsLoadingMessages(true);
    try {
      const res = await getChatThreadMessagesAction(threadId);
      if (res.success && res.messages) {
        setMessages(
          res.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            isError: m.isError,
            timestamp: new Date(m.createdAt),
          })),
        );
      } else {
        toast.error(res.error || "Could not load messages");
      }
    } catch {
      toast.error("Failed to load thread messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleNewChat = React.useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
    setAttachedContexts([]);
    setInput("");
  }, []);

  const handleSelectContextItem = (item: AiContextItem) => {
    if (item.type === "vault" && !item.content) {
      setPendingVaultItem(item);
      setVaultModalOpen(true);
      setContextPickerOpen(false);
      return;
    }

    setAttachedContexts((prev) => {
      if (prev.some((c) => c.id === item.id)) return prev;
      return [...prev, item];
    });
    setContextPickerOpen(false);
    toast.success(`Attached ${item.type} "${item.title}"`);
  };

  const handleRemoveContextItem = (id: string) => {
    setAttachedContexts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleVerifyVaultPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVaultItem || !vaultMasterPassword.trim()) {
      toast.error("Enter your Vault master password.");
      return;
    }

    setIsVerifyingVault(true);
    try {
      const parts = (pendingVaultItem.ciphertext || "").split(":");
      const salt = parts[0] || "";
      const cipherHex = parts[1] || pendingVaultItem.ciphertext || "";

      const plainSecret = await decryptVaultSecret(
        cipherHex,
        pendingVaultItem.iv || "",
        salt,
        vaultMasterPassword.trim(),
      );

      const decryptedItem: AiContextItem = {
        ...pendingVaultItem,
        content: plainSecret,
      };

      setAttachedContexts((prev) => [
        ...prev.filter((c) => c.id !== decryptedItem.id),
        decryptedItem,
      ]);

      toast.success(`Vault secret "${pendingVaultItem.title}" decrypted & attached.`);
      setVaultModalOpen(false);
      setPendingVaultItem(null);
      setVaultMasterPassword("");
    } catch {
      toast.error("Incorrect master password. Vault access denied.");
    } finally {
      setIsVerifyingVault(false);
    }
  };

  const handleSendPrompt = React.useCallback(
    async (overridePrompt?: string, presetId?: string) => {
      const userText = (overridePrompt ?? input).trim();
      if (!userText || isGenerating) return;

      const currentSelection = getSelectedEditorText(activeEditorRef);
      const targetScope: "selection" | "note" = currentSelection ? "selection" : "note";
      const originalSourceSnippet = currentSelection || activeNoteContent;

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
        let citations: CitationItem[] | undefined;
        let transformType: string | undefined;
        let uncertaintyNote: string | undefined;
        let returnedThreadId: string | undefined;

        if (presetId === "gently-polish") {
          const res = await gentlyEditNoteAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            selectedText: currentSelection ?? undefined,
          });
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Gentle Polish";
            uncertaintyNote = res.uncertaintyNote;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "summarize") {
          const res = await summarizeNoteAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            selectedText: currentSelection ?? undefined,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Summary";
            uncertaintyNote = res.uncertaintyNote;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "improve") {
          const res = await improveWritingAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            selectedText: currentSelection ?? undefined,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Improve Writing";
            uncertaintyNote = res.uncertaintyNote;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "extract-tasks") {
          const res = await extractTasksAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            selectedText: currentSelection ?? undefined,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output.tasks
              .map((t) => `- [ ] ${t.title}${t.description ? `: ${t.description}` : ""}`)
              .join("\n");
            citations = res.citations;
            transformType = "Task Extraction";
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "mermaid") {
          const res = await generateMermaidAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            selectedText: currentSelection ?? undefined,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Diagram Generation";
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "translate") {
          const res = await translateTextAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            selectedText: currentSelection || activeNoteContent,
            targetLanguage: "English",
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Translation";
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "explain") {
          const res = await explainTextAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            selectedText: currentSelection || activeNoteContent,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Explanation";
          } else {
            errorMessage = res.error;
          }
        } else {
          // General conversation prompt with workspace grounding
          const historyForServer = messages
            .filter((m) => !m.isError)
            .map((m) => ({ role: m.role, content: m.content }));

          const res = await runAiChatPromptAction({
            noteId: isPageContextAttached ? activeNoteId : undefined,
            noteTitle: isPageContextAttached ? activeNoteTitle : undefined,
            noteContent: isPageContextAttached ? activeNoteContent : undefined,
            selectedText: isPageContextAttached ? currentSelection ?? undefined : undefined,
            includePageContext: isPageContextAttached,
            userPrompt: userText,
            history: historyForServer,
            enableGrounding: true,
            threadId: activeThreadId ?? undefined,
            attachedContexts: attachedContexts.length > 0 ? attachedContexts : undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = res.transformType;
            uncertaintyNote = res.uncertaintyNote;
          } else {
            errorMessage = res.error;
          }
        }

        if (returnedThreadId && returnedThreadId !== activeThreadId) {
          setActiveThreadId(returnedThreadId);
        }

        if (isSuccess) {
          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: resultOutput,
            citations,
            transformType,
            uncertaintyNote,
            timestamp: new Date(),
            targetScope,
            originalSourceSnippet,
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
    [input, isGenerating, activeEditorRef, messages, activeNoteId, activeNoteTitle, activeNoteContent, activeThreadId, attachedContexts, isPageContextAttached],
  );

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied response to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ADD actions
  const handleInsertAtCursor = (text: string) => {
    if (!activeEditorRef.current) {
      toast.error("No active editor to insert text into");
      return;
    }
    insertTextAtCursor(activeEditorRef, text);
    toast.success("Inserted text into note");
  };

  const handleAppendToNote = (text: string) => {
    appendTextToEditor(activeEditorRef, text);
    toast.success("Appended text to note");
  };

  const handlePrependToNote = (text: string) => {
    prependTextToEditor(activeEditorRef, text);
    toast.success("Prepended text to note");
  };

  // REPLACE actions
  const handleReplaceSelection = (text: string) => {
    if (!activeEditorRef.current) {
      toast.error("No active editor to replace text in");
      return;
    }
    const sel = getSelectedEditorText(activeEditorRef);
    if (!sel) {
      toast.error("No text selected in editor to replace");
      return;
    }
    replaceSelectedEditorText(activeEditorRef, text);
    toast.success("Replaced selection in note");
  };

  const handleReplaceEntireNote = (text: string) => {
    if (!activeEditorRef.current) {
      toast.error("No active editor to replace content in");
      return;
    }
    replaceEntireEditorContent(activeEditorRef, text);
    toast.success("Replaced entire note content");
  };

  // GENTLE EDIT / DIFF actions
  const handleOpenDiffReview = (msg: ChatMessage) => {
    const currentSelection = getSelectedEditorText(activeEditorRef);
    const scope = msg.targetScope || (currentSelection ? "selection" : "note");
    const original = (scope === "selection" ? currentSelection : activeNoteContent) || msg.originalSourceSnippet || activeNoteContent;

    setDiffModal({
      isOpen: true,
      original,
      modified: msg.content,
      targetScope: scope,
    });
  };

  const handleApplyGentleEdit = (text: string, targetScope: "selection" | "note") => {
    applyGentlePatch(activeEditorRef, text, targetScope);
    toast.success(
      targetScope === "selection"
        ? "Applied gentle edit to selection"
        : "Applied gentle edit to note",
    );
    setDiffModal(null);
  };

  const handleDeleteCurrentThread = async () => {
    if (activeThreadId) {
      try {
        await deleteChatThreadAction(activeThreadId);
        toast.info("Deleted current chat thread");
      } catch {}
    }
    handleNewChat();
  };

  const handleDeleteThreadFromDrawer = (deletedId: string) => {
    if (deletedId === activeThreadId) {
      handleNewChat();
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background"
      onKeyDown={handleKeyDown}
    >
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
                {selectedText ? "Selected text context" : "Full note context"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewChat}
            title="Start new chat"
          >
            <Plus className="size-4 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHistoryOpen(true)}
            title="View chat history"
          >
            <History className="size-4 text-muted-foreground" />
          </Button>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleDeleteCurrentThread()}
              title="Clear / delete chat thread"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
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
      <div className="relative flex-1 min-h-0">
        <ScrollArea ref={containerRef} className="h-full px-4 py-3">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-violet-500" />
              <span>Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
                <Sparkles className="size-5" />
              </div>
              <h3 className="mt-3 text-sm font-medium text-foreground">How can I help with this note?</h3>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                Ask questions across your workspace, replace or add text, or choose a quick preset action below.
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
                      <div className="space-y-2.5">
                        {/* Citations from workspace */}
                        {msg.citations && msg.citations.length > 0 && (
                          <AiCitationList
                            citations={msg.citations}
                            transformType={msg.transformType}
                            uncertaintyNote={msg.uncertaintyNote}
                          />
                        )}

                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownPreview content={msg.content} />
                        </div>
                      </div>
                    )}

                    {/* Complete 3-Way Action Bar (Replace / Add / Gently Edit) */}
                    {msg.role === "assistant" && !msg.isError && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5">
                        {/* Gently Edit / Diff Review */}
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenDiffReview(msg)}
                          className="h-6.5 gap-1 rounded-lg px-2 text-[11px] font-medium text-violet-700 bg-violet-500/10 hover:bg-violet-500/20 dark:text-violet-300"
                          title="Review diff and gently apply edits"
                        >
                          <Split className="size-3" />
                          Gently Edit
                        </Button>

                        {/* Replace Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-6.5 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              />
                            }
                          >
                            <Replace className="size-3" />
                            Replace
                            <ChevronDown className="size-2.5 opacity-60" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44 text-xs">
                            <DropdownMenuLabel>Replace options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {selectedText && (
                              <DropdownMenuItem onClick={() => handleReplaceSelection(msg.content)}>
                                <Replace className="size-3.5 mr-1.5" />
                                Replace selection
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleReplaceEntireNote(msg.content)}>
                              <FileText className="size-3.5 mr-1.5" />
                              Replace entire note
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Add Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-6.5 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              />
                            }
                          >
                            <Plus className="size-3" />
                            Add
                            <ChevronDown className="size-2.5 opacity-60" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44 text-xs">
                            <DropdownMenuLabel>Add options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleInsertAtCursor(msg.content)}>
                              <Plus className="size-3.5 mr-1.5" />
                              Insert at cursor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAppendToNote(msg.content)}>
                              <ArrowDown className="size-3.5 mr-1.5" />
                              Append to bottom
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrependToNote(msg.content)}>
                              <ArrowUp className="size-3.5 mr-1.5" />
                              Prepend to top
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Copy */}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="ml-auto h-6.5 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
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
                  <span>Generating response with workspace context...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <ScrollToBottomButton
          visible={!isAtBottom}
          hasUnread={hasUnread}
          onClick={() => scrollToBottom("smooth")}
        />
      </div>

      {/* Context Tags Bar */}
      {(isPageContextAttached || attachedContexts.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-t bg-muted/20">
          {isPageContextAttached && activeNoteTitle && (
            <Badge
              variant="outline"
              className="gap-1 pr-1 text-[11px] font-normal transition-colors bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400"
            >
              <FileText className="size-3 shrink-0" />
              <span className="max-w-[130px] truncate">
                Page: {activeNoteTitle}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsPageContextAttached(false);
                  toast.info("Current page context detached");
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                title="Detach current page context"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          )}

          {attachedContexts.map((ctx) => (
            <Badge
              key={ctx.id}
              variant="outline"
              className={cn(
                "gap-1 pr-1 text-[11px] font-normal transition-colors",
                ctx.type === "vault"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : ctx.type === "project"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                    : "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400",
              )}
            >
              {ctx.type === "vault" ? (
                <Lock className="size-3 shrink-0" />
              ) : ctx.type === "project" ? (
                <Folder className="size-3 shrink-0" />
              ) : (
                <FileText className="size-3 shrink-0" />
              )}
              <span className="max-w-[120px] truncate">{ctx.title}</span>
              <button
                type="button"
                onClick={() => handleRemoveContextItem(ctx.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                title="Remove context"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-3 bg-background">
        <div className="relative flex flex-col rounded-2xl border border-border/70 bg-muted/20 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <Textarea
            ref={textareaRef}
            value={input}
            onFocus={refreshSelection}
            onChange={(e) => {
              const val = e.target.value;
              setInput(val);
              if (val.endsWith("@") || /@\w*$/.test(val)) {
                setContextPickerOpen(true);
              }
            }}
            onKeyDown={(e) => {
              handleKeyDown(e);
              if (e.defaultPrevented) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendPrompt();
              }
            }}
            placeholder={
              selectedText
                ? "Ask AI or instruct how to edit selected text..."
                : "Ask AI or type @ to reference notes, projects, files, or vault... (Enter to send)"
            }
            className="min-h-[64px] max-h-[160px] resize-none border-0 bg-transparent px-3 py-2.5 text-xs shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-2.5 pb-2">
            <div className="flex items-center gap-1">
              <Popover open={contextPickerOpen} onOpenChange={setContextPickerOpen}>
                <PopoverTrigger
                  className="inline-flex items-center h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                  title="Attach reference context (@notes, @projects, @vault)"
                >
                  <AtSign className="size-3 text-violet-500" />
                  Attach Context
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-[280px] p-2 space-y-2">
                  {!isPageContextAttached && activeNoteTitle && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPageContextAttached(true);
                        setContextPickerOpen(false);
                        toast.success(`Re-attached current page "${activeNoteTitle}"`);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 p-2 text-left text-xs font-medium text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-500/20"
                    >
                      <Plus className="size-3.5 shrink-0 text-violet-500" />
                      <span className="truncate">Attach page: {activeNoteTitle}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 border-b pb-2 px-1">
                    <Search className="size-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={contextSearchQuery}
                      onChange={(e) => setContextSearchQuery(e.target.value)}
                      placeholder="Search notes, projects, vault..."
                      className="h-7 text-xs border-0 focus-visible:ring-0 p-0"
                    />
                  </div>

                  <ScrollArea className="max-h-[180px] pr-1">
                    {isSearchingContext ? (
                      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1.5">
                        <Loader2 className="size-3.5 animate-spin text-violet-500" />
                        <span>Searching...</span>
                      </div>
                    ) : contextSearchResults.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No notes, projects, or vault items found
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {contextSearchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectContextItem(item)}
                            className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors hover:bg-muted/70 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {item.type === "vault" ? (
                                <Lock className="size-3.5 text-amber-500 shrink-0" />
                              ) : item.type === "project" ? (
                                <Folder className="size-3.5 text-blue-500 shrink-0" />
                              ) : (
                                <FileText className="size-3.5 text-violet-500 shrink-0" />
                              )}
                              <div className="truncate">
                                <p className="truncate text-xs font-medium text-foreground">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>
                            <Plus className="size-3 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                Shift+Enter for newline
              </span>
            </div>

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

      {/* Diff Review Dialog */}
      <Dialog
        open={Boolean(diffModal?.isOpen)}
        onOpenChange={(open) => !open && setDiffModal(null)}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" />
              Review AI Edits
            </DialogTitle>
            <DialogDescription>
              Inspect differences before gently applying edits to your {diffModal?.targetScope === "selection" ? "selected text" : "note"}.
            </DialogDescription>
          </DialogHeader>

          {diffModal && (
            <AiDiffViewer
              originalText={diffModal.original}
              modifiedText={diffModal.modified}
              scopeLabel={diffModal.targetScope === "selection" ? "Selected Text" : "Entire Note"}
              onApply={() => handleApplyGentleEdit(diffModal.modified, diffModal.targetScope)}
              onCancel={() => setDiffModal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Vault Password Modal */}
      <Dialog open={vaultModalOpen} onOpenChange={setVaultModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">Vault Master Password Required</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Accessing secret &ldquo;{pendingVaultItem?.title}&rdquo; requires your vault password.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={(e) => void handleVerifyVaultPassword(e)} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-muted-foreground" />
                Master Password
              </label>
              <Input
                type="password"
                value={vaultMasterPassword}
                onChange={(e) => setVaultMasterPassword(e.target.value)}
                placeholder="Enter master password..."
                autoFocus
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setVaultModalOpen(false);
                  setPendingVaultItem(null);
                  setVaultMasterPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!vaultMasterPassword.trim() || isVerifyingVault}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isVerifyingVault ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Unlock className="size-3.5" />
                )}
                Authorize Vault Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Chat History Drawer */}
      <ChatHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        activeThreadId={activeThreadId}
        onSelectThread={(tId) => void handleSelectThread(tId)}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThreadFromDrawer}
      />
    </div>
  );
}
