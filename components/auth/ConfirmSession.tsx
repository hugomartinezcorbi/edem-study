"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Supabase's own email-confirmation link for this project redirects with the
 * session tokens in the URL *fragment* (`#access_token=...&refresh_token=...`)
 * rather than a `?code=` param — a server route can never see a fragment (it's
 * never sent in the HTTP request), so this has to run client-side. Mounted on
 * the landing page; no-ops immediately if there's no such fragment.
 */
export function ConfirmSession() {
  const router = useRouter();

  useEffect(() => {
    if (!window.location.hash.includes("access_token")) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error || !data.user) return;
      const degree = data.user.user_metadata?.degree;
      await supabase.rpc(degree === "IGE" ? "seed_ige_subjects" : "seed_edem_subjects", {
        p_user_id: data.user.id,
      });
      window.history.replaceState(null, "", window.location.pathname);
      router.push("/dashboard");
      router.refresh();
    })();
  }, [router]);

  return null;
}
