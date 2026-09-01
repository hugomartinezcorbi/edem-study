import { StudySession } from "@/components/study/StudySession";
import { Card, CardBody } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { GraduationCap, Shuffle, Target } from "lucide-react";

export default async function StudyEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;

  if (mode === "today" || mode === "quick") {
    return <StudySession mode={mode} color="var(--color-accent)" />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: subjects } = user
    ? await supabase.from("subjects").select("*").eq("user_id", user.id).eq("active", true).order("name")
    : { data: [] };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">¿Qué quieres estudiar?</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/study?mode=today">
          <Card className="h-full hover:bg-surface-hover transition-colors">
            <CardBody className="space-y-2">
              <Target className="text-accent" size={22} />
              <p className="font-semibold">Lo que toca hoy</p>
              <p className="text-xs text-muted">Repetición espaciada: los conceptos que ya te tocan repasar.</p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/study?mode=quick">
          <Card className="h-full hover:bg-surface-hover transition-colors">
            <CardBody className="space-y-2">
              <Shuffle className="text-accent" size={22} />
              <p className="font-semibold">Repaso rápido</p>
              <p className="text-xs text-muted">10 preguntas aleatorias de todas tus asignaturas.</p>
            </CardBody>
          </Card>
        </Link>
      </div>

      <div>
        <p className="text-sm font-semibold text-muted mb-3">O elige una asignatura</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {(subjects ?? []).map((s) => (
            <Link key={s.id} href={`/subject/${s.id}/study`}>
              <Card className="hover:bg-surface-hover transition-colors">
                <CardBody className="flex items-center gap-3">
                  <span className="text-xl">{s.icon}</span>
                  <p className="font-medium text-sm">{s.name}</p>
                  <GraduationCap size={16} className="ml-auto text-muted" />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
