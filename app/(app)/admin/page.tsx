import { requireAdmin } from "@/lib/admin";
import { getGeneralStats, getModerationStats } from "@/lib/queries/admin";
import { Card, CardBody } from "@/components/ui/Card";
import { redirect } from "next/navigation";

export default async function AdminStatsPage() {
  const supabase = await requireAdmin();
  if (!supabase) redirect("/dashboard");

  const [stats, modStats] = await Promise.all([getGeneralStats(supabase), getModerationStats(supabase)]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Usuarios totales" value={stats.totalUsers} />
        <Stat label="Activos hoy" value={stats.activeToday} />
        <Stat label="Activos esta semana" value={stats.activeWeek} />
        <Stat label="PDFs generados" value={stats.pdfGenerationsTotal} />
        <Stat label="Mensajes de chat" value={stats.messagesTotal} />
        <Stat label="Publicaciones" value={stats.postsTotal} />
        <Stat label="Apuntes compartidos" value={stats.sharedNotesTotal} />
        <Stat label="Pendientes de revisión" value={modStats.pendingCount} accent />
      </section>

      <Card>
        <CardBody className="space-y-3">
          <p className="label-mono">Moderación (histórico)</p>
          <div className="flex gap-6">
            <MiniStat label="Auto-aprobado" value={modStats.autoApproved} color="var(--color-volver-text)" />
            <MiniStat label="Revisión manual" value={modStats.needsReview} color="var(--color-estudiar-text)" />
            <MiniStat label="Auto-rechazado" value={modStats.autoRejected} color="var(--color-fallar-text)" />
          </div>
          {modStats.total > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden">
              <div style={{ width: `${(modStats.autoApproved / modStats.total) * 100}%`, backgroundColor: "var(--color-volver-text)" }} />
              <div style={{ width: `${(modStats.needsReview / modStats.total) * 100}%`, backgroundColor: "var(--color-estudiar-text)" }} />
              <div style={{ width: `${(modStats.autoRejected / modStats.total) * 100}%`, backgroundColor: "var(--color-fallar-text)" }} />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardBody>
        <p className="label-mono">{label}</p>
        <p className={`text-2xl font-heading font-bold mt-1 ${accent ? "text-danger" : ""}`}>{value}</p>
      </CardBody>
    </Card>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xl font-heading font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
