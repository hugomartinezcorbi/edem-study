import { createClient } from "@/lib/supabase/server";
import { getRecentMessages } from "@/lib/queries/chat";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { UserProfile } from "@/lib/types";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const { channel } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  const ownDegree: "ADE" | "IGE" = profile?.degree === "IGE" ? "IGE" : "ADE";
  const isMixed = channel === "mixed";
  const degree = isMixed ? null : ownDegree;

  const messages = await getRecentMessages(supabase, degree);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold">Chat</h1>
        <p className="text-sm text-muted">Habla con tus compañeros y comparte archivos.</p>
      </div>

      <div className="flex rounded-xl bg-surface-hover p-1 max-w-xs">
        <Link
          href="/chat"
          className={`flex-1 text-center rounded-lg py-2 text-sm font-medium transition-colors ${
            !isMixed ? "bg-surface shadow-sm text-foreground" : "text-muted"
          }`}
        >
          {ownDegree}
        </Link>
        <Link
          href="/chat?channel=mixed"
          className={`flex-1 text-center rounded-lg py-2 text-sm font-medium transition-colors ${
            isMixed ? "bg-surface shadow-sm text-foreground" : "text-muted"
          }`}
        >
          Mixto
        </Link>
      </div>

      <ChatWindow key={degree ?? "mixed"} degree={degree} initialMessages={messages} currentUser={profile as UserProfile} />
    </div>
  );
}
