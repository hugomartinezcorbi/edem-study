import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("chat-files").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: signed } = await supabase.storage.from("chat-files").createSignedUrl(path, 60 * 60 * 24 * 7);

  return NextResponse.json({
    fileUrl: signed?.signedUrl ?? path,
    fileName: file.name,
    messageType: file.type.startsWith("image/") ? "image" : "file",
  });
}
