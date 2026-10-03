import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="app-page gap-8 sm:gap-10" aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>
      <div className="surface-card flex flex-col gap-6 p-6 sm:p-8">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-9 w-3/4 max-w-md rounded-lg" />
          <Skeleton className="h-4 w-full max-w-lg rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-border/70 pt-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-64" />
      <div className="grid gap-8 lg:grid-cols-5 lg:gap-6">
        <Skeleton className="h-56 lg:col-span-3" />
        <Skeleton className="h-56 lg:col-span-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
