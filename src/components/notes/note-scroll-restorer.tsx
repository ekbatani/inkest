"use client";

import * as React from "react";
import {
  getSavedNoteScroll,
  saveNoteScroll,
  calculateScrollRatio,
  calculateTargetScrollTop,
} from "@/lib/notes/scroll-position";

export function NoteScrollRestorer({ noteId }: { noteId: string }) {
  React.useEffect(() => {
    const mainEl = document.getElementById("main-content");
    if (!mainEl) return;

    const saved = getSavedNoteScroll(noteId);
    let isRestoring = false;
    let hasUserScrolled = false;

    if (saved) {
      const targetScrollTop = calculateTargetScrollTop(
        saved,
        {
          scrollHeight: mainEl.scrollHeight,
          clientHeight: mainEl.clientHeight,
        },
        "reading",
      );
      if (targetScrollTop > 0) {
        isRestoring = true;
        mainEl.scrollTop = targetScrollTop;
        requestAnimationFrame(() => {
          isRestoring = false;
          if (hasUserScrolled) return;
          const currentTarget = calculateTargetScrollTop(
            saved,
            {
              scrollHeight: mainEl.scrollHeight,
              clientHeight: mainEl.clientHeight,
            },
            "reading",
          );
          if (Math.abs(mainEl.scrollTop - currentTarget) > 2) {
            isRestoring = true;
            mainEl.scrollTop = currentTarget;
            queueMicrotask(() => {
              isRestoring = false;
            });
          }
        });
      }
    }

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (isRestoring) return;
      hasUserScrolled = true;
      const scrollTop = mainEl.scrollTop;
      const scrollRatio = calculateScrollRatio(
        scrollTop,
        mainEl.scrollHeight,
        mainEl.clientHeight,
      );

      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveNoteScroll(noteId, {
          scrollTop,
          scrollRatio,
          viewMode: "reading",
        });
      }, 150);
    };

    mainEl.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      mainEl.removeEventListener("scroll", onScroll);
      if (saveTimer) {
        clearTimeout(saveTimer);
        const scrollTop = mainEl.scrollTop;
        saveNoteScroll(noteId, {
          scrollTop,
          scrollRatio: calculateScrollRatio(
            scrollTop,
            mainEl.scrollHeight,
            mainEl.clientHeight,
          ),
          viewMode: "reading",
        });
      }
    };
  }, [noteId]);

  return null;
}
