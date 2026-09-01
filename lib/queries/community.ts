import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityMembership, CommunitySubject } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export interface JoinedCommunity extends CommunitySubject {
  role: CommunityMembership["role"];
}

export async function getJoinedCommunities(db: DB, userId: string): Promise<JoinedCommunity[]> {
  const { data } = await db
    .from("community_memberships")
    .select("role, community_subjects(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  return (data ?? [])
    .filter((row) => row.community_subjects)
    .map((row) => ({
      ...(row.community_subjects as unknown as CommunitySubject),
      role: row.role as CommunityMembership["role"],
    }));
}

export async function searchCommunities(db: DB, query: string): Promise<CommunitySubject[]> {
  let q = db.from("community_subjects").select("*").order("member_count", { ascending: false }).limit(30);
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const { data } = await q;
  return (data as CommunitySubject[]) ?? [];
}

export async function getCommunity(db: DB, id: string): Promise<CommunitySubject | null> {
  const { data } = await db.from("community_subjects").select("*").eq("id", id).maybeSingle();
  return (data as CommunitySubject) ?? null;
}

export async function getMembership(db: DB, communityId: string, userId: string): Promise<CommunityMembership | null> {
  const { data } = await db
    .from("community_memberships")
    .select("*")
    .eq("community_subject_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as CommunityMembership) ?? null;
}
