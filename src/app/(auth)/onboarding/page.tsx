import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { getUserSettings } from "@/server/users/settings-service";
import { ProfileSetupWizard } from "@/components/auth/profile-setup-wizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const [workspace, settings] = await Promise.all([
    getWorkspaceForUser(user.id),
    getUserSettings(),
  ]);

  return (
    <div className="w-full max-w-4xl py-6 sm:py-10 px-4 mx-auto">
      <ProfileSetupWizard
        initialUser={user}
        initialWorkspaceName={workspace?.name ?? "Personal Workspace"}
        initialSettings={settings}
      />
    </div>
  );
}
