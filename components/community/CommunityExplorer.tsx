"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CommunityCard } from "@/components/community/CommunityCard";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";
import type { CommunitySubject } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

export function CommunityExplorer({
  initialCommunities,
  joinedIds,
  initialQuery,
}: {
  initialCommunities: CommunitySubject[];
  joinedIds: string[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [showCreate, setShowCreate] = useState(false);
  const joined = new Set(joinedIds);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      router.push(`/community${params.toString() ? `?${params}` : ""}`);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">Comunidades</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Crear comunidad
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por asignatura…"
          className="pl-9"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialCommunities.map((c) => (
          <CommunityCard key={c.id} community={c} isMember={joined.has(c.id)} />
        ))}
        {initialCommunities.length === 0 && (
          <p className="text-sm text-muted col-span-full text-center py-12">
            No hay comunidades todavía — crea la primera.
          </p>
        )}
      </div>

      {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
