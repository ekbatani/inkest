import { notFound, redirect } from "next/navigation";
import { isCloudDeployment } from "@/server/config/deployment";
import { requireAdminUser, AdminAccessError } from "@/server/auth/admin";

export const metadata = {
  title: "User Management | Admin | Inkest",
  description: "Manage registered users and workspace permissions.",
};

export default async function AdminUsersPage() {
  // In self-hosted environment, this page strictly does not exist
  if (!isCloudDeployment()) {
    notFound();
  }

  try {
    await requireAdminUser();
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

  // Redirect to Settings -> User Management tab
  redirect("/settings?tab=users");
}
