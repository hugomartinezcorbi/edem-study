"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserActionButtons({ userId, isBanned, isMuted }: { userId: string; isBanned: boolean; isMuted: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: string) {
    if (action === "delete" && !confirm("¿Eliminar esta cuenta permanentemente?")) return;
    setLoading(action);
    try {
      await fetch(`/api/admin/users/${userId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      <Button size="sm" variant="outline" onClick={() => act(isMuted ? "unmute" : "mute")} loading={loading === "mute" || loading === "unmute"}>
        {isMuted ? "Quitar silencio" : "Silenciar"}
      </Button>
      <Button size="sm" variant={isBanned ? "outline" : "danger"} onClick={() => act(isBanned ? "unban" : "ban")} loading={loading === "ban" || loading === "unban"}>
        {isBanned ? "Quitar ban" : "Banear"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => act("delete")} loading={loading === "delete"}>
        Eliminar cuenta
      </Button>
    </div>
  );
}
