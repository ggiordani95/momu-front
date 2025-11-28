"use client";

import { FolderTree, Settings, Trash2 } from "lucide-react";
import Image from "next/image";

interface SimpleSidebarProps {
  onNavigate: (view: "explorer" | "settings" | "trash") => void;
  currentView: "explorer" | "settings" | "trash";
}

export default function SimpleSidebar({
  onNavigate,
  currentView,
}: SimpleSidebarProps) {
  return (
    <aside
      className="w-64 bg-[#0b0b0b] shrink-0 border-r flex flex-col relative z-10"
      style={{
        borderColor: "var(--border-color)",
      }}
    >
      <div
        className="flex items-center"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-center">
          <Image
            src="/momu.png"
            alt="MOMU"
            width={70}
            height={60}
            className="h-18 object-contain"
            priority
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <button
            onClick={() => onNavigate("explorer")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              currentView === "explorer"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <FolderTree size={18} />
            Meu explorador
          </button>

          <button
            onClick={() => onNavigate("trash")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              currentView === "trash"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Trash2 size={18} />
            Lixeira
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              currentView === "settings"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Settings size={18} />
            Configurações
          </button>
        </div>
      </nav>
    </aside>
  );
}
