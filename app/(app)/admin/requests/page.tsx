import { requireAdmin } from "@/lib/admin";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RequestReplyForm } from "@/components/admin/RequestReplyForm";
import type { UserRequest } from "@/lib/types";
import { redirect } from "next/navigation";

const CATEGORY_LABEL: Record<UserRequest["category"], string> = {
  sugerencia: "Sugerencia",
  error: "Algo no funciona",
  ayuda: "Necesito ayuda",
  otro: "Otro",
};

export default async function AdminRequestsPage() {
  const supabase = await requireAdmin();
  if (!supabase) redirect("/dashboard");

  const { data } = await supabase
    .from("requests")
    .select("*, author:user_profiles(*)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as UserRequest[];

  if (requests.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay peticiones.</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <Card key={r.id} className={r.status === "done" ? "opacity-60" : undefined}>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge>{CATEGORY_LABEL[r.category]}</Badge>
                <span className="text-sm font-medium truncate">{r.author?.display_name ?? "Estudiante"}</span>
              </div>
              <span className="text-xs font-mono text-muted-light shrink-0">
                {new Date(r.created_at).toLocaleDateString("es-ES")}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{r.message}</p>
            <RequestReplyForm requestId={r.id} initialReply={r.admin_reply} isDone={r.status === "done"} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
