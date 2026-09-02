"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DecideButtons({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accepted" | "rejected" | null>(null);

  async function decide(decision: "accepted" | "rejected") {
    setLoading(decision);
    try {
      await fetch("/api/projects/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, decision }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" loading={loading === "rejected"} onClick={() => decide("rejected")}>
        Rechazar
      </Button>
      <Button size="sm" loading={loading === "accepted"} onClick={() => decide("accepted")}>
        Aceptar
      </Button>
    </div>
  );
}
