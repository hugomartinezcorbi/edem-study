import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EdemLogo } from "@/components/ui/EdemLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Estudiante";

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <EdemLogo size="sm" showTagline={false} />
            <span className="text-sm text-muted hidden sm:inline">Study</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-muted mr-1">{name}</span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
