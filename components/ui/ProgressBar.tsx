import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  color,
  trackClassName,
}: {
  value: number; // 0-1
  className?: string;
  color?: string;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("h-2 w-full rounded-full bg-surface-hover overflow-hidden", trackClassName, className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color ?? "var(--color-accent)" }}
      />
    </div>
  );
}
