import { redirect } from "next/navigation";

export default function JournalPage() {
  redirect("/planner?tab=journal");
}
