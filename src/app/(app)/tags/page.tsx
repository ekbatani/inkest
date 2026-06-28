import { Tags } from "lucide-react";
import { listTagsWithCounts } from "@/server/tags/service";
import { TagsManager } from "@/components/tags/tags-manager";

export default async function TagsPage() {
  const tags = await listTagsWithCounts();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center gap-2">
        <Tags className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
      </header>
      <p className="text-sm text-muted-foreground">
        Organize notes with colored tags. Tags can also be applied from the
        note editor’s metadata panel.
      </p>
      <TagsManager initialTags={tags} />
    </div>
  );
}