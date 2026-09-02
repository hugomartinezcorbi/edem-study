import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EdemLogo } from "@/components/ui/EdemLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/queries/notifications";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Users, Rocket } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  await supabase.rpc("ensure_own_profile");
  const unreadCount = await getUnreadCount(supabase, user.id);

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Estudiante";

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <EdemLogo size="sm" showTagline={false} />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/community" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                <Users size={15} /> Comunidad
              </Link>
              <Link href="/projects" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                <Rocket size={15} /> Proyectos
              </Link>
              <Link href="/generate-pdf" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                <FileText size={15} /> Generar PDF
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/profile" className="hidden sm:inline font-mono text-xs text-muted-light mr-1 hover:text-foreground transition-colors">
              {name}
            </Link>
            <NotificationBell userId={user.id} initialUnreadCount={unreadCount} />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-1 px-5 pb-2 -mt-1">
          <Link href="/community" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
            <Users size={13} /> Comunidad
          </Link>
          <Link href="/projects" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
            <Rocket size={13} /> Proyectos
          </Link>
          <Link href="/generate-pdf" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
            <FileText size={13} /> Generar PDF
          </Link>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
