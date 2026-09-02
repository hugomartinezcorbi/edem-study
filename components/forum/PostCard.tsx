import { Card, CardBody } from "@/components/ui/Card";
import { VoteButton } from "@/components/forum/VoteButton";
import type { Post, PostType } from "@/lib/types";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

const TYPE_STYLE: Record<PostType, { label: string; bg: string; text: string }> = {
  apuntes: { label: "Apuntes", bg: "var(--color-volver-bg)", text: "var(--color-volver-text)" },
  pregunta: { label: "Pregunta", bg: "var(--color-explicar-bg)", text: "var(--color-explicar-text)" },
  recurso: { label: "Recurso", bg: "var(--color-estudiar-bg)", text: "var(--color-estudiar-text)" },
  discusion: { label: "Discusión", bg: "var(--color-fallar-bg)", text: "var(--color-fallar-text)" },
};

export function PostCard({ post, communityId }: { post: Post; communityId: string }) {
  const style = TYPE_STYLE[post.post_type];
  return (
    <Link href={`/community/${communityId}/forum/${post.id}`}>
      <Card className="hover:bg-surface-hover transition-colors">
        <CardBody className="flex gap-4">
          <VoteButton postId={post.id} upvotes={post.upvotes} downvotes={post.downvotes} myVote={post.my_vote ?? null} />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium rounded-full px-2 py-0.5"
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {style.label}
              </span>
              {post.moderation_status === "pending" && (
                <span className="text-xs text-warning">Pendiente de aprobación</span>
              )}
              {post.is_pinned && <span className="text-xs text-muted">📌 Fijado</span>}
            </div>
            <p className="font-semibold leading-snug">{post.title}</p>
            <p className="text-sm text-muted line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-3 text-xs text-muted pt-1">
              <span>{post.author?.display_name}</span>
              <span className="font-mono text-muted-light">
                {new Date(post.created_at).toLocaleDateString("es-ES")}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={12} /> {post.comment_count}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
