"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommunityActionButtons({ communityId, isArchived }: { communityId: string; isArchived: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: string) {
    if (action === "delete" && !confirm("¿Eliminar esta comunidad y todo su contenido?")) return;
    setLoading(action);
    try {
      await fetch(`/api/admin/communities/${communityId}/action`, {
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
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" onClick={() => act(isArchived ? "unarchive" : "archive")} loading={loading === "archive" || loading === "unarchive"}>
        {isArchived ? "Desarchivar" : "Archivar"}
      </Button>
      <Button size="sm" variant="danger" onClick={() => act("delete")} loading={loading === "delete"}>
        Eliminar
      </Button>
    </div>
  );
}
