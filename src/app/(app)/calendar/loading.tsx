import { tagRouteLoadingFallback } from "@/components/tabs/route-loading";

import { Loader2 } from "lucide-react";

function CalendarLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default tagRouteLoadingFallback(CalendarLoading);
