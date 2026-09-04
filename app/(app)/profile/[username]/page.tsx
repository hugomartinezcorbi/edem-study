import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/queries/profile";
import { notFound, redirect } from "next/navigation";
import { ProfileCard } from "@/components/profile/ProfileCard";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const data = await getProfileByUsername(supabase, username);
  if (!data) notFound();
  if (data.profile.id === user.id) redirect("/profile");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold">{data.profile.display_name}</h1>

      <ProfileCard data={data} isOwn={false} />
    </div>
  );
}
