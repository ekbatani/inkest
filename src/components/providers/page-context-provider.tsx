"use client";

import * as React from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

export type PageContextData = {
  pageTitle: string;
  pageContent?: string;
  pageType?: "note" | "project" | "daily" | "journal" | "page" | string;
  noteId?: string;
  projectId?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
  projectMeta?: {
    taskCount?: number;
    childNotesCount?: number;
    subprojectsCount?: number;
    status?: string;
  };
};

type PageContextValue = {
  pageContext: PageContextData;
  setPageContext: (data: Partial<PageContextData>) => void;
  clearPageContext: () => void;
};

const defaultContext: PageContextData = {
  pageTitle: "Workspace",
  pageType: "page",
};

const PageContext = React.createContext<PageContextValue>({
  pageContext: defaultContext,
  setPageContext: () => {},
  clearPageContext: () => {},
});

export function PageContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageContext, setPageContextState] =
    React.useState<PageContextData>(defaultContext);

  const setPageContext = React.useCallback((data: Partial<PageContextData>) => {
    setPageContextState((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  const clearPageContext = React.useCallback(() => {
    setPageContextState(defaultContext);
  }, []);

  const value = React.useMemo(
    () => ({
      pageContext,
      setPageContext,
      clearPageContext,
    }),
    [pageContext, setPageContext, clearPageContext],
  );

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export function usePageContext() {
  return React.useContext(PageContext);
}
