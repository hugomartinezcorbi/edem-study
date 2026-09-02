import { createClient } from "@/lib/supabase/server";
import { isAdminId } from "@/lib/admin";
import { redirect } from "next/navigation";
import { AdminNavLink } from "@/components/admin/AdminNavLink";

const TABS = [
  { href: "/admin", label: "Estadísticas" },
  { href: "/admin/queue", label: "Cola de moderación" },
  { href: "/admin/history", label: "Historial" },
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/communities", label: "Comunidades" },
  { href: "/admin/rules", label: "Reglas" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminId(user.id)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <p className="label-mono">Panel de administración</p>
        <h1 className="text-2xl font-heading font-bold">Admin</h1>
      </div>
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <AdminNavLink key={tab.href} href={tab.href} label={tab.label} />
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}
