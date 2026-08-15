"use client";

import * as React from "react";
import { MessageSquare, Plus, Trash2, Clock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { listChatThreadsAction, deleteChatThreadAction } from "@/server/ai/chat-actions";
import type { ChatThread } from "@/server/db/schema";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread?: (threadId: string) => void;
};

export function ChatHistoryDrawer({
  open,
  onOpenChange,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
}: Props) {
  const [threads, setThreads] = React.useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const fetchThreads = async () => {
      setIsLoading(true);
      try {
        const res = await listChatThreadsAction();
        if (isMounted && res.success && res.threads) {
          setThreads(res.threads);
        }
      } catch {
        if (isMounted) {
          toast.error("Failed to load chat history");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      void fetchThreads();
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open]);

  const handleDelete = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setDeletingId(threadId);
    try {
      const res = await deleteChatThreadAction(threadId);
      if (res.success) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        if (onDeleteThread) {
          onDeleteThread(threadId);
        }
        toast.success("Chat thread deleted");
      } else {
        toast.error(res.error || "Failed to delete thread");
      }
    } catch {
      toast.error("Error deleting thread");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (threadId: string) => {
    onSelectThread(threadId);
    onOpenChange(false);
  };

  const handleNewChat = () => {
    onNewChat();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <Clock className="size-4" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">Chat History</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Saved sessions & past conversations
                </SheetDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={handleNewChat}
              className="gap-1 text-xs font-medium"
            >
              <Plus className="size-3.5" />
              New Chat
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-violet-500" />
              <span>Loading chat history...</span>
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MessageSquare className="size-4" />
              </div>
              <p className="text-xs font-medium text-foreground">No past chat sessions</p>
              <p className="text-[11px] text-muted-foreground max-w-[200px]">
                Your AI chat history will appear here as you start new conversations.
              </p>
              <Button
                variant="outline"
                size="xs"
                onClick={handleNewChat}
                className="mt-2 gap-1 text-xs"
              >
                <Sparkles className="size-3.5 text-violet-500" />
                Start a conversation
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const formattedDate = new Date(thread.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelect(thread.id)}
                    className={cn(
                      "group relative flex items-center justify-between rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer border",
                      isActive
                        ? "bg-violet-500/10 border-violet-500/30 text-foreground font-medium"
                        : "bg-muted/30 border-transparent hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-6">
                      <MessageSquare
                        className={cn(
                          "size-3.5 shrink-0",
                          isActive ? "text-violet-500" : "text-muted-foreground/70",
                        )}
                      />
                      <div className="truncate">
                        <p className="truncate text-xs leading-snug">{thread.title}</p>
                        <p className="text-[10px] text-muted-foreground/70 font-normal">
                          {formattedDate}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => void handleDelete(e, thread.id)}
                      disabled={deletingId === thread.id}
                      className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      title="Delete thread"
                    >
                      {deletingId === thread.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
