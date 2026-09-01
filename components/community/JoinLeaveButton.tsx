"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinLeaveButton({ communityId, isMember }: { communityId: string; isMember: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch(`/api/community/${isMember ? "leave" : "join"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={isMember ? "outline" : "primary"} size="sm" onClick={handleClick} loading={loading}>
      {isMember ? "Salir" : "Unirme"}
    </Button>
  );
}
