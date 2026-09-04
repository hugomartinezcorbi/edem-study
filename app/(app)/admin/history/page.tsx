import { requireAdmin } from "@/lib/admin";
import { getModerationHistory } from "@/lib/queries/admin";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";

const TYPE_LABEL: Record<string, string> = {
  chat_message: "Mensaje de chat",
  project: "Proyecto",
  project_application: "Solicitud de proyecto",
};

const DECISION_COLOR: Record<string, string> = {
  auto_approved: "var(--color-volver-text)",
  needs_review: "var(--color-estudiar-text)",
  auto_rejected: "var(--color-fallar-text)",
};

export default async function AdminHistoryPage() {
  const supabase = await requireAdmin();
  if (!supabase) redirect("/dashboard");

  const items = await getModerationHistory(supabase);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{items.length} elementos moderados</p>
      {items.map((item) => (
        <Card key={item.id}>
          <CardBody className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{TYPE_LABEL[item.content_type]}</Badge>
                <span className="text-xs text-muted">{item.author?.display_name}</span>
                <span className="text-xs font-mono" style={{ color: DECISION_COLOR[item.ai_decision] }}>
                  {item.ai_decision}
                </span>
                {item.admin_decision && (
                  <span className="text-xs text-muted-light font-mono">→ admin: {item.admin_decision}</span>
                )}
              </div>
              <p className="text-sm mt-1 truncate">{item.content_preview}</p>
            </div>
            <span className="text-xs text-muted-light font-mono shrink-0">
              {new Date(item.created_at).toLocaleDateString("es-ES")}
            </span>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
