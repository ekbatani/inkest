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
  Target,
  MessageSquarePlus,
  MessagesSquare,
  SpellCheck,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  createProjectPlanAction,
  clarifyAndFindGapsAction,
  checkTyposAction,
  commentSelectionAction,
  applyCommentsAction,
  getChatThreadMessagesAction,
  deleteChatThreadAction,
  searchContextItemsAction,
  type AiContextItem,
} from "@/server/ai/chat-actions";
import {
  getAiPlanningContextAction,
  saveAiTaskPlanAction,
} from "@/server/ai/planning-actions";
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

type ExtractedTask = {
  title: string;
  description?: string | null;
  priority: "none" | "low" | "medium" | "high";
  dueDate?: string | null;
  startDate?: string | null;
};

type PlanningContext = {
  currentProject: {
    id: string;
    title: string;
    dueDate?: Date | null;
    status?: string;
    priority?: string;
  } | null;
  projects: {
    id: string;
    title: string;
    parentId: string | null;
    dueDate?: Date | null;
    status?: string;
    priority?: string;
  }[];
};

type PlannedTask = ExtractedTask & {
  status: "todo" | "doing" | "done" | "canceled";
  dueDate: string;
  startDate: string;
};

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
  extractedTasks?: ExtractedTask[];
};

type Props = {
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
  onClose?: () => void;
};

type QuickAction = {
  id: string;
  label: string;
  category: "context" | "project" | "writing" | "structure" | "clarify" | "review";
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  prompt: string;
  requiresSelection?: boolean;
  needsLanguage?: boolean;
  needsPromptHint?: boolean;
  hintPlaceholder?: string;
};

function extractClarificationSuggestions(content: string): string[] {
  if (!content) return [];
  const suggestions: string[] = [];

  // Match questions in "### ❓ Clarifications" section or list items
  const clarificationMatch = content.match(
    /###\s*❓?\s*Clarifications[^\n]*\n([\s\S]*?)(?=\n###|\n\n\n|$)/i,
  );
  if (clarificationMatch?.[1]) {
    const lines = clarificationMatch[1].split("\n");
    for (const line of lines) {
      const clean = line.replace(/^[-*•\d.)\]\s]+/, "").trim();
      if (clean && clean.length > 5 && clean.length < 100) {
        suggestions.push(clean);
      }
    }
  }

  // Also check for bulleted bold items
  if (suggestions.length === 0) {
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^[-*•]\s+\*\*([^*?]+)\*\*\??/);
      if (match?.[1] && match[1].length > 4 && match[1].length < 70) {
        suggestions.push(match[1].trim());
      }
    }
  }

  return suggestions.slice(0, 4);
}

export function AiChatSidebar({
  noteId,
  noteTitle,
  noteContent,
  editorRef,
  onClose,
}: Props = {}) {
  const { pageContext } = usePageContext();
  const fallbackEditorRef = React.useRef<ReactCodeMirrorRef | null>(null);

  const isProjectPage = pageContext.pageType === "project";
  const activeNoteId = noteId ?? pageContext.noteId ?? pageContext.projectId ?? "";
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
  const [contextFilterTab, setContextFilterTab] = React.useState<"all" | "note" | "project" | "vault">("all");
  const [contextSearchResults, setContextSearchResults] = React.useState<AiContextItem[]>([]);
  const [isSearchingContext, setIsSearchingContext] = React.useState(false);

  // Vault Password Modal state
  const [vaultModalOpen, setVaultModalOpen] = React.useState(false);
  const [pendingVaultItem, setPendingVaultItem] = React.useState<AiContextItem | null>(null);
  const [vaultMasterPassword, setVaultMasterPassword] = React.useState("");
  const [isVerifyingVault, setIsVerifyingVault] = React.useState(false);

  // Recommended Actions Popover state
  const [actionsMenuOpen, setActionsMenuOpen] = React.useState(false);

  // Prompt Dialog state (for actions that need user parameters like language or hint)
  const [promptDialog, setPromptDialog] = React.useState<{
    actionId: string;
    label: string;
    needsLanguage?: boolean;
    needsHint?: boolean;
    hintPlaceholder?: string;
  } | null>(null);
  const [targetLanguage, setTargetLanguage] = React.useState("English");
  const [actionPromptHint, setActionPromptHint] = React.useState("");

  // Review & Organize Tasks modal state
  const [planningOpen, setPlanningOpen] = React.useState(false);
  const [planningLoading, setPlanningLoading] = React.useState(false);
  const [insertingTasks, setInsertingTasks] = React.useState(false);
  const [planningContext, setPlanningContext] = React.useState<PlanningContext | null>(null);
  const [plannedTasks, setPlannedTasks] = React.useState<PlannedTask[]>([]);
  const [destinationKind, setDestinationKind] = React.useState<"current" | "existing" | "new" | "subproject">("current");
  const [existingProjectId, setExistingProjectId] = React.useState("");
  const [projectTitle, setProjectTitle] = React.useState("");
  const [parentProjectId, setParentProjectId] = React.useState("");
  const [projectDueDate, setProjectDueDate] = React.useState("");
  const [projectPriority, setProjectPriority] = React.useState<"none" | "low" | "medium" | "high">("none");

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

  // Dynamic quick actions depending on context (Project vs Note vs Selection)
  const quickActions = React.useMemo<QuickAction[]>(() => {
    if (selectedText) {
      return [
        {
          id: "check-typos",
          label: "Check typos & suggestions",
          category: "writing",
          icon: SpellCheck,
          description: "Detects typos, spelling errors & grammar suggestions",
          prompt: "Carefully check the selected text for typos, spelling mistakes, punctuation errors, and grammar. Provide the corrected version and a bulleted list of detected typos with suggestions.",
          requiresSelection: true,
        },
        {
          id: "improve",
          label: "Improve writing",
          category: "writing",
          icon: Wand2,
          description: "Rewrites selection for stronger flow, tone & clarity",
          prompt: "Improve the writing of the selected text, enhancing clarity, tone, and eloquence without altering core meaning.",
          requiresSelection: true,
        },
        {
          id: "gently-polish",
          label: "Gently polish selection",
          category: "writing",
          icon: Sparkles,
          description: "Refines wording & grammar without changing meaning",
          prompt: "Gently polish the selected text, refining sentence flow, phrasing, and clarity without changing meaning.",
          requiresSelection: true,
        },
        {
          id: "explain",
          label: "Explain selection",
          category: "context",
          icon: HelpCircle,
          description: "Explains concepts in simple terms",
          prompt: "Explain the concepts and background of the selected text in simple, clear terms.",
          requiresSelection: true,
        },
        {
          id: "translate",
          label: "Translate selection...",
          category: "writing",
          icon: Languages,
          description: "Translates selected text into your choice of language",
          prompt: "Translate the selected text.",
          requiresSelection: true,
          needsLanguage: true,
        },
        {
          id: "comment-selection",
          label: "Add AI comments to selection...",
          category: "review",
          icon: MessageSquarePlus,
          description: "Inserts inline review comments to selected text",
          prompt: "Add inline review comments to the selected text.",
          requiresSelection: true,
          needsPromptHint: true,
          hintPlaceholder: "e.g. focus on clarity, tone, and missing details",
        },
        {
          id: "extract-tasks",
          label: "Extract tasks from selection",
          category: "project",
          icon: ListChecks,
          description: "Converts selection into actionable checklists & project tasks",
          prompt: "Extract all actionable tasks and checklist items from the selected text into a clean task list.",
          requiresSelection: true,
        },
      ];
    }

    if (isProjectPage) {
      return [
        {
          id: "project-tasks",
          label: "Break down into Project Tasks",
          category: "project",
          icon: ListChecks,
          description: "Generates actionable tasks formatted for project boards",
          prompt: "Break down this project into actionable, prioritized checklist items formatted as `- [ ] Task title: Description`.",
        },
        {
          id: "project-plan",
          label: "Draft Project Roadmap & Milestones",
          category: "project",
          icon: Target,
          description: "Structures project goals, milestones, and deliverables",
          prompt: "Draft a comprehensive project plan with milestones, deliverables, key risks, and immediate next steps.",
          needsPromptHint: true,
          hintPlaceholder: "e.g. focus on shipping MVP in 4 weeks",
        },
        {
          id: "check-typos",
          label: "Check typos & suggestions",
          category: "writing",
          icon: SpellCheck,
          description: "Identifies spelling errors and wording suggestions",
          prompt: "Carefully check this project for typos, spelling mistakes, punctuation errors, and grammar. Provide the corrected version and a list of suggestions.",
        },
        {
          id: "clarify-gaps",
          label: "Analyze Project & Find Gaps",
          category: "clarify",
          icon: HelpCircle,
          description: "Highlights missing requirements, risks & open questions",
          prompt: "Analyze this project. Identify any ambiguities, missing scope details, risks, and ask clarifying questions to confirm.",
        },
        {
          id: "mermaid",
          label: "Generate Workflow Diagram",
          category: "structure",
          icon: GitGraph,
          description: "Creates a Mermaid flowchart of the project workflow",
          prompt: "Generate a Mermaid flowchart representing the lifecycle, stages, or architecture of this project.",
          needsPromptHint: true,
          hintPlaceholder: "e.g. show lifecycle stages or flowchart",
        },
      ];
    }

    // Default Note Quick Actions
    const actions: QuickAction[] = [
      {
        id: "summarize",
        label: "Summarize note",
        category: "context",
        icon: FileText,
        description: "Concise overview and key takeaways",
        prompt: "Summarize the key points of this note concisely.",
      },
      {
        id: "improve",
        label: "Improve writing",
        category: "writing",
        icon: Wand2,
        description: "Enhances eloquence, phrasing, flow, and structure",
        prompt: "Improve the writing of this note, enhancing readability, phrasing, and flow.",
      },
      {
        id: "gently-polish",
        label: "Gently polish note",
        category: "writing",
        icon: Sparkles,
        description: "Improves clarity and structure gently without altering tone",
        prompt: "Gently polish the text, refining sentence flow, phrasing, and clarity without changing meaning or formatting.",
      },
      {
        id: "check-typos",
        label: "Check typos & suggestions",
        category: "writing",
        icon: SpellCheck,
        description: "Finds spelling errors, typos & phrasing suggestions",
        prompt: "Carefully check this note for typos, spelling mistakes, punctuation errors, and grammatical issues. Provide the corrected text and a list of corrections and suggestions.",
      },
      {
        id: "extract-tasks",
        label: "Extract actionable tasks",
        category: "project",
        icon: ListChecks,
        description: "Creates checklist of next actions & project tasks",
        prompt: "Extract all actionable tasks and checklist items from this note into a clean task list.",
      },
      {
        id: "project-plan",
        label: "Convert to project roadmap",
        category: "project",
        icon: Target,
        description: "Turns concepts into structured milestones",
        prompt: "Turn this note's goals and concepts into a structured project plan with milestones and next steps.",
        needsPromptHint: true,
        hintPlaceholder: "e.g. target completion in 1 month",
      },
      {
        id: "mermaid",
        label: "Generate concept diagram",
        category: "structure",
        icon: GitGraph,
        description: "Visual Mermaid diagram of concepts",
        prompt: "Generate a Mermaid flowchart or diagram representing the core concept in this note.",
        needsPromptHint: true,
        hintPlaceholder: "e.g. show relationships as mindmap or flowchart",
      },
      {
        id: "clarify-gaps",
        label: "Ask clarifying questions & find gaps",
        category: "clarify",
        icon: HelpCircle,
        description: "Pinpoints ambiguity, blind spots and missing details",
        prompt: "Analyze this note for ambiguities, missing details, assumptions, and ask 2-3 specific clarifying questions to confirm.",
      },
    ];

    if (activeNoteContent.includes("inkest-comment:")) {
      actions.push({
        id: "apply-comments",
        label: "Apply inline comments...",
        category: "review",
        icon: MessagesSquare,
        description: "Applies inkest comments to revise note",
        prompt: "Apply inline comments in note.",
        needsPromptHint: true,
        hintPlaceholder: "e.g. keep tone casual and concise",
      });
    }

    return actions;
  }, [selectedText, isProjectPage, activeNoteContent]);

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

  // Filtered context search results
  const filteredSearchResults = React.useMemo(() => {
    if (contextFilterTab === "all") return contextSearchResults;
    return contextSearchResults.filter((item) => item.type === contextFilterTab);
  }, [contextSearchResults, contextFilterTab]);

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
    async (
      overridePrompt?: string,
      presetId?: string,
      extraOptions?: { targetLanguage?: string; promptHint?: string },
    ) => {
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
        let extractedTasks: ExtractedTask[] | undefined;

        if (presetId === "check-typos") {
          const res = await checkTyposAction({
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
            transformType = "Typo & Grammar Check";
            uncertaintyNote = res.uncertaintyNote;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "gently-polish") {
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
        } else if (presetId === "comment-selection") {
          const res = await commentSelectionAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            selectedText: currentSelection || activeNoteContent,
            promptHint: extraOptions?.promptHint,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "AI Comments";
            uncertaintyNote = res.uncertaintyNote;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "apply-comments") {
          const res = await applyCommentsAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            promptHint: extraOptions?.promptHint,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Applied Comments";
            uncertaintyNote = res.uncertaintyNote;
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "extract-tasks" || presetId === "project-tasks") {
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
            extractedTasks = res.output.tasks;
            resultOutput = res.output.tasks
              .map((t) => {
                const meta = [];
                if (t.priority && t.priority !== "none") meta.push(`Priority: ${t.priority}`);
                if (t.dueDate) meta.push(`Due: ${t.dueDate}`);
                if (t.startDate) meta.push(`Start: ${t.startDate}`);
                const metaStr = meta.length > 0 ? ` *(${meta.join(" | ")})*` : "";
                const descStr = t.description ? ` — ${t.description}` : "";
                return `- [ ] **${t.title}**${metaStr}${descStr}`;
              })
              .join("\n");
            citations = res.citations;
            transformType = "Project Tasks";
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "project-plan") {
          const res = await createProjectPlanAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            noteContent: activeNoteContent,
            promptHint: extraOptions?.promptHint,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = "Project Roadmap";
          } else {
            errorMessage = res.error;
          }
        } else if (presetId === "clarify-gaps") {
          const res = await clarifyAndFindGapsAction({
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
            transformType = "Clarification & Gap Analysis";
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
          const targetLang = extraOptions?.targetLanguage || "English";
          const res = await translateTextAction({
            noteId: activeNoteId,
            noteTitle: activeNoteTitle,
            selectedText: currentSelection || activeNoteContent,
            targetLanguage: targetLang,
            threadId: activeThreadId ?? undefined,
          });
          returnedThreadId = res.threadId;
          if (res.ok) {
            isSuccess = true;
            resultOutput = res.output;
            citations = res.citations;
            transformType = `Translation (${targetLang})`;
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
            extractedTasks,
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

  const handleTriggerAction = React.useCallback(
    (action: QuickAction) => {
      if (action.requiresSelection && !selectedText) {
        toast.error("Select text in the editor first.");
        return;
      }

      if (action.needsLanguage) {
        setPromptDialog({
          actionId: action.id,
          label: action.label,
          needsLanguage: true,
        });
        return;
      }

      if (action.needsPromptHint) {
        setPromptDialog({
          actionId: action.id,
          label: action.label,
          needsHint: true,
          hintPlaceholder: action.hintPlaceholder,
        });
        return;
      }

      void handleSendPrompt(action.prompt, action.id);
    },
    [handleSendPrompt, selectedText],
  );

  const handleSubmitPromptDialog = React.useCallback(() => {
    if (!promptDialog) return;
    const { actionId, needsLanguage, needsHint } = promptDialog;
    const lang = needsLanguage ? targetLanguage : undefined;
    const hint = needsHint ? actionPromptHint.trim() : undefined;

    setPromptDialog(null);
    setActionPromptHint("");

    const action = quickActions.find((a) => a.id === actionId);
    let prompt = action?.prompt || "";
    if (hint) {
      prompt = `${prompt} (${hint})`;
    }

    void handleSendPrompt(prompt, actionId, { targetLanguage: lang, promptHint: hint });
  }, [handleSendPrompt, promptDialog, targetLanguage, actionPromptHint, quickActions]);

  const handleOpenTaskPlanning = React.useCallback(
    async (tasks: ExtractedTask[]) => {
      setPlanningLoading(true);
      try {
        const context = await getAiPlanningContextAction(activeNoteId);
        setPlanningContext(context);
        setPlannedTasks(
          tasks.map((t) => ({
            title: t.title,
            description: t.description ?? null,
            priority: t.priority || "none",
            status: "todo",
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
            startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : "",
          })),
        );
        if (context.currentProject) {
          setDestinationKind("current");
          setProjectDueDate(
            context.currentProject.dueDate
              ? new Date(context.currentProject.dueDate).toISOString().slice(0, 10)
              : "",
          );
        } else if (context.projects.length > 0) {
          setDestinationKind("existing");
          setExistingProjectId(context.projects[0]?.id ?? "");
        } else {
          setDestinationKind("new");
          setProjectTitle(activeNoteTitle || "New Project");
        }
        setPlanningOpen(true);
      } catch {
        toast.error("Failed to load project planning context");
      } finally {
        setPlanningLoading(false);
      }
    },
    [activeNoteId, activeNoteTitle],
  );

  const updatePlannedTask = React.useCallback(
    (index: number, patch: Partial<PlannedTask>) => {
      setPlannedTasks((prev) =>
        prev.map((task, i) => (i === index ? { ...task, ...patch } : task)),
      );
    },
    [],
  );

  const savePlan = React.useCallback(async () => {
    if (plannedTasks.length === 0) {
      toast.error("Add at least one task before saving.");
      return;
    }
    if (destinationKind === "existing" && !existingProjectId) {
      toast.error("Select a destination project.");
      return;
    }
    if ((destinationKind === "new" || destinationKind === "subproject") && !projectTitle.trim()) {
      toast.error("Provide a project title.");
      return;
    }
    if (destinationKind === "subproject" && !parentProjectId) {
      toast.error("Select a parent project.");
      return;
    }

    setInsertingTasks(true);
    try {
      const destination =
        destinationKind === "current"
          ? {
              kind: "current" as const,
              projectDueDate: projectDueDate ? new Date(projectDueDate) : undefined,
            }
          : destinationKind === "existing"
            ? {
                kind: "existing" as const,
                projectId: existingProjectId,
                projectDueDate: projectDueDate ? new Date(projectDueDate) : undefined,
              }
            : destinationKind === "new"
              ? {
                  kind: "new" as const,
                  title: projectTitle,
                  dueDate: projectDueDate ? new Date(projectDueDate) : undefined,
                  priority: projectPriority,
                }
              : {
                  kind: "subproject" as const,
                  parentProjectId,
                  title: projectTitle,
                  dueDate: projectDueDate ? new Date(projectDueDate) : undefined,
                  priority: projectPriority,
                };

      const result = await saveAiTaskPlanAction({
        sourceNoteId: activeNoteId,
        destination,
        tasks: plannedTasks.map(({ title, description, priority, status, dueDate, startDate }) => ({
          title,
          description: description?.trim() || null,
          priority,
          status,
          dueDate: dueDate ? new Date(dueDate) : null,
          startDate: startDate ? new Date(startDate) : null,
        })),
      });

      toast.success(
        `Created ${result.created} task${result.created === 1 ? "" : "s"}${result.skipped ? `; skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.` : "."}`,
      );
      setPlanningOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save the plan.";
      toast.error(
        message === "DUPLICATE_PROJECT"
          ? "A project with that name already exists there. Choose it instead."
          : "Failed to save the plan.",
      );
    } finally {
      setInsertingTasks(false);
    }
  }, [
    plannedTasks,
    destinationKind,
    existingProjectId,
    projectTitle,
    parentProjectId,
    projectDueDate,
    projectPriority,
    activeNoteId,
  ]);

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied response to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ADD actions
  const handleInsertAtCursor = (text: string) => {
    if (!activeEditorRef.current?.view) {
      toast.error("No active editor to insert text into");
      return;
    }
    try {
      insertTextAtCursor(activeEditorRef, text);
      toast.success("Inserted text into note");
    } catch {
      toast.error("Failed to insert text into note");
    }
  };

  const handleAppendToNote = (text: string) => {
    if (!activeEditorRef.current?.view) {
      toast.error("No active editor to append text to");
      return;
    }
    try {
      appendTextToEditor(activeEditorRef, text);
      toast.success("Appended text to note");
    } catch {
      toast.error("Failed to append text to note");
    }
  };

  const handlePrependToNote = (text: string) => {
    if (!activeEditorRef.current?.view) {
      toast.error("No active editor to prepend text to");
      return;
    }
    try {
      prependTextToEditor(activeEditorRef, text);
      toast.success("Prepended text to note");
    } catch {
      toast.error("Failed to prepend text to note");
    }
  };

  // REPLACE actions
  const handleReplaceSelection = (text: string) => {
    if (!activeEditorRef.current?.view) {
      toast.error("No active editor to replace text in");
      return;
    }
    const sel = getSelectedEditorText(activeEditorRef);
    if (!sel) {
      toast.error("No text selected in editor to replace");
      return;
    }
    try {
      replaceSelectedEditorText(activeEditorRef, text);
      toast.success("Replaced selection in note");
    } catch {
      toast.error("Failed to replace selected text");
    }
  };

  const handleReplaceEntireNote = (text: string) => {
    if (!activeEditorRef.current?.view) {
      toast.error("No active editor to replace content in");
      return;
    }
    try {
      replaceEntireEditorContent(activeEditorRef, text);
      toast.success("Replaced entire note content");
    } catch {
      toast.error("Failed to replace note content");
    }
  };

  // GENTLE EDIT / DIFF actions
  const handleOpenDiffReview = (msg: ChatMessage) => {
    const currentSelection = getSelectedEditorText(activeEditorRef);
    const scope = msg.targetScope || (currentSelection ? "selection" : "note");
    const original = (scope === "selection" ? currentSelection : activeNoteContent) || msg.originalSourceSnippet || activeNoteContent || "";

    setDiffModal({
      isOpen: true,
      original,
      modified: msg.content || "",
      targetScope: scope,
    });
  };

  const handleApplyGentleEdit = (text: string, targetScope: "selection" | "note") => {
    if (!activeEditorRef.current?.view) {
      toast.error("No active editor to apply edit to");
      return;
    }
    try {
      applyGentlePatch(activeEditorRef, text, targetScope);
      toast.success(
        targetScope === "selection"
          ? "Applied gentle edit to selection"
          : "Applied gentle edit to note",
      );
      setDiffModal(null);
    } catch {
      toast.error("Failed to apply edits");
    }
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold leading-none truncate text-foreground">AI Assistant</h2>
              {isProjectPage && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-normal">
                  Project
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground truncate">
              {selectedText ? (
                <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                  <FileCode2 className="size-2.5" />
                  Selected text context
                </span>
              ) : isProjectPage ? (
                <span className="truncate">
                  {activeNoteTitle}
                </span>
              ) : (
                <span className="truncate">
                  {activeNoteTitle || "Workspace context"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewChat}
            title="Start new chat"
            className="size-7"
          >
            <Plus className="size-3.5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHistoryOpen(true)}
            title="View chat history"
            className="size-7"
          >
            <History className="size-3.5 text-muted-foreground" />
          </Button>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleDeleteCurrentThread()}
              title="Clear / delete chat thread"
              className="size-7"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              title="Close AI Assistant"
              className="size-7"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Message History Area */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea ref={containerRef} className="h-full px-3.5 py-3">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-violet-500" />
              <span>Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 text-violet-500 shadow-xs ring-1 ring-violet-500/20">
                <Sparkles className="size-5" />
              </div>
              <h3 className="mt-3 text-xs font-semibold text-foreground">
                {isProjectPage
                  ? "How can I help with this project?"
                  : selectedText
                    ? "Working with selected text"
                    : "How can I assist your thinking?"}
              </h3>
              <p className="mt-1 max-w-[260px] text-[11px] text-muted-foreground leading-relaxed">
                {isProjectPage
                  ? "Generate roadmaps, break down tasks, find missing requirements, or ask workspace questions."
                  : "Gently polish writing, generate diagrams, extract tasks, or ask clarifying questions."}
              </p>

              {/* Quick Action Cards in Empty State */}
              <div className="mt-4 w-full space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommended Actions
                  </p>
                  <span className="text-[10px] text-muted-foreground/60">
                    {isProjectPage ? "Project context" : "Note context"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleTriggerAction(action)}
                        className="group flex items-start gap-2.5 rounded-xl border border-border/70 bg-card/60 p-2.5 text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/5 hover:shadow-xs cursor-pointer"
                      >
                        <div className="mt-0.5 flex size-6 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground leading-tight">
                            {action.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                            {action.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 pb-2">
              {messages.map((msg) => {
                const clarificationSuggestions =
                  msg.role === "assistant" && !msg.isError
                    ? extractClarificationSuggestions(msg.content)
                    : [];

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-1 text-xs",
                      msg.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-1">
                      {msg.role === "user" ? "You" : "AI Assistant"}
                    </span>

                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2.5 text-xs leading-relaxed max-w-[96%]",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                          : msg.isError
                            ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-xs"
                            : "bg-muted/30 border border-border/70 text-foreground rounded-tl-xs w-full shadow-xs",
                      )}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : msg.isError ? (
                        <p>{msg.content}</p>
                      ) : (
                        <div className="space-y-2.5">
                          {/* Refined Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <AiCitationList
                              citations={msg.citations}
                              transformType={msg.transformType}
                              uncertaintyNote={msg.uncertaintyNote}
                            />
                          )}

                          <div className="prose prose-xs dark:prose-invert max-w-none text-foreground leading-relaxed font-sans">
                            <MarkdownPreview content={msg.content} />
                          </div>

                          {/* Interactive Clarification Suggestion Chips */}
                          {clarificationSuggestions.length > 0 && (
                            <div className="mt-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                <HelpCircle className="size-3 shrink-0" />
                                <span>Suggested Clarification Replies:</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {clarificationSuggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground hover:bg-amber-500/10 hover:border-amber-500 transition-all text-left cursor-pointer"
                                  >
                                    <MessageSquarePlus className="size-2.5 text-amber-500 shrink-0" />
                                    <span className="truncate max-w-[200px]">{suggestion}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Bar (Organize Tasks / Gently Edit / Replace / Add / Copy) */}
                      {msg.role === "assistant" && !msg.isError && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-border/40 pt-2">
                          {msg.extractedTasks && msg.extractedTasks.length > 0 && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => void handleOpenTaskPlanning(msg.extractedTasks!)}
                              disabled={planningLoading}
                              className="h-6 gap-1 rounded-lg px-2 text-[10px] font-medium text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-300"
                              title="Review and organize tasks into a project"
                            >
                              <ListChecks className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                              Organize tasks
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleOpenDiffReview(msg)}
                            className="h-6 gap-1 rounded-lg px-2 text-[10px] font-medium text-violet-700 bg-violet-500/10 hover:bg-violet-500/20 dark:text-violet-300"
                            title="Review diff and gently apply edits"
                          >
                            <Split className="size-2.5" />
                            Gently Edit
                          </Button>

                          {/* Replace Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex items-center h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Replace className="size-2.5" />
                              Replace
                              <ChevronDown className="size-2 opacity-60" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44 text-xs">
                              <DropdownMenuGroup>
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
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Add Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex items-center h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Plus className="size-2.5" />
                              Add
                              <ChevronDown className="size-2 opacity-60" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44 text-xs">
                              <DropdownMenuGroup>
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
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Copy Button */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="ml-auto h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                            title="Copy to clipboard"
                          >
                            {copiedId === msg.id ? (
                              <Check className="size-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="size-2.5" />
                            )}
                            {copiedId === msg.id ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isGenerating && (
                <div className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-2.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-violet-500 shrink-0" />
                  <span className="text-[11px]">Reasoning with workspace context...</span>
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

      {/* Refined Context Tags Bar */}
      {(isPageContextAttached || attachedContexts.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-t bg-muted/25">
          {isPageContextAttached && activeNoteTitle && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1 pr-1 text-[10px] font-normal transition-all shadow-2xs",
                isProjectPage
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                  : "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-400",
              )}
            >
              {isProjectPage ? (
                <Folder className="size-2.5 shrink-0 text-blue-500" />
              ) : (
                <FileText className="size-2.5 shrink-0 text-violet-500" />
              )}
              <span className="max-w-[130px] truncate">
                {isProjectPage ? "Project: " : "Page: "}
                {activeNoteTitle}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsPageContextAttached(false);
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 cursor-pointer"
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
                "gap-1 pr-1 text-[10px] font-normal transition-all shadow-2xs",
                ctx.type === "vault"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : ctx.type === "project"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                    : "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-400",
              )}
            >
              {ctx.type === "vault" ? (
                <Lock className="size-2.5 shrink-0 text-amber-500" />
              ) : ctx.type === "project" ? (
                <Folder className="size-2.5 shrink-0 text-blue-500" />
              ) : (
                <FileText className="size-2.5 shrink-0 text-violet-500" />
              )}
              <span className="max-w-[120px] truncate">{ctx.title}</span>
              <button
                type="button"
                onClick={() => handleRemoveContextItem(ctx.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 cursor-pointer"
                title="Remove context"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-2.5 bg-background">
        <div className="relative flex flex-col rounded-2xl border border-border/70 bg-muted/20 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition-all shadow-xs">
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
                ? "Instruct AI on selected text or ask questions..."
                : isProjectPage
                  ? "Ask AI, break down tasks, or type @ to reference workspace context..."
                  : "Ask AI, clarify notes, or type @ to reference items... (Enter to send)"
            }
            className="min-h-[58px] max-h-[150px] resize-none border-0 bg-transparent px-3 py-2 text-xs shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
          />

          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              {/* Categorized Context Picker Popover */}
              <Popover open={contextPickerOpen} onOpenChange={setContextPickerOpen}>
                <PopoverTrigger
                  className="inline-flex items-center h-6 gap-1 px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                  title="Attach workspace context (@notes, @projects, @vault)"
                >
                  <AtSign className="size-3 text-violet-500" />
                  <span>Attach</span>
                </PopoverTrigger>

                <PopoverContent side="top" align="start" className="w-[300px] p-2 space-y-2 text-xs shadow-lg">
                  {/* Re-attach current page context button if detached */}
                  {!isPageContextAttached && activeNoteTitle && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPageContextAttached(true);
                        setContextPickerOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 text-left text-xs font-medium text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-500/20 cursor-pointer"
                    >
                      <Plus className="size-3.5 shrink-0 text-violet-500" />
                      <span className="truncate">Re-attach: {activeNoteTitle}</span>
                    </button>
                  )}

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 border-b pb-1.5">
                    {(["all", "note", "project", "vault"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setContextFilterTab(tab)}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors capitalize cursor-pointer",
                          contextFilterTab === tab
                            ? "bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {tab === "all" ? "All Items" : `${tab}s`}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="flex items-center gap-2 border-b pb-1.5 px-1">
                    <Search className="size-3 text-muted-foreground shrink-0" />
                    <Input
                      value={contextSearchQuery}
                      onChange={(e) => setContextSearchQuery(e.target.value)}
                      placeholder="Search workspace..."
                      className="h-6 text-xs border-0 focus-visible:ring-0 p-0"
                    />
                    {contextSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setContextSearchQuery("")}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Context Items List */}
                  <ScrollArea className="max-h-[190px] pr-1">
                    {isSearchingContext ? (
                      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1.5">
                        <Loader2 className="size-3.5 animate-spin text-violet-500" />
                        <span>Searching workspace...</span>
                      </div>
                    ) : filteredSearchResults.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No matching items found
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredSearchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectContextItem(item)}
                            className="flex w-full items-center justify-between rounded-lg p-1.5 text-left text-xs transition-colors hover:bg-muted/70 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {item.type === "vault" ? (
                                <Lock className="size-3.5 text-amber-500 shrink-0" />
                              ) : item.type === "project" ? (
                                <Folder className="size-3.5 text-blue-500 shrink-0" />
                              ) : (
                                <FileText className="size-3.5 text-violet-500 shrink-0" />
                              )}
                              <div className="truncate min-w-0">
                                <p className="truncate text-xs font-medium text-foreground">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {item.subtitle || item.type}
                                </p>
                              </div>
                            </div>
                            <Plus className="size-3 text-muted-foreground/60 group-hover:text-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Recommended Actions Popover */}
              <Popover open={actionsMenuOpen} onOpenChange={setActionsMenuOpen}>
                <PopoverTrigger
                  className="inline-flex items-center h-6 gap-1 px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                  title="Recommended Actions"
                >
                  <Sparkles className="size-3 text-violet-500" />
                  <span>Actions</span>
                </PopoverTrigger>

                <PopoverContent side="top" align="start" className="w-[300px] p-2 space-y-1 text-xs shadow-lg">
                  <div className="flex items-center justify-between border-b pb-1.5 px-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recommended Actions
                    </span>
                    <span className="text-[9px] text-muted-foreground/70">
                      {selectedText ? "Selected text" : isProjectPage ? "Project" : "Note"}
                    </span>
                  </div>
                  <ScrollArea className="max-h-[260px] pr-1">
                    <div className="space-y-1 pt-1">
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => {
                              setActionsMenuOpen(false);
                              handleTriggerAction(action);
                            }}
                            className="flex w-full items-start gap-2 rounded-lg p-1.5 text-left text-xs transition-colors hover:bg-muted cursor-pointer group"
                          >
                            <div className="mt-0.5 flex size-5 items-center justify-center rounded-md bg-violet-500/10 text-violet-500 shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                              <Icon className="size-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground leading-tight truncate">
                                {action.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                                {action.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                Shift+Enter for newline
              </span>
            </div>

            <Button
              size="icon-sm"
              disabled={!input.trim() || isGenerating}
              onClick={() => void handleSendPrompt()}
              className="size-6.5 rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform active:scale-95"
            >
              {isGenerating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
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

      {/* Action Prompt Dialog (Language & Custom Guidance) */}
      <Dialog
        open={Boolean(promptDialog)}
        onOpenChange={(open) => !open && setPromptDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {promptDialog?.needsLanguage
                ? "Translate selection"
                : promptDialog?.label || "AI Action"}
            </DialogTitle>
            <DialogDescription>
              {promptDialog?.needsLanguage
                ? "Pick the language to translate the selected text into."
                : "Optionally specify focus, constraints, or custom instructions."}
            </DialogDescription>
          </DialogHeader>

          {promptDialog?.needsLanguage ? (
            <div className="flex flex-col gap-1.5 py-1">
              <Label htmlFor="ai-target-language" className="text-xs text-muted-foreground font-medium">
                Target Language
              </Label>
              <Input
                id="ai-target-language"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                placeholder="e.g. English, Persian, French, German, Spanish..."
                list="ai-common-languages"
                className="text-xs"
              />
              <datalist id="ai-common-languages">
                <option value="English" />
                <option value="Persian" />
                <option value="French" />
                <option value="German" />
                <option value="Spanish" />
                <option value="Arabic" />
                <option value="Italian" />
                <option value="Russian" />
                <option value="Japanese" />
                <option value="Chinese" />
              </datalist>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 py-1">
              <Label htmlFor="ai-prompt-hint" className="text-xs text-muted-foreground font-medium">
                Instructions (optional)
              </Label>
              <Input
                id="ai-prompt-hint"
                value={actionPromptHint}
                onChange={(e) => setActionPromptHint(e.target.value)}
                placeholder={
                  promptDialog?.hintPlaceholder ||
                  "e.g. focus on clarity, key risks, or tone"
                }
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmitPromptDialog();
                  }
                }}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPromptDialog(null);
                setActionPromptHint("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitPromptDialog}
            >
              Run Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & Organize Tasks Dialog */}
      <Dialog open={planningOpen} onOpenChange={setPlanningOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="size-5 text-primary" />
              Review & Organize Tasks
            </DialogTitle>
            <DialogDescription>
              Organize extracted tasks into a new or existing project, adjust timing heuristics, and confirm before creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Destination Configuration Card */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  1. Project Destination
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Personal workspace
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-plan-destination" className="text-xs font-medium">
                    Destination Type
                  </Label>
                  <select
                    id="ai-plan-destination"
                    className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                    value={destinationKind}
                    onChange={(event) => setDestinationKind(event.target.value as typeof destinationKind)}
                  >
                    {planningContext?.currentProject ? (
                      <option value="current">Current: {planningContext.currentProject.title}</option>
                    ) : null}
                    <option value="existing">Add to existing project</option>
                    <option value="new">Create new top-level project</option>
                    <option value="subproject">Create new subproject</option>
                  </select>
                </div>

                {destinationKind === "existing" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-plan-existing" className="text-xs font-medium">
                      Select Project
                    </Label>
                    <select
                      id="ai-plan-existing"
                      className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                      value={existingProjectId}
                      onChange={(event) => {
                        setExistingProjectId(event.target.value);
                        const sel = planningContext?.projects.find((p) => p.id === event.target.value);
                        if (sel?.dueDate) {
                          setProjectDueDate(new Date(sel.dueDate).toISOString().slice(0, 10));
                        }
                      }}
                    >
                      <option value="">Choose a project...</option>
                      {planningContext?.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.parentId ? "↳ " : ""}{project.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {destinationKind === "subproject" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-plan-parent" className="text-xs font-medium">
                      Parent Project
                    </Label>
                    <select
                      id="ai-plan-parent"
                      className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                      value={parentProjectId}
                      onChange={(event) => setParentProjectId(event.target.value)}
                    >
                      <option value="">Choose parent project...</option>
                      {planningContext?.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {(destinationKind === "new" || destinationKind === "subproject") && (
                <div className="grid gap-3 sm:grid-cols-4 pt-1">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ai-plan-title" className="text-xs font-medium">
                      {destinationKind === "new" ? "New Project Name" : "New Subproject Name"}
                    </Label>
                    <Input
                      id="ai-plan-title"
                      value={projectTitle}
                      onChange={(event) => setProjectTitle(event.target.value)}
                      placeholder="e.g. Q4 Marketing Campaign"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ai-project-due" className="text-xs font-medium">
                      Target Due Date
                    </Label>
                    <Input
                      id="ai-project-due"
                      type="date"
                      value={projectDueDate}
                      onChange={(event) => setProjectDueDate(event.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-project-priority" className="text-xs font-medium">
                      Priority
                    </Label>
                    <select
                      id="ai-project-priority"
                      className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                      value={projectPriority}
                      onChange={(e) => setProjectPriority(e.target.value as typeof projectPriority)}
                    >
                      <option value="none">No priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              )}

              {(destinationKind === "current" || destinationKind === "existing") && (
                <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t border-border/50">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-project-target-date" className="text-xs text-muted-foreground">
                      Project Target Due Date (optional update)
                    </Label>
                    <Input
                      id="ai-project-target-date"
                      type="date"
                      value={projectDueDate}
                      onChange={(event) => setProjectDueDate(event.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Task Items List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  2. Tasks & Timing ({plannedTasks.length})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Due dates pre-calculated by AI timing heuristics
                </span>
              </div>

              <div className="space-y-2">
                {plannedTasks.map((task, index) => (
                  <div
                    key={`${task.title}-${index}`}
                    className="grid gap-2.5 rounded-xl border border-border/70 bg-card p-3 shadow-2xs sm:grid-cols-[1fr_8.5rem_8.5rem]"
                  >
                    {/* Task Title & Description */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`ai-task-title-${index}`} className="text-[11px] font-medium text-muted-foreground">
                        Task Title
                      </Label>
                      <Input
                        id={`ai-task-title-${index}`}
                        value={task.title}
                        onChange={(event) => updatePlannedTask(index, { title: event.target.value })}
                        className="h-8 text-xs font-medium"
                      />
                      <Input
                        aria-label={`Description for ${task.title || "task"}`}
                        value={task.description ?? ""}
                        onChange={(event) => updatePlannedTask(index, { description: event.target.value || null })}
                        placeholder="Description (optional)"
                        className="h-7 text-[11px] text-muted-foreground"
                      />
                    </div>

                    {/* Status & Priority */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`ai-task-status-${index}`} className="text-[11px] font-medium text-muted-foreground">
                        Status & Priority
                      </Label>
                      <select
                        id={`ai-task-status-${index}`}
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                        value={task.status}
                        onChange={(event) => updatePlannedTask(index, { status: event.target.value as PlannedTask["status"] })}
                      >
                        <option value="todo">To do</option>
                        <option value="doing">In progress</option>
                        <option value="done">Done</option>
                        <option value="canceled">Canceled</option>
                      </select>
                      <select
                        aria-label={`Priority for ${task.title || "task"}`}
                        className="h-7 w-full rounded-md border bg-background px-2 text-[11px]"
                        value={task.priority}
                        onChange={(event) => updatePlannedTask(index, { priority: event.target.value as PlannedTask["priority"] })}
                      >
                        <option value="none">No priority</option>
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                      </select>
                    </div>

                    {/* Start & Due Dates */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`ai-task-due-${index}`} className="text-[11px] font-medium text-muted-foreground">
                          Due Date
                        </Label>
                        <button
                          type="button"
                          onClick={() => setPlannedTasks((tasks) => tasks.filter((_, taskIndex) => taskIndex !== index))}
                          className="text-[10px] text-destructive hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <Input
                        id={`ai-task-due-${index}`}
                        type="date"
                        value={task.dueDate}
                        onChange={(event) => updatePlannedTask(index, { dueDate: event.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Start:</span>
                        <Input
                          id={`ai-task-start-${index}`}
                          type="date"
                          value={task.startDate}
                          onChange={(event) => updatePlannedTask(index, { startDate: event.target.value })}
                          className="h-7 text-[11px] font-mono flex-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setPlanningOpen(false)} disabled={insertingTasks}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void savePlan()} disabled={insertingTasks} className="gap-1.5">
              {insertingTasks ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Confirm and create
            </Button>
          </DialogFooter>
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
