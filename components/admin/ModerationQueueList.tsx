"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import type { ModerationQueueItem } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  chat_message: "Mensaje de chat",
  post: "Publicación",
  comment: "Comentario",
  shared_note: "Apuntes compartidos",
  project: "Proyecto",
  project_application: "Solicitud de proyecto",
};

export function ModerationQueueList({ items }: { items: ModerationQueueItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  async function decide(queueId: string, decision: "approved" | "rejected") {
    setLoading(queueId);
    try {
      await fetch("/api/admin/moderation/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, decision }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function bulk(decision: "approved" | "rejected") {
    await fetch("/api/admin/moderation/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueIds: selected, decision }),
    });
    setSelected([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{items.length} pendientes de revisión</p>
        {selected.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulk("approved")}>
              Aprobar {selected.length}
            </Button>
            <Button size="sm" variant="danger" onClick={() => bulk("rejected")}>
              Rechazar {selected.length}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted text-center py-12">No hay nada pendiente de revisión. 🎉</p>}
        {items.map((item) => (
          <Card key={item.id}>
            <CardBody className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge>{TYPE_LABEL[item.content_type]}</Badge>
                      <span className="text-xs text-muted">{item.author?.display_name}</span>
                      <span className="text-xs text-muted-light font-mono">
                        score {item.ai_score?.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{item.content_preview}</p>
                    {item.ai_reason && <p className="text-xs text-muted mt-1 italic">{item.ai_reason}</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pl-6">
                <Button size="sm" onClick={() => decide(item.id, "approved")} loading={loading === item.id}>
                  <Check size={14} /> Aprobar
                </Button>
                <Button size="sm" variant="danger" onClick={() => decide(item.id, "rejected")} loading={loading === item.id}>
                  <X size={14} /> Rechazar
                </Button>
                {item.community_subject_id && (
                  <Link href={`/community/${item.community_subject_id}`} target="_blank">
                    <Button size="sm" variant="ghost">
                      <ExternalLink size={14} /> Ver en contexto
                    </Button>
                  </Link>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
