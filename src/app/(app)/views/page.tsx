import { listSavedViews } from "@/server/views/service";
import { listTags } from "@/server/tags/service";
import { SavedViewsManager } from "@/components/views/saved-views-manager";

export const metadata = {
  title: "Saved Views | Inkest",
  description: "Dynamic saved views and filter collections for your PKB notes.",
};

export default async function SavedViewsPage() {
  const [views, tags] = await Promise.all([
    listSavedViews(),
    listTags(),
  ]);

  return <SavedViewsManager initialViews={views} allTags={tags} />;
}
