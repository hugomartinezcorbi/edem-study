"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Star } from "lucide-react";

export function RatingStars({
  value,
  onChange,
  size = 16,
  readOnly = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={cn(!readOnly && "cursor-pointer")}
        >
          <Star
            size={size}
            className={n <= display ? "text-warning fill-warning" : "text-border fill-border"}
          />
        </button>
      ))}
    </div>
  );
}
