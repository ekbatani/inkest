"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createNoteFromNewPageAction } from "@/server/notes/actions";
import { Loader2 } from "lucide-react";

function NewNoteCreator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdRef = React.useRef(false);

  React.useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    const parent = searchParams.get("parent");
    const as = searchParams.get("as");
    const title = searchParams.get("title");

    void createNoteFromNewPageAction({ parent, as, title }).then((targetUrl) => {
      router.replace(targetUrl);
      router.refresh();
    });
  }, [router, searchParams]);

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function NewNotePage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewNoteCreator />
    </React.Suspense>
  );
}

