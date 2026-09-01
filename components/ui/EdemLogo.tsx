import { cn } from "@/lib/utils";

const widths = { sm: 110, md: 170, lg: 280 };

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
  const width = widths[size];
  const light = variant === "light";
  const src = showTagline
    ? light
      ? "/edem-logo-light.svg"
      : "/edem-logo.svg"
    : light
      ? "/edem-mark-light.svg"
      : "/edem-mark.svg";
  const aspectRatio = showTagline ? 460 / 150 : 460 / 90;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="MI EDEM"
      width={width}
      height={Math.round(width / aspectRatio)}
      className={cn("block", className)}
    />
  );
}
