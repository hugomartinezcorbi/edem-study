"use client";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { UserProfile } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { X } from "lucide-react";

export function EditProfileModal({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [university, setUniversity] = useState(profile.university ?? "EDEM");
  const [degree, setDegree] = useState(profile.degree ?? "ADE");
  const [year, setYear] = useState(profile.year?.toString() ?? "1");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("displayName", displayName);
      formData.append("bio", bio);
      formData.append("university", university);
      formData.append("degree", degree);
      formData.append("year", year);
      if (fileRef.current?.files?.[0]) formData.append("avatar", fileRef.current.files[0]);

      const res = await fetch("/api/profile/update", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al guardar el perfil");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold">Editar perfil</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-surface-hover overflow-hidden flex items-center justify-center shrink-0">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-heading font-bold">{displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAvatarPreview(URL.createObjectURL(file));
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Cambiar foto
            </Button>
          </div>

          <Input placeholder="Nombre" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <Textarea placeholder="Bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Universidad" value={university} onChange={(e) => setUniversity(e.target.value)} />
            <Input placeholder="Carrera" value={degree} onChange={(e) => setDegree(e.target.value)} />
          </div>
          <Input type="number" placeholder="Curso" min={1} max={6} value={year} onChange={(e) => setYear(e.target.value)} />

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Guardar
          </Button>
        </form>
      </div>
    </div>
  );
}
