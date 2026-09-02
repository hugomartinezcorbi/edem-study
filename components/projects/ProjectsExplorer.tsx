"use client";

import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import type { Project } from "@/lib/types";
import { useState } from "react";
import { Plus } from "lucide-react";

export function ProjectsExplorer({ initialProjects }: { initialProjects: Project[] }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Proyectos</h1>
          <p className="text-sm text-muted mt-1">
            Publica tu idea o startup y encuentra gente de EDEM con la que sacarla adelante.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Publicar proyecto
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialProjects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {initialProjects.length === 0 && (
          <p className="text-sm text-muted col-span-full text-center py-12">
            Todavía no hay proyectos — publica el primero.
          </p>
        )}
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
