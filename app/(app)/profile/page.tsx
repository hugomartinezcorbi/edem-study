import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/queries/profile";
import { redirect } from "next/navigation";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { EditProfileButton } from "@/components/profile/EditProfileButton";
import { NoteCard } from "@/components/shared-notes/NoteCard";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const data = await getProfileById(supabase, user.id);
  if (!data) redirect("/dashboard");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Mi perfil</h1>
        <EditProfileButton profile={data.profile} />
      </div>

      <ProfileCard data={data} isOwn />

      {data.topNotes.length > 0 && (
        <section className="space-y-3">
          <h2 className="label-mono">Mis apuntes mejor valorados</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.topNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
