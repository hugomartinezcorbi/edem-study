"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import type { PostComment } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronUp, Reply } from "lucide-react";

function CommentItem({ comment, postId, depth }: { comment: PostComment; postId: string; depth: number }) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [voted, setVoted] = useState(false);

  async function handleReply() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/forum/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: text, replyToId: comment.id }),
      });
      if (res.ok) {
        setText("");
        setReplying(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpvote() {
    if (voted) return;
    setVoted(true);
    setUpvotes((v) => v + 1);
    await fetch("/api/forum/comment-upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id }),
    });
  }

  return (
    <div className={depth > 0 ? "pl-6 border-l border-border" : ""}>
      <div className="py-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">{comment.author?.display_name}</span>
          {comment.author?.degree && (
            <span className="text-muted-light font-mono uppercase">{comment.author.degree}</span>
          )}
          <span className="text-muted-light font-mono">{new Date(comment.created_at).toLocaleDateString("es-ES")}</span>
          {comment.moderation_status === "pending" && <span className="text-warning">Pendiente</span>}
        </div>
        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <button onClick={handleUpvote} className={`flex items-center gap-1 cursor-pointer ${voted ? "text-accent" : "hover:text-foreground"}`}>
            <ChevronUp size={13} /> {upvotes}
          </button>
          {depth === 0 && (
            <button onClick={() => setReplying((v) => !v)} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
              <Reply size={13} /> Responder
            </button>
          )}
        </div>
        {replying && (
          <div className="flex gap-2 pt-1">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe una respuesta…" />
            <Button size="sm" onClick={handleReply} loading={loading}>
              Enviar
            </Button>
          </div>
        )}
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
      ))}
    </div>
  );
}

export function CommentThread({ postId, comments }: { postId: string; comments: PostComment[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/forum/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: text }),
      });
      if (res.ok) {
        setText("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un comentario…" />
        <Button onClick={handleSubmit} loading={loading}>
          Enviar
        </Button>
      </div>
      <div className="divide-y divide-border">
        {comments.length === 0 && <p className="text-sm text-muted py-6 text-center">Sé el primero en comentar.</p>}
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} postId={postId} depth={0} />
        ))}
      </div>
    </div>
  );
}
