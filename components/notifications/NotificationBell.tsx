"use client";

import { NotificationItem } from "@/components/notifications/NotificationItem";
import { createClient } from "@/lib/supabase/client";
import { subscribeToNotifications } from "@/lib/realtime";
import type { AppNotification } from "@/lib/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationBell({ userId, initialUnreadCount }: { userId: string; initialUnreadCount: number }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { unsubscribe } = subscribeToNotifications(supabase, userId, (payload) => {
      setNotifications((prev) => [payload as AppNotification, ...prev]);
      setUnreadCount((c) => c + 1);
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!loaded) {
      const res = await fetch("/api/notifications");
      const body = await res.json();
      setNotifications(body.notifications ?? []);
      setLoaded(true);
    }
  }

  async function handleMarkAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  async function handleItemClick(notification: AppNotification) {
    if (notification.is_read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notification.id }),
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-surface-hover text-muted transition-colors cursor-pointer"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface border border-border rounded-2xl shadow-[0_20px_50px_rgba(20,40,50,0.12)] z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-sm font-medium">Notificaciones</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-accent cursor-pointer">
                Marcar todas
              </button>
            )}
          </div>
          <div className="p-1">
            {notifications.length === 0 && <p className="text-sm text-muted text-center py-8">Sin notificaciones</p>}
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onClick={() => handleItemClick(n)} />
            ))}
          </div>
          <div className="border-t border-border p-2">
            <Link href="/notifications" className="text-xs text-accent block text-center py-1" onClick={() => setOpen(false)}>
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
