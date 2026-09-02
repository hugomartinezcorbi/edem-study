"use client";

import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { AppNotification } from "@/lib/types";
import { useState } from "react";

export function NotificationList({ initialNotifications }: { initialNotifications: AppNotification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);

  async function handleClick(notification: AppNotification) {
    if (notification.is_read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notification.id }),
    });
  }

  return (
    <div className="space-y-1">
      {notifications.length === 0 && <p className="text-sm text-muted text-center py-12">Sin notificaciones todavía.</p>}
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onClick={() => handleClick(n)} />
      ))}
    </div>
  );
}
