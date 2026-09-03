import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export async function getTopUsers(db: DB, degree: "ADE" | "IGE", limit = 50): Promise<UserProfile[]> {
  const { data } = await db
    .from("user_profiles")
    .select("*")
    .eq("is_banned", false)
    .eq("degree", degree)
    .order("reputation_score", { ascending: false })
    .limit(limit);
  return (data as UserProfile[]) ?? [];
}
