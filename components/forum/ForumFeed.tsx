"use client";

import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/forum/PostCard";
import { CreatePostModal } from "@/components/forum/CreatePostModal";
import type { Post } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

const SORTS = [
  { value: "recent", label: "Recientes" },
  { value: "top", label: "Más votados" },
  { value: "comments", label: "Más comentados" },
];

const TYPES = [
  { value: "", label: "Todos" },
  { value: "discusion", label: "Discusión" },
  { value: "pregunta", label: "Pregunta" },
  { value: "recurso", label: "Recurso" },
  { value: "apuntes", label: "Apuntes" },
];

export function ForumFeed({
  communityId,
  posts,
  isMember,
  currentSort,
  currentType,
}: {
  communityId: string;
  posts: Post[];
  isMember: boolean;
  currentSort: string;
  currentType: string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  function updateParams(next: { sort?: string; type?: string }) {
    const params = new URLSearchParams();
    const sort = next.sort ?? currentSort;
    const type = next.type ?? currentType;
    if (sort && sort !== "recent") params.set("sort", sort);
    if (type) params.set("type", type);
    router.push(`/community/${communityId}/forum${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateParams({ sort: s.value })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                currentSort === s.value || (!currentSort && s.value === "recent")
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-hover text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => updateParams({ type: t.value })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                currentType === t.value ? "bg-accent text-accent-foreground" : "bg-surface-hover text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {isMember && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Publicar
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} communityId={communityId} />
        ))}
        {posts.length === 0 && <p className="text-sm text-muted text-center py-12">Todavía no hay publicaciones.</p>}
      </div>

      {showCreate && <CreatePostModal communityId={communityId} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
