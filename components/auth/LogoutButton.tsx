"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Cerrar sesión"
      className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-surface-hover text-muted transition-colors cursor-pointer"
    >
      <LogOut size={18} />
    </button>
  );
}
