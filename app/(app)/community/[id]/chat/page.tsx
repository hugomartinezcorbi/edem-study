import { createClient } from "@/lib/supabase/server";
import { getRecentMessages } from "@/lib/queries/chat";
import { getCommunity, getMembership } from "@/lib/queries/community";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { notFound, redirect } from "next/navigation";
import type { UserProfile } from "@/lib/types";

export default async function CommunityChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [community, membership, messages, { data: profile }] = await Promise.all([
    getCommunity(supabase, id),
    getMembership(supabase, id, user.id),
    getRecentMessages(supabase, id),
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
  ]);
  if (!community) notFound();

  return (
    <ChatWindow
      communityId={id}
      communityName={community.name}
      initialMessages={messages}
      currentUser={profile as UserProfile}
      isMember={!!membership}
      isModerator={membership?.role === "admin" || membership?.role === "moderator"}
    />
  );
}
