import { tagRouteLoadingFallback } from "@/components/tabs/route-loading";

function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-1/4 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-16 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default tagRouteLoadingFallback(DashboardLoading);
