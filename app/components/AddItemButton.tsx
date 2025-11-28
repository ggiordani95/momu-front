"use client";

import { Plus } from "lucide-react";

interface AddItemButtonProps {
  onClick: () => void;
  label?: string;
  variant?: "default" | "inline";
}

export default function AddItemButton({
  onClick,
  label = "Adicionar Item",
  variant = "default",
}: AddItemButtonProps) {
  if (variant === "inline") {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border-2 border-dashed rounded-lg transition-colors hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/10"
        style={{ borderColor: "var(--border-color)" }}
      >
        <Plus size={16} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
    >
      <Plus size={16} />
      <span>{label}</span>
    </button>
  );
}
