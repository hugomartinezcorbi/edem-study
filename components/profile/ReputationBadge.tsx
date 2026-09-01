import { getBadgeForScore } from "@/lib/reputation";
import { Sparkles } from "lucide-react";

export function ReputationBadge({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  const badge = getBadgeForScore(score);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="font-heading font-bold">{score}</span>
      <span className="text-muted">pts</span>
      {badge && showLabel && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `color-mix(in srgb, ${badge.color} 15%, transparent)`, color: badge.color }}
        >
          <Sparkles size={11} /> {badge.label}
        </span>
      )}
    </span>
  );
}
