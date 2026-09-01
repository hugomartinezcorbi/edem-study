import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const displayName = formData.get("displayName") as string | null;
  const bio = (formData.get("bio") as string | null) ?? null;
  const university = (formData.get("university") as string | null) ?? null;
  const degree = (formData.get("degree") as string | null) ?? null;
  const yearRaw = formData.get("year") as string | null;
  const year = yearRaw ? parseInt(yearRaw, 10) : null;
  const avatarFile = formData.get("avatar") as File | null;

  const update: Record<string, unknown> = {
    display_name: displayName,
    bio,
    university,
    degree,
    year,
  };

  if (avatarFile && avatarFile.size > 0) {
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    const path = `${user.id}/${crypto.randomUUID()}-${avatarFile.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, buffer, {
      contentType: avatarFile.type || "image/jpeg",
      upsert: true,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    update.avatar_url = publicUrl.publicUrl;
  }

  const { data, error } = await supabase.from("user_profiles").update(update).eq("id", user.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profile: data });
}
