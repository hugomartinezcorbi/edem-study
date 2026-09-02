import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export function chatChannelName(communitySubjectId: string) {
  return `chat:${communitySubjectId}`;
}

export function notificationsChannelName(userId: string) {
  return `notifications:${userId}`;
}

/** Subscribes to new chat messages for a community; returns an unsubscribe function. */
export function subscribeToChat(
  db: DB,
  communitySubjectId: string,
  onInsert: (message: ChatMessage) => void,
  onTypingSync?: (typingUserIds: string[]) => void
) {
  const channel = db
    .channel(chatChannelName(communitySubjectId))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `community_subject_id=eq.${communitySubjectId}` },
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
