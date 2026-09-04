import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export function chatChannelName(degree: "ADE" | "IGE" | null) {
  return `chat:${degree ?? "mixed"}`;
}

export function notificationsChannelName(userId: string) {
  return `notifications:${userId}`;
}

/**
 * Subscribes to new chat messages for one channel (degree, or null for the
 * mixed channel); returns an unsubscribe function. Filters client-side rather
 * than via a postgres_changes `filter`, since that syntax doesn't cleanly
 * cover the "is null" case alongside "eq" for the same subscription.
 */
export function subscribeToChat(
  db: DB,
  degree: "ADE" | "IGE" | null,
  onInsert: (message: ChatMessage) => void,
  onTypingSync?: (typingUserIds: string[]) => void
) {
  const channel = db
    .channel(chatChannelName(degree))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload: { new: ChatMessage }) => {
        if (payload.new.degree === degree) onInsert(payload.new);
      }
    )
    .on("presence", { event: "sync" }, () => {
      if (!onTypingSync) return;
      const state = channel.presenceState<{ typing: boolean; user_id: string }>();
      const typing = Object.values(state)
        .flat()
        .filter((p) => p.typing)
        .map((p) => p.user_id);
      onTypingSync(typing);
    })
    .subscribe();

  return {
    channel,
    unsubscribe: () => db.removeChannel(channel),
  };
}

export function subscribeToNotifications(db: DB, userId: string, onInsert: (payload: unknown) => void) {
  const channel = db
    .channel(notificationsChannelName(userId))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload: { new: unknown }) => onInsert(payload.new)
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => db.removeChannel(channel),
  };
}
