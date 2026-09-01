import type { SupabaseClient } from "@supabase/supabase-js";
import type { SharedNote, UserProfile } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export interface ProfileStats {
  sharedNotesCount: number;
  postsCount: number;
  votesReceived: number;
}

export interface ProfilePageData {
  profile: UserProfile;
  stats: ProfileStats;
  topNotes: SharedNote[];
}

export async function getProfileByUsername(db: DB, username: string): Promise<ProfilePageData | null> {
  const { data: profile } = await db.from("user_profiles").select("*").eq("username", username).maybeSingle();
  if (!profile) return null;
  return getProfileData(db, profile);
}

export async function getProfileById(db: DB, id: string): Promise<ProfilePageData | null> {
  const { data: profile } = await db.from("user_profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  return getProfileData(db, profile);
}

async function getProfileData(db: DB, profile: UserProfile): Promise<ProfilePageData> {
  const [{ count: sharedNotesCount }, { count: postsCount }, { data: topNotes }] = await Promise.all([
    db.from("shared_notes").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    db.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_deleted", false),
    db
      .from("shared_notes")
      .select("*")
      .eq("user_id", profile.id)
      .order("rating_average", { ascending: false })
      .limit(6),
  ]);

  return {
    profile,
    stats: {
      sharedNotesCount: sharedNotesCount ?? 0,
      postsCount: postsCount ?? 0,
      votesReceived: profile.reputation_score,
    },
    topNotes: (topNotes as SharedNote[]) ?? [],
  };
}
