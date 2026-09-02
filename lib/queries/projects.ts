import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, ProjectApplication } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export async function listProjects(db: DB, query?: string): Promise<Project[]> {
  let q = db
    .from("projects")
    .select("*, creator:user_profiles(*)")
    .eq("moderation_status", "approved")
    .eq("is_deleted", false)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);
  if (query?.trim()) q = q.ilike("title", `%${query.trim()}%`);
  const { data } = await q;
  return (data as Project[]) ?? [];
}

export async function getProject(db: DB, id: string): Promise<Project | null> {
  const { data } = await db.from("projects").select("*, creator:user_profiles(*)").eq("id", id).maybeSingle();
  return (data as Project) ?? null;
}

export async function getProjectApplications(db: DB, projectId: string, viewerId?: string): Promise<ProjectApplication[]> {
  const { data } = await db
    .from("project_applications")
    .select("*, applicant:user_profiles(*)")
    .eq("project_id", projectId)
    .order("status", { ascending: true })
    .order("likes_count", { ascending: false })
    .order("created_at", { ascending: false });

  const applications = (data as ProjectApplication[]) ?? [];
  if (!viewerId || applications.length === 0) return applications;

  const { data: myLikes } = await db
    .from("project_application_likes")
    .select("application_id")
    .eq("user_id", viewerId)
    .in("application_id", applications.map((a) => a.id));
  const likedIds = new Set((myLikes ?? []).map((l: { application_id: string }) => l.application_id));

  return applications.map((a) => ({ ...a, my_like: likedIds.has(a.id) }));
}

export async function getMyApplication(db: DB, projectId: string, userId: string): Promise<ProjectApplication | null> {
  const { data } = await db
    .from("project_applications")
    .select("*")
    .eq("project_id", projectId)
    .eq("applicant_id", userId)
    .maybeSingle();
  return (data as ProjectApplication) ?? null;
}
