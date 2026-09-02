import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import type { Project } from "@/lib/types";
import Link from "next/link";
import { Users, FileText } from "lucide-react";

const CATEGORY_LABELS: Record<Project["category"], string> = {
  startup: "Startup",
  app: "App",
  proyecto: "Proyecto de clase",
  investigacion: "Investigación",
  otro: "Otro",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full flex flex-col hover:border-accent transition-colors">
        <CardBody className="flex-1 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Badge>{CATEGORY_LABELS[project.category]}</Badge>
            {project.status === "closed" && <Badge className="text-muted-light">Cerrado</Badge>}
          </div>
          <p className="font-semibold leading-snug">{project.title}</p>
          <p className="text-sm text-muted line-clamp-2">{project.tagline}</p>
          <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted">
            <span>{project.creator?.display_name}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users size={12} /> {project.member_count}
              </span>
              <span className="flex items-center gap-1">
                <FileText size={12} /> {project.applications_count}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
