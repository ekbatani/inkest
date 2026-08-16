"use client";

import * as React from "react";
import { usePageContext } from "@/components/providers/page-context-provider";

export function ProjectContextSync({
  projectId,
  title,
  contentMd,
  status,
  taskCount,
  childNotesCount,
  subprojectsCount,
}: {
  projectId: string;
  title: string;
  contentMd: string;
  status: string;
  taskCount: number;
  childNotesCount: number;
  subprojectsCount: number;
}) {
  const { setPageContext, clearPageContext } = usePageContext();

  React.useEffect(() => {
    setPageContext({
      projectId,
      noteId: projectId,
      pageTitle: title,
      pageContent: contentMd,
      pageType: "project",
      projectMeta: {
        taskCount,
        childNotesCount,
        subprojectsCount,
        status,
      },
    });

    return () => {
      clearPageContext();
    };
  }, [
    projectId,
    title,
    contentMd,
    status,
    taskCount,
    childNotesCount,
    subprojectsCount,
    setPageContext,
    clearPageContext,
  ]);

  return null;
}
