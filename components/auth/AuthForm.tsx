"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (fullName.trim().split(/\s+/).length < 2) {
          throw new Error("Introduce tu nombre y apellidos");
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          await supabase.rpc("seed_edem_subjects", { p_user_id: data.user!.id });
          router.push("/dashboard");
          router.refresh();
        } else {
          setCheckEmail(true);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (checkEmail) {
    return (
      <div className="text-center space-y-2">
        <p className="text-foreground font-medium">Revisa tu correo</p>
        <p className="text-sm text-muted">
          Te hemos enviado un enlace de confirmación a {email}. Ábrelo para activar tu cuenta.
        </p>
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div className="space-y-3">
        <Button className="w-full" size="lg" onClick={handleGoogle} type="button">
          <span className="font-heading font-semibold">G</span> Continuar con Google
        </Button>
        <Button variant="outline" className="w-full" size="lg" onClick={() => setStep("form")} type="button">
          <Mail size={16} /> Continuar con email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => setStep("choose")}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
        type="button"
      >
        <ArrowLeft size={14} /> Atrás
      </button>

      <div className="flex rounded-xl bg-surface-hover p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors cursor-pointer ${
              mode === m ? "bg-surface shadow-sm text-foreground" : "text-muted"
            }`}
          >
            {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <Input
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </Button>
      </form>
    </div>
  );
}
