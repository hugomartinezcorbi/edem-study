import { createClient } from "@/lib/supabase/server";
import { getRecentMessages } from "@/lib/queries/chat";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { redirect } from "next/navigation";
import type { UserProfile } from "@/lib/types";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [messages, { data: profile }] = await Promise.all([
    getRecentMessages(supabase),
    supabase.from("user_profiles").select("*").eq("id", user.id).single(),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold">Chat</h1>
        <p className="text-sm text-muted">Habla con todo EDEM en un mismo sitio y comparte archivos.</p>
      </div>
      <ChatWindow initialMessages={messages} currentUser={profile as UserProfile} />
    </div>
  );
}
