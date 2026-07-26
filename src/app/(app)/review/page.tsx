import { getPlannerData } from "@/server/tasks/planner-service";
import { ReviewWizard } from "@/components/planner/review-wizard";

export const metadata = {
  title: "Weekly Review | Inkest",
  description: "Weekly review ritual for task triage and goal planning.",
};

export default async function ReviewPage() {
  const data = await getPlannerData();
  return <ReviewWizard data={data} />;
}
