import { createClient } from "@/lib/supabase/server";
import { extractText, inferFileType } from "@/lib/document-processor";
import { moderateAndLog } from "@/lib/moderation";
import { notify } from "@/lib/notifications";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const communityId = formData.get("communityId") as string | null;
  const title = formData.get("title") as string | null;
  const description = (formData.get("description") as string | null) ?? null;
  const tagsRaw = (formData.get("tags") as string | null) ?? "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);

  if (!file || !communityId || !title?.trim()) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_subject_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Únete a la comunidad para subir apuntes" }, { status: 403 });

  const fileType = inferFileType(file.name, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("shared-notes").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  let extractedText: string | null = null;
  try {
    extractedText = fileType === "other" ? null : await extractText(buffer, fileType);
  } catch {
    extractedText = null;
  }

  const { data: community } = await supabase.from("community_subjects").select("name").eq("id", communityId).single();
  const { visible, aiDecision } = await moderateAndLog(supabase, {
    contentType: "shared_note",
    contentId: crypto.randomUUID(),
    userId: user.id,
    communitySubjectId: communityId,
    content: `${title}\n${description ?? ""}\n${(extractedText ?? "").slice(0, 2000)}`,
    communityName: community?.name ?? "",
  });
  const moderationStatus = aiDecision === "auto_rejected" ? "rejected" : visible ? "approved" : "pending";

  const { data: note, error } = await supabase
    .from("shared_notes")
    .insert({
      user_id: user.id,
      community_subject_id: communityId,
      title: title.trim(),
      description,
      file_url: path,
      extracted_text: extractedText,
      tags,
      moderation_status: moderationStatus,
      is_approved: moderationStatus === "approved",
    })
    .select("*, author:user_profiles(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (moderationStatus === "approved") {
    const { data: members } = await supabase
      .from("community_memberships")
      .select("user_id")
      .eq("community_subject_id", communityId)
      .neq("user_id", user.id)
      .limit(100);
    for (const m of members ?? []) {
      await notify(supabase, {
        userId: m.user_id,
        type: "new_notes",
        title: `Nuevos apuntes en ${community?.name}`,
        body: title,
        link: `/community/${communityId}/notes/${note.id}`,
      });
    }
  }

  return NextResponse.json({ note, moderationStatus });
}
