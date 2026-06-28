import { FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex items-center gap-2">
        <FolderKanban className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      </header>
      <p className="text-muted-foreground">
        Project notes arrive in a later phase.
      </p>
    </div>
  );
}
