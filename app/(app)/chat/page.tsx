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

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  const degree: "ADE" | "IGE" = profile?.degree === "IGE" ? "IGE" : "ADE";

  const messages = await getRecentMessages(supabase, degree);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold">Chat {degree}</h1>
        <p className="text-sm text-muted">Habla con tus compañeros de {degree} y comparte archivos.</p>
      </div>
      <ChatWindow degree={degree} initialMessages={messages} currentUser={profile as UserProfile} />
    </div>
  );
}
