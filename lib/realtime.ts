import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export function chatChannelName() {
  return "chat:global";
}

export function notificationsChannelName(userId: string) {
  return `notifications:${userId}`;
}

/** Subscribes to new global chat messages; returns an unsubscribe function. */
export function subscribeToChat(
  db: DB,
  onInsert: (message: ChatMessage) => void,
  onTypingSync?: (typingUserIds: string[]) => void
) {
  const channel = db
    .channel(chatChannelName())
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload: { new: ChatMessage }) => onInsert(payload.new)
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
