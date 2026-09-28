import { Skeleton } from "@/components/ui/skeleton";

export default function NoteLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="ml-auto h-8 w-32" />
      </div>
      <div className="flex flex-1">
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-64" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
