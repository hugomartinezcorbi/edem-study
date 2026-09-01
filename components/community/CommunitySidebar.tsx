"use client";

import { cn } from "@/lib/utils";
import type { JoinedCommunity } from "@/lib/queries/community";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass } from "lucide-react";

export function CommunitySidebar({ communities }: { communities: JoinedCommunity[] }) {
  const pathname = usePathname();
  const activeId = pathname.match(/\/community\/([^/]+)/)?.[1];
  const insideCommunity = !!activeId;

  return (
    <aside className={cn("w-full lg:w-64 lg:shrink-0 border-r border-border lg:pr-4", insideCommunity && "hidden lg:block")}>
      <div className="space-y-1">
        <Link
          href="/community"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            !activeId ? "bg-accent text-accent-foreground" : "hover:bg-surface-hover text-muted"
          )}
        >
          <Compass size={16} /> Explorar
        </Link>

        {communities.length > 0 && <p className="label-mono px-3 pt-4 pb-1">Mis comunidades</p>}

        {communities.map((c) => (
          <Link
            key={c.id}
            href={`/community/${c.id}`}
            className={cn(
              "block px-3 py-2 rounded-lg text-sm truncate transition-colors",
              activeId === c.id ? "bg-accent text-accent-foreground font-medium" : "hover:bg-surface-hover"
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>
    </aside>
  );
}
