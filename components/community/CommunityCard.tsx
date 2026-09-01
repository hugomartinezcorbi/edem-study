"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import type { CommunitySubject } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users } from "lucide-react";

export function CommunityCard({ community, isMember }: { community: CommunitySubject; isMember: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setLoading(true);
    try {
      await fetch("/api/community/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: community.id }),
      });
      router.push(`/community/${community.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardBody className="flex-1 flex flex-col gap-2">
        <p className="font-semibold leading-snug">{community.name}</p>
        {(community.university || community.degree) && (
          <p className="text-xs text-muted-light font-mono uppercase">
            {[community.university, community.degree].filter(Boolean).join(" · ")}
          </p>
        )}
        {community.description && <p className="text-sm text-muted line-clamp-2">{community.description}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted">
            <Users size={12} /> {community.member_count}
          </span>
          {isMember ? (
            <Button size="sm" variant="outline" onClick={() => router.push(`/community/${community.id}`)}>
              Ver
            </Button>
          ) : (
            <Button size="sm" onClick={handleJoin} loading={loading}>
              Unirme
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
