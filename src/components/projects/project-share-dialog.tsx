"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberRoleAction,
} from "@/server/projects/actions";

export type ShareMember = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "viewer" | "editor";
};

export type ShareOwner = {
  email: string;
  name: string | null;
  image: string | null;
};

const ROLE_LABELS: Record<ShareMember["role"], string> = {
  viewer: "Can view",
  editor: "Can edit",
};

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source.slice(0, 1).toUpperCase();
}

export function ProjectShareMenu({
  projectId,
  owner,
  members,
}: {
  projectId: string;
  owner: ShareOwner;
  members: ShareMember[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<ShareMember["role"]>("viewer");
  const [adding, setAdding] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const addMember = async () => {
    const trimmed = email.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    setError(null);
    try {
      const result = await addProjectMemberAction(projectId, trimmed, role);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEmail("");
      toast.success(`Shared with ${trimmed}.`);
      router.refresh();
    } catch {
      setError("Could not add that person. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (member: ShareMember, nextRole: ShareMember["role"]) => {
    if (nextRole === member.role || pendingId) return;
    setPendingId(member.userId);
    try {
      const result = await updateProjectMemberRoleAction(
        projectId,
        member.userId,
        nextRole,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Failed to change role.");
    } finally {
      setPendingId(null);
    }
  };

  const removeMember = async (member: ShareMember) => {
    if (pendingId) return;
    setPendingId(member.userId);
    try {
      const result = await removeProjectMemberAction(projectId, member.userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed ${member.name ?? member.email}.`);
      router.refresh();
    } catch {
      toast.error("Failed to remove member.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <UserPlus className="size-4" /> Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this project</DialogTitle>
            <DialogDescription>
              Add people by their account email. Members can open the project
              from their own Projects list.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="share-email" className="text-xs text-muted-foreground">
                Add people
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="share-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addMember();
                    }
                  }}
                  placeholder="name@example.com"
                  className="h-9 min-w-0 flex-1"
                  disabled={adding}
                  aria-invalid={Boolean(error)}
                />
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as ShareMember["role"])}
                >
                  <SelectTrigger size="sm" className="w-[8.5rem]" aria-label="Role for new member">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                    <SelectItem value="editor">{ROLE_LABELS.editor}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => void addMember()}
                  disabled={adding || !email.trim()}
                  className="gap-1.5"
                >
                  {adding ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Add
                </Button>
              </div>
              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                People with access
              </p>
              <ul className="flex flex-col divide-y rounded-lg border">
                <li className="flex items-center gap-3 p-3">
                  <Avatar size="sm">
                    {owner.image ? (
                      <AvatarImage src={owner.image} alt={owner.name ?? owner.email} />
                    ) : null}
                    <AvatarFallback>{initials(owner.name, owner.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {owner.name ?? owner.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {owner.email}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Owner
                  </Badge>
                </li>
                {members.map((member) => (
                  <li key={member.userId} className="flex items-center gap-3 p-3">
                    <Avatar size="sm">
                      {member.image ? (
                        <AvatarImage
                          src={member.image}
                          alt={member.name ?? member.email}
                        />
                      ) : null}
                      <AvatarFallback>
                        {initials(member.name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name ?? member.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          void changeRole(member, value as ShareMember["role"])
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-[8.5rem]"
                          aria-label={`Role for ${member.name ?? member.email}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                          <SelectItem value="editor">{ROLE_LABELS.editor}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void removeMember(member)}
                        disabled={pendingId !== null}
                        aria-label={`Remove ${member.name ?? member.email}`}
                      >
                        {pendingId === member.userId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {members.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">
                  Not shared with anyone yet.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
