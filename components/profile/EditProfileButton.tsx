"use client";

import { Button } from "@/components/ui/Button";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import type { UserProfile } from "@/lib/types";
import { useState } from "react";
import { Pencil } from "lucide-react";

export function EditProfileButton({ profile }: { profile: UserProfile }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil size={14} /> Editar perfil
      </Button>
      {open && <EditProfileModal profile={profile} onClose={() => setOpen(false)} />}
    </>
  );
}
