"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function VoteButton({
  postId,
  upvotes,
  downvotes,
  myVote,
}: {
  postId: string;
  upvotes: number;
  downvotes: number;
  myVote: "up" | "down" | null;
}) {
  const [score, setScore] = useState(upvotes - downvotes);
  const [vote, setVote] = useState(myVote);
  const [loading, setLoading] = useState(false);

  async function handleVote(type: "up" | "down") {
    if (loading) return;
    setLoading(true);
    const prevVote = vote;
    const nextVote = prevVote === type ? null : type;
    const delta = (nextVote === "up" ? 1 : nextVote === "down" ? -1 : 0) - (prevVote === "up" ? 1 : prevVote === "down" ? -1 : 0);
    setVote(nextVote);
    setScore((s) => s + delta);
    try {
      await fetch("/api/forum/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, voteType: type }),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5 text-muted" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => handleVote("up")}
        className={cn("cursor-pointer hover:text-accent transition-colors", vote === "up" && "text-accent")}
      >
        <ChevronUp size={20} />
      </button>
      <span className="text-sm font-heading font-bold">{score}</span>
      <button
        onClick={() => handleVote("down")}
        className={cn("cursor-pointer hover:text-danger transition-colors", vote === "down" && "text-danger")}
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
}
