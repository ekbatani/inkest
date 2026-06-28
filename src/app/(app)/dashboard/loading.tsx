import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="h-36 rounded-xl" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
