"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InboxNotification } from "@/server/notifications/service";

export function NotificationInbox({ notifications }: { notifications: InboxNotification[] }) {
  const router = useRouter();
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const openNotification = (notification: InboxNotification) => {
    void import("@/server/notifications/actions").then((actions) => actions.markNotificationReadAction(notification.id));
    if (notification.href) router.push(notification.href);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} />}>
        <Bell className="size-4" />
        {unread ? <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" /> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        {notifications.length ? notifications.map((notification) => (
          <DropdownMenuItem key={notification.id} onClick={() => openNotification(notification)} className="items-start whitespace-normal py-2.5">
            <CheckCircle2 className={notification.readAt ? "mt-0.5 size-4 text-muted-foreground" : "mt-0.5 size-4 text-primary"} />
            <span className="grid gap-0.5"><span>{notification.title}</span><span className="text-xs font-normal text-muted-foreground">{notification.body}</span></span>
          </DropdownMenuItem>
        )) : <p className="px-3 py-4 text-sm text-muted-foreground">You’re all caught up.</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
