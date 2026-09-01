"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-surface-hover text-muted transition-colors cursor-pointer"
    >
      <Sun size={18} className="dark:hidden" />
      <Moon size={18} className="hidden dark:inline" />
    </button>
  );
}
