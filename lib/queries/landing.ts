import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

/**
 * % of registered users who have taken at least one social action (chatted,
 * or started/applied to a project). Runs with the service-role client since
 * it aggregates across tables, but only ever returns a single rounded
 * percentage — no user data leaves it.
 */
export async function getSocialAdoptionPercent(db: DB): Promise<number> {
  const [{ count: totalUsers }, chats, projects, applications] = await Promise.all([
    db.from("user_profiles").select("id", { count: "exact", head: true }),
    db.from("chat_messages").select("user_id"),
    db.from("projects").select("creator_id"),
    db.from("project_applications").select("applicant_id"),
  ]);

  if (!totalUsers) return 1;

  const engaged = new Set<string>();
  for (const row of chats.data ?? []) engaged.add(row.user_id);
  for (const row of projects.data ?? []) engaged.add(row.creator_id);
  for (const row of applications.data ?? []) engaged.add(row.applicant_id);

  const percent = Math.round((engaged.size / totalUsers) * 100);
  return Math.min(100, Math.max(1, percent));
}
