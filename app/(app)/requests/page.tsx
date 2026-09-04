import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RequestForm } from "@/components/requests/RequestForm";
import type { UserRequest } from "@/lib/types";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";

const CATEGORY_LABEL: Record<UserRequest["category"], string> = {
  sugerencia: "Sugerencia",
  error: "Algo no funciona",
  ayuda: "Necesito ayuda",
  otro: "Otro",
};

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-1">
        <p className="label-mono">Peticiones</p>
        <h1 className="text-2xl font-heading font-bold">¿Qué le falta a MI EDEM?</h1>
        <p className="text-sm text-muted">
          Todo lo que escribas aquí me llega directamente. Sugerencias, fallos o dudas.
        </p>
      </div>

      <Card>
        <CardBody>
          <RequestForm />
        </CardBody>
      </Card>

      {(requests ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Tus peticiones</h2>
          {(requests as UserRequest[]).map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge>{CATEGORY_LABEL[r.category]}</Badge>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {r.status === "done" ? (
                      <>
                        <CheckCircle2 size={13} className="text-success" /> Resuelta
                      </>
                    ) : (
                      <>
                        <Clock size={13} /> Pendiente
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                {r.admin_reply && (
                  <div className="rounded-xl bg-surface-hover px-3.5 py-2.5 space-y-1">
                    <p className="label-mono text-accent">Respuesta</p>
                    <p className="text-sm whitespace-pre-wrap">{r.admin_reply}</p>
                  </div>
                )}
                <p className="text-xs font-mono text-muted-light">
                  {new Date(r.created_at).toLocaleDateString("es-ES")}
                </p>
              </CardBody>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
