"use client";

import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import Link from "next/link";

export function NotificationItem({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
  const content = (
    <div
      className={cn(
        "px-3 py-2.5 rounded-lg transition-colors",
        !notification.is_read && "bg-accent/5",
        notification.link && "hover:bg-surface-hover cursor-pointer"
      )}
      onClick={onClick}
    >
      <p className="text-sm font-medium">{notification.title}</p>
      <p className="text-xs text-muted line-clamp-2">{notification.body}</p>
      <p className="text-xs text-muted-light font-mono mt-0.5">
        {new Date(notification.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );

  return notification.link ? <Link href={notification.link}>{content}</Link> : content;
}
