import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export async function notify(
  db: DB,
  params: { userId: string; type: NotificationType; title: string; body: string; link?: string }
) {
  if (!params.userId) return;
  await db.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
  });
}

/** Extracts @username mentions from a message/post body. */
export function extractMentions(content: string): string[] {
  const matches = content.matchAll(/@([a-zA-Z0-9_]{2,32})/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

export async function notifyMentions(
  db: DB,
  params: { content: string; excludeUserId: string; title: string; link: string }
) {
  const usernames = extractMentions(params.content);
  if (usernames.length === 0) return;

  const { data: profiles } = await db.from("user_profiles").select("id, username").in("username", usernames);
  for (const profile of profiles ?? []) {
    if (profile.id === params.excludeUserId) continue;
    await notify(db, {
      userId: profile.id,
      type: "mention",
      title: params.title,
      body: `Te han mencionado: "${params.content.slice(0, 120)}"`,
      link: params.link,
    });
  }
}
