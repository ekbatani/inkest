"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Plus,
  MoreHorizontal,
  KeyRound,
  Shield,
  Trash2,
  AlertTriangle,
  FileText,
  FolderKanban,
  Cloud,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type {
  AdminUserListItem,
  AdminUserListResult,
} from "@/server/users/admin-service";
import {
  createUserAction,
  updateUserRoleAction,
  updateUserStatusAction,
  resetUserPasswordAction,
  deleteUserAction,
} from "@/server/users/admin-actions";

interface UserManagementViewProps {
  initialData: AdminUserListResult;
  currentUserId: string;
  embedded?: boolean;
}

export function UserManagementView({
  initialData,
  currentUserId,
  embedded = false,
}: UserManagementViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "suspended">("all");

  // Dialog states
  const [createOpen, setCreateOpen] = React.useState(false);
  const [roleModalUser, setRoleModalUser] = React.useState<AdminUserListItem | null>(null);
  const [statusModalUser, setStatusModalUser] = React.useState<AdminUserListItem | null>(null);
  const [resetPwdUser, setResetPwdUser] = React.useState<AdminUserListItem | null>(null);
  const [deleteModalUser, setDeleteModalUser] = React.useState<AdminUserListItem | null>(null);

  // Form states
  const [createForm, setCreateForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
  });
  const [targetRole, setTargetRole] = React.useState<"admin" | "user">("user");
  const [newPassword, setNewPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Client-side filtering
  const filteredUsers = React.useMemo(() => {
    return initialData.users.filter((user) => {
      const matchesSearch =
        !searchQuery.trim() ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.workspaceName && user.workspaceName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [initialData.users, searchQuery, roleFilter, statusFilter]);

  // Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password) {
      toast.error("Email and password are required.");
      return;
    }
    if (createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createUserAction(createForm);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("User created successfully.");
        setCreateOpen(false);
        setCreateForm({ name: "", email: "", password: "", role: "user" });
        router.refresh();
      }
    } catch {
      toast.error("Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleModalUser) return;
    setIsSubmitting(true);
    try {
      const res = await updateUserRoleAction({
        userId: roleModalUser.id,
        role: targetRole,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`User role updated to ${targetRole}.`);
        setRoleModalUser(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModalUser) return;
    const newStatus = statusModalUser.status === "active" ? "suspended" : "active";
    setIsSubmitting(true);
    try {
      const res = await updateUserStatusAction({
        userId: statusModalUser.id,
        status: newStatus,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          newStatus === "suspended"
            ? "User account suspended."
            : "User account activated.",
        );
        setStatusModalUser(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await resetUserPasswordAction({
        userId: resetPwdUser.id,
        newPassword,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Password reset successfully.");
        setResetPwdUser(null);
        setNewPassword("");
        router.refresh();
      }
    } catch {
      toast.error("Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    setIsSubmitting(true);
    try {
      const res = await deleteUserAction({ userId: deleteModalUser.id });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("User deleted successfully.");
        setDeleteModalUser(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full space-y-6",
        !embedded && "mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6",
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              User Management
            </h1>
            <Badge
              variant="outline"
              className="gap-1 border-primary/30 bg-primary/5 text-primary text-xs font-semibold"
            >
              <Cloud className="size-3" />
              Cloud
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage users, workspace privileges, access states, and security credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="gap-1.5 rounded-xl"
            title="Refresh list"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            onClick={() => {
              setCreateForm({ name: "", email: "", password: "", role: "user" });
              setCreateOpen(true);
            }}
            className="gap-2 rounded-xl shadow-sm"
          >
            <Plus className="size-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Users
            </span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {initialData.stats.totalUsers}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              Admins
            </span>
            <ShieldCheck className="size-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {initialData.stats.totalAdmins}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              Active
            </span>
            <UserCheck className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {initialData.stats.totalActive}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              Suspended
            </span>
            <UserX className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {initialData.stats.totalSuspended}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or workspace…"
            className="ps-9 rounded-xl border-border/80 bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1 text-xs">
            <span className="px-2 font-medium text-muted-foreground">Role:</span>
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                roleFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                roleFilter === "admin"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("user")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                roleFilter === "user"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              User
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1 text-xs">
            <span className="px-2 font-medium text-muted-foreground">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                statusFilter === "active"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("suspended")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                statusFilter === "suspended"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-border/80 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 text-start">
                  User
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  Workspace Activity
                </th>
                <th scope="col" className="px-4 py-3 text-start">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto size-8 opacity-30" />
                    <p className="mt-2 text-sm">No users match your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const initialLetter = (user.name || user.email || "U")
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      {/* User Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                            {initialLetter}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">
                                {user.name || "Unnamed"}
                              </span>
                              {isSelf && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 font-normal"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="block truncate text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        {user.role === "admin" ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs"
                          >
                            <ShieldCheck className="size-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            User
                          </Badge>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {user.status === "active" ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="gap-1 text-xs"
                          >
                            <span className="size-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </Badge>
                        )}
                      </td>

                      {/* Workspace Activity */}
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">
                            {user.workspaceName || "Personal"}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <FileText className="size-3" />
                              {user.notesCount} {user.notesCount === 1 ? "note" : "notes"}
                            </span>
                            <span className="flex items-center gap-1">
                              <FolderKanban className="size-3" />
                              {user.projectsCount}{" "}
                              {user.projectsCount === 1 ? "project" : "projects"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg"
                                aria-label="Open user actions menu"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                setRoleModalUser(user);
                                setTargetRole(user.role);
                              }}
                              disabled={isSelf}
                              className="gap-2"
                            >
                              <Shield className="size-4" />
                              <span>Change Role</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setResetPwdUser(user);
                                setNewPassword("");
                              }}
                              className="gap-2"
                            >
                              <KeyRound className="size-4" />
                              <span>Reset Password</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setStatusModalUser(user)}
                              disabled={isSelf}
                              className="gap-2"
                            >
                              {user.status === "active" ? (
                                <>
                                  <UserX className="size-4 text-rose-500" />
                                  <span className="text-rose-600 dark:text-rose-400">
                                    Suspend Account
                                  </span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="size-4 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    Activate Account
                                  </span>
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setDeleteModalUser(user)}
                              disabled={isSelf}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4" />
                              <span>Delete User</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle>Add New Cloud User</DialogTitle>
              <DialogDescription>
                Create a new user account with initial workspace and credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Full Name
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Jane Doe"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Email Address *
                </label>
                <Input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="jane@example.com"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Password * (min 8 characters)
                </label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="••••••••••••"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm((f) => ({ ...f, role: "user" }))
                    }
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3 text-start text-xs transition-colors",
                      createForm.role === "user"
                        ? "border-primary bg-primary/5 text-foreground font-semibold"
                        : "border-border/80 text-muted-foreground hover:bg-muted/30",
                    )}
                  >
                    <div>
                      <p className="font-medium">User</p>
                      <p className="text-[11px] text-muted-foreground">
                        Standard workspace access
                      </p>
                    </div>
                    {createForm.role === "user" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm((f) => ({ ...f, role: "admin" }))
                    }
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3 text-start text-xs transition-colors",
                      createForm.role === "admin"
                        ? "border-primary bg-primary/5 text-foreground font-semibold"
                        : "border-border/80 text-muted-foreground hover:bg-muted/30",
                    )}
                  >
                    <div>
                      <p className="font-medium">Admin</p>
                      <p className="text-[11px] text-muted-foreground">
                        Full management rights
                      </p>
                    </div>
                    {createForm.role === "admin" && (
                      <Check className="size-4 text-primary" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl"
              >
                {isSubmitting ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHANGE ROLE DIALOG */}
      <Dialog
        open={Boolean(roleModalUser)}
        onOpenChange={(open) => !open && setRoleModalUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update permissions for{" "}
              <strong className="text-foreground">{roleModalUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetRole("user")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-start text-xs transition-colors",
                  targetRole === "user"
                    ? "border-primary bg-primary/5 text-foreground font-semibold"
                    : "border-border/80 text-muted-foreground hover:bg-muted/30",
                )}
              >
                <div>
                  <p className="font-medium">User</p>
                  <p className="text-[11px] text-muted-foreground">
                    Standard access
                  </p>
                </div>
                {targetRole === "user" && <Check className="size-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setTargetRole("admin")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-start text-xs transition-colors",
                  targetRole === "admin"
                    ? "border-primary bg-primary/5 text-foreground font-semibold"
                    : "border-border/80 text-muted-foreground hover:bg-muted/30",
                )}
              >
                <div>
                  <p className="font-medium">Admin</p>
                  <p className="text-[11px] text-muted-foreground">
                    Full management
                  </p>
                </div>
                {targetRole === "admin" && <Check className="size-4 text-primary" />}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleModalUser(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateRole}
              disabled={isSubmitting || targetRole === roleModalUser?.role}
              className="rounded-xl"
            >
              {isSubmitting ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUSPEND / ACTIVATE DIALOG */}
      <Dialog
        open={Boolean(statusModalUser)}
        onOpenChange={(open) => !open && setStatusModalUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusModalUser?.status === "active"
                ? "Suspend User Account"
                : "Reactivate User Account"}
            </DialogTitle>
            <DialogDescription>
              {statusModalUser?.status === "active" ? (
                <span>
                  Are you sure you want to suspend{" "}
                  <strong className="text-foreground">
                    {statusModalUser?.email}
                  </strong>
                  ? They will immediately be prevented from signing in.
                </span>
              ) : (
                <span>
                  Reactivate{" "}
                  <strong className="text-foreground">
                    {statusModalUser?.email}
                  </strong>
                  ? They will regain access to their account and workspaces.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusModalUser(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                statusModalUser?.status === "active" ? "destructive" : "default"
              }
              onClick={handleUpdateStatus}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              {isSubmitting
                ? "Updating…"
                : statusModalUser?.status === "active"
                  ? "Suspend Account"
                  : "Activate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog
        open={Boolean(resetPwdUser)}
        onOpenChange={(open) => !open && setResetPwdUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Reset User Password</DialogTitle>
              <DialogDescription>
                Set a new password for{" "}
                <strong className="text-foreground">{resetPwdUser?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <label className="text-xs font-semibold text-foreground">
                New Password (min 8 characters)
              </label>
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password…"
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPwdUser(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || newPassword.length < 8}
                className="rounded-xl"
              >
                {isSubmitting ? "Resetting…" : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE USER DIALOG */}
      <Dialog
        open={Boolean(deleteModalUser)}
        onOpenChange={(open) => !open && setDeleteModalUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <DialogTitle>Delete User Account</DialogTitle>
            </div>
            <DialogDescription className="space-y-2 pt-2">
              <span>
                Are you sure you want to permanently delete{" "}
                <strong className="text-foreground">
                  {deleteModalUser?.email}
                </strong>
                ?
              </span>
              <span className="block text-xs text-destructive font-medium">
                This action is irreversible. All workspaces, notes, tasks, and
                attachments owned by this user will be permanently deleted.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalUser(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              {isSubmitting ? "Deleting…" : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
