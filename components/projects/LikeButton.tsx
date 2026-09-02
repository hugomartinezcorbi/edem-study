"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Heart } from "lucide-react";

export function LikeButton({
  applicationId,
  initialLikes,
  initialLiked,
  disabled,
}: {
  applicationId: string;
  initialLikes: number;
  initialLiked: boolean;
  disabled?: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading || disabled) return;
    setLoading(true);
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await fetch("/api/projects/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
        disabled ? "text-muted-light cursor-not-allowed" : "cursor-pointer hover:text-accent",
        liked && "text-accent"
      )}
    >
      <Heart size={15} fill={liked ? "currentColor" : "none"} />
      {likes}
    </button>
  );
}
