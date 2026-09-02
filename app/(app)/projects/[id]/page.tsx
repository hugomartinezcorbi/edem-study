import { createClient } from "@/lib/supabase/server";
import { getProject, getProjectApplications } from "@/lib/queries/projects";
import { ApplyBox } from "@/components/projects/ApplyBox";
import { ApplicationCard } from "@/components/projects/ApplicationCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { notFound } from "next/navigation";
import { Users, FileText } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  startup: "Startup",
  app: "App",
  proyecto: "Proyecto de clase",
  investigacion: "Investigación",
  otro: "Otro",
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const project = await getProject(supabase, id);
  if (!project) notFound();

  const applications = await getProjectApplications(supabase, id, user?.id);
  const isCreator = user?.id === project.creator_id;
  const myApplication = user ? applications.find((a) => a.applicant_id === user.id) : undefined;
  const publicApplications = applications.filter((a) => a.status !== "rejected" || a.applicant_id === user?.id);

  const canApply = user && !isCreator && !myApplication && project.status === "open";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{CATEGORY_LABELS[project.category]}</Badge>
          {project.status === "closed" && <Badge className="text-muted-light">Cerrado</Badge>}
        </div>
        <h1 className="text-2xl font-heading font-bold">{project.title}</h1>
        <p className="text-muted">{project.tagline}</p>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>
            Creado por <span className="font-medium text-foreground">{project.creator?.display_name}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} /> {project.member_count}
          </span>
          <span className="flex items-center gap-1">
            <FileText size={13} /> {project.applications_count} solicitudes
          </span>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{project.description}</p>
          {project.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {project.looking_for.map((role) => (
                <Badge key={role}>{role}</Badge>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {canApply && <ApplyBox projectId={project.id} />}
      {myApplication && myApplication.status === "pending" && (
        <p className="text-sm text-muted text-center">Tu solicitud está en revisión — pide a otros que le den like.</p>
      )}

      <div className="space-y-3">
        <p className="label-mono">Solicitudes</p>
        {publicApplications.length === 0 && <p className="text-sm text-muted">Nadie ha solicitado unirse todavía.</p>}
        {publicApplications.map((a) => (
          <ApplicationCard key={a.id} application={a} isCreator={isCreator} isOwnApplication={a.applicant_id === user?.id} />
        ))}
      </div>
    </div>
  );
}
