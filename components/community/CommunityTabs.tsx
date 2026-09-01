"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, MessagesSquare } from "lucide-react";

export function CommunityTabs({ communityId }: { communityId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/community/${communityId}/chat`, label: "Chat", icon: MessageCircle },
    { href: `/community/${communityId}/forum`, label: "Foro", icon: MessagesSquare },
    { href: `/community/${communityId}/notes`, label: "Apuntes", icon: BookOpen },
  ];

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
            )}
          >
            <Icon size={15} /> {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
