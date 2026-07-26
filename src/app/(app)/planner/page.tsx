import { getPlannerData } from "@/server/tasks/planner-service";
import { PlannerView } from "@/components/planner/planner-view";

export const metadata = {
  title: "Planner | Inkest",
  description: "Goal decomposition, next actions, and implementation intentions.",
};

export default async function PlannerPage() {
  const data = await getPlannerData();
  return <PlannerView initialData={data} />;
}
