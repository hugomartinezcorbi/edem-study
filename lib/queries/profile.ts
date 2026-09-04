import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export interface ProfilePageData {
  profile: UserProfile;
}

export async function getProfileByUsername(db: DB, username: string): Promise<ProfilePageData | null> {
  const { data: profile } = await db.from("user_profiles").select("*").eq("username", username).maybeSingle();
  if (!profile) return null;
  return { profile };
}

export async function getProfileById(db: DB, id: string): Promise<ProfilePageData | null> {
  const { data: profile } = await db.from("user_profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  return { profile };
}
