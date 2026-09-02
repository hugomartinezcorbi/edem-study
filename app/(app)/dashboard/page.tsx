import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/queries/dashboard";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { formatRelativeDays } from "@/lib/utils";
import Link from "next/link";
import { Flame, Target, TrendingDown, TrendingUp, Upload } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const data = await getDashboardData(supabase, user.id);
  const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";
  const activeSubjects = data.subjects.filter((s) => s.active);
  const inactiveSubjects = data.subjects.filter((s) => !s.active);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-muted text-sm">
            {greeting}
            {name ? `, ${name}` : ""}
          </p>
          <h1 className="text-2xl font-bold mt-1">
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </h1>
        </div>
        {data.streakDays > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <Flame size={18} />
            {data.streakDays} {data.streakDays === 1 ? "día" : "días"} seguidos estudiando
          </div>
        )}
      </div>

      <Card className="bg-accent text-accent-foreground border-none">
        <CardBody className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="label-mono !text-white/70">Lo que toca hoy</p>
            <p className="text-3xl font-bold font-heading mt-1">
              {data.dueTodayCount} {data.dueTodayCount === 1 ? "concepto" : "conceptos"} pendientes de repaso
            </p>
          </div>
          <Link href="/study?mode=today">
            <Button variant="secondary" size="lg" className="bg-white/15 text-white hover:bg-white/25">
              Empezar ahora
            </Button>
          </Link>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Minutos esta semana" value={data.weekMinutes.toString()} />
        <StatCard label="Conceptos nuevos" value={data.weekNewConcepts.toString()} />
        <StatCard
          label="Tasa de acierto"
          value={data.globalAccuracy !== null ? `${Math.round(data.globalAccuracy * 100)}%` : "—"}
        />
        <StatCard
          label={data.strongestSubject ? "Más fuerte" : "Sin datos aún"}
          value={data.strongestSubject ?? "—"}
          small
        />
      </div>

      {data.totalConcepts > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <p className="label-mono">Apuntes generados</p>
            <ProgressBar value={data.totalMasteredConcepts / data.totalConcepts} />
            <p className="text-xs font-mono text-muted">
              {Math.round((data.totalMasteredConcepts / data.totalConcepts) * 100)}% de conceptos dominados
              {data.documentVersions > 0 && ` · v${data.documentVersions}`}
            </p>
          </CardBody>
        </Card>
      )}

      {(data.strongestSubject || data.weakestSubject) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.strongestSubject && (
            <Card>
              <CardBody className="flex items-center gap-3">
                <TrendingUp className="text-success" size={20} />
                <div>
                  <p className="label-mono">Asignatura más fuerte</p>
                  <p className="font-medium">{data.strongestSubject}</p>
                </div>
              </CardBody>
            </Card>
          )}
          {data.weakestSubject && (
            <Card>
              <CardBody className="flex items-center gap-3">
                <TrendingDown className="text-danger" size={20} />
                <div>
                  <p className="label-mono">Necesita más repaso</p>
                  <p className="font-medium">{data.weakestSubject}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Semestre I</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeSubjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      </section>

      {inactiveSubjects.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-muted">Semestre II</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveSubjects.map((s) => (
              <SubjectCard key={s.id} subject={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <Card>
      <CardBody>
        <p className="label-mono">{label}</p>
        <p className={`font-bold font-heading mt-1 ${small ? "text-base truncate" : "text-2xl"}`}>{value}</p>
      </CardBody>
    </Card>
  );
}

function SubjectCard({
  subject,
}: {
  subject: import("@/lib/queries/dashboard").SubjectCardData;
}) {
  const masteryRatio = subject.totalConcepts ? subject.masteredConcepts / subject.totalConcepts : 0;
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: subject.color }} />
      <CardBody className="flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{subject.icon}</span>
            <p className="font-semibold leading-tight truncate">{subject.name}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>
              {subject.masteredConcepts}/{subject.totalConcepts} dominados
            </span>
            <span>{Math.round(masteryRatio * 100)}%</span>
          </div>
          <ProgressBar value={masteryRatio} color={subject.color} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1">
            <Target size={12} /> {formatRelativeDays(subject.lastStudied)}
          </span>
          <span className="flex items-center gap-1">
            <Upload size={12} /> {subject.documentsCount} docs
          </span>
        </div>

        <div className="mt-auto pt-2 flex gap-2 text-xs font-medium">
          <Link href={`/subject/${subject.id}/notes`} className="flex-1 text-center py-2 rounded-lg bg-surface-hover hover:bg-border transition-colors">
            Apuntes
          </Link>
          <Link href={`/subject/${subject.id}/study`} className="flex-1 text-center py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity">
            Estudiar
          </Link>
          <Link href={`/subject/${subject.id}/documents`} className="flex-1 text-center py-2 rounded-lg bg-surface-hover hover:bg-border transition-colors">
            Docs
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
