import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/queries/projects";
import { ProjectsExplorer } from "@/components/projects/ProjectsExplorer";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const projects = await listProjects(supabase, q ?? "");
  return <ProjectsExplorer initialProjects={projects} initialQuery={q ?? ""} />;
}
