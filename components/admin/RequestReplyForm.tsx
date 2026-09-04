"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RequestReplyForm({
  requestId,
  initialReply,
  isDone,
}: {
  requestId: string;
  initialReply: string | null;
  isDone: boolean;
}) {
  const router = useRouter();
  const [reply, setReply] = useState(initialReply ?? "");
  const [loading, setLoading] = useState(false);

  async function send(done: boolean) {
    setLoading(true);
    try {
      await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, reply, done }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 pt-1">
      <Textarea
        rows={2}
        placeholder="Responder (le llega como notificación)…"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" loading={loading} onClick={() => send(isDone)} disabled={!reply.trim()}>
          Responder
        </Button>
        <Button size="sm" variant="outline" loading={loading} onClick={() => send(!isDone)}>
          {isDone ? "Reabrir" : "Marcar resuelta"}
        </Button>
      </div>
    </div>
  );
}
