import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authById = new Map<string, { email: string | undefined; created_at: string }>();
  let page = 1;
  while (true) {
    const { data: page_data, error: authError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (authError) break;
    for (const u of page_data.users) authById.set(u.id, { email: u.email, created_at: u.created_at });
    if (page_data.users.length < 1000) break;
    page++;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Usuarios");
  sheet.columns = [
    { header: "Nombre", key: "display_name", width: 24 },
    { header: "Usuario", key: "username", width: 20 },
    { header: "Email", key: "email", width: 32 },
    { header: "Universidad", key: "university", width: 20 },
    { header: "Carrera", key: "degree", width: 20 },
    { header: "Fecha de registro", key: "created_at", width: 20 },
    { header: "Reputación", key: "reputation_score", width: 12 },
    { header: "Verificado", key: "is_verified", width: 12 },
    { header: "Silenciado", key: "is_muted", width: 12 },
    { header: "Baneado", key: "is_banned", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const p of profiles ?? []) {
    const auth = authById.get(p.id);
    sheet.addRow({
      display_name: p.display_name,
      username: p.username,
      email: auth?.email ?? "",
      university: p.university ?? "",
      degree: p.degree ?? "",
      created_at: new Date(p.created_at).toLocaleString("es-ES"),
      reputation_score: p.reputation_score,
      is_verified: p.is_verified ? "Sí" : "No",
      is_muted: p.is_muted ? "Sí" : "No",
      is_banned: p.is_banned ? "Sí" : "No",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="usuarios-mi-edem-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
