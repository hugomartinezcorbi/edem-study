import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/queries/projects";
import { ProjectsExplorer } from "@/components/projects/ProjectsExplorer";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const projects = await listProjects(supabase);
  return <ProjectsExplorer initialProjects={projects} />;
}
