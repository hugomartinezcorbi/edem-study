import { cn } from "@/lib/utils";

export function EdemLogo({
  className,
  variant = "default",
  showTagline = true,
  size = "md",
}: {
  className?: string;
  variant?: "default" | "light";
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const wordmarkSize = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" }[size];
  const taglineSize = { sm: "text-[9px]", md: "text-[11px]", lg: "text-sm" }[size];

  return (
    <div className={cn("flex flex-col leading-none select-none", className)}>
      <span
        className={cn("font-bold", wordmarkSize)}
        style={{
          fontFamily: 'Georgia, "Times New Roman", Times, serif',
          letterSpacing: "0.16em",
          color: variant === "light" ? "#ffffff" : "var(--color-edem-teal)",
        }}
      >
        EDEM
      </span>
      {showTagline && (
        <span
          className={cn("uppercase mt-1", taglineSize)}
          style={{
            letterSpacing: "0.08em",
            color: variant === "light" ? "rgba(255,255,255,0.75)" : "var(--muted)",
          }}
        >
          Escuela de Empresarios
        </span>
      )}
    </div>
  );
}
