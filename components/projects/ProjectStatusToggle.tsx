"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProjectStatusToggle({ projectId, status }: { projectId: string; status: "open" | "closed" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch("/api/projects/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" loading={loading} onClick={toggle}>
      {status === "open" ? "Cerrar proyecto" : "Reabrir proyecto"}
    </Button>
  );
}
