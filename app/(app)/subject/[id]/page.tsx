import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BookOpen, FileText, GraduationCap, Upload } from "lucide-react";

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: subject }, { data: concepts }, { data: documents }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", id).single(),
    supabase.from("concepts").select("id, mastery_level").eq("subject_id", id),
    supabase.from("documents").select("id, is_exam").eq("subject_id", id),
  ]);

  if (!subject) notFound();

  const total = concepts?.length ?? 0;
  const mastered = concepts?.filter((c) => c.mastery_level >= 0.8).length ?? 0;
  const docsCount = documents?.filter((d) => !d.is_exam).length ?? 0;
  const examsCount = documents?.filter((d) => d.is_exam).length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{subject.icon}</span>
        <div>
          <h1 className="text-2xl font-bold">{subject.name}</h1>
          <p className="text-sm text-muted">Semestre {subject.semester} · {subject.ects} ECTS</p>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Dominio general</span>
            <span className="font-medium">
              {mastered}/{total} conceptos
            </span>
          </div>
          <ProgressBar value={total ? mastered / total : 0} color={subject.color} />
        </CardBody>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NavCard href={`/subject/${id}/notes`} icon={<BookOpen size={20} />} title="Apuntes" desc="La página única que crece" />
        <NavCard href={`/subject/${id}/documents`} icon={<Upload size={20} />} title="Documentos" desc={`${docsCount} subidos`} />
        <NavCard href={`/subject/${id}/exams`} icon={<FileText size={20} />} title="Exámenes anteriores" desc={`${examsCount} analizados`} />
        <NavCard href={`/subject/${id}/study`} icon={<GraduationCap size={20} />} title="Estudiar" desc="Método Fallar-Estudiar-Explicar-Volver" accent />
      </div>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  desc,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={accent ? "bg-accent text-accent-foreground border-none h-full" : "h-full hover:bg-surface-hover transition-colors"}>
        <CardBody className="space-y-2">
          {icon}
          <p className="font-semibold">{title}</p>
          <p className={`text-xs ${accent ? "opacity-80" : "text-muted"}`}>{desc}</p>
        </CardBody>
      </Card>
    </Link>
  );
}
