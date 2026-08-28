import { notFound, redirect } from "next/navigation";
import { isCloudDeployment } from "@/server/config/deployment";
import { requireAdminUser, AdminAccessError } from "@/server/auth/admin";
import { listUsersAdmin } from "@/server/users/admin-service";
import { UserManagementView } from "@/components/admin/user-management-view";

export const metadata = {
  title: "User Management | Admin | Inkest",
  description: "Manage registered users and workspace permissions.",
};

export default async function AdminUsersPage() {
  // In self-hosted environment, this page strictly does not exist
  if (!isCloudDeployment()) {
    notFound();
  }

  let currentUser;
  try {
    currentUser = await requireAdminUser();
  } catch (err: unknown) {
    if (err instanceof AdminAccessError) {
      if (err.code === "UNAUTHENTICATED") {
        redirect("/signin");
      }
      if (err.code === "NOT_CLOUD" || err.code === "FORBIDDEN" || err.code === "SUSPENDED") {
        notFound();
      }
    }
    notFound();
  }

  const initialData = await listUsersAdmin();

  return (
    <div className="w-full min-h-full py-6">
      <UserManagementView
        initialData={initialData}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
