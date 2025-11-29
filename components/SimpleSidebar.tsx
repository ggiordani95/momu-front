"use client";

import { useState } from "react";
import { FolderTree, Settings, Trash2, Share2, Calendar } from "lucide-react";
import Image from "next/image";
import ContextMenu from "./editors/ContextMenu";
import { useTrashItems } from "@/lib/hooks/querys/useTrash";
import { usePermanentDeleteItem } from "@/lib/hooks/querys/useItems";

interface SimpleSidebarProps {
  onNavigate: (view: "explorer" | "settings" | "trash" | "social" | "planner") => void;
  currentView: "explorer" | "settings" | "trash" | "social" | "planner";
  workspaceId: string;
  hasSynced?: boolean;
}

export default function SimpleSidebar({
  onNavigate,
  currentView,
  workspaceId,
  hasSynced,
}: SimpleSidebarProps) {
  const [trashContextMenu, setTrashContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // React Query hooks
  const { data: trashItems = [] } = useTrashItems(workspaceId, {
    enabled: hasSynced !== false,
  });
  const permanentDeleteMutation = usePermanentDeleteItem(workspaceId);

  const handleTrashContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTrashContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDeleteAll = async () => {
    if (trashItems.length === 0) return;

    try {
      // Excluir todos os itens sem confirmação
      await Promise.all(
        trashItems.map((item) => permanentDeleteMutation.mutateAsync(item.id))
      );
    } catch (error) {
      console.error("Error deleting all items:", error);
    }
  };
  return (
    <aside
      className="w-64 bg-sidebar-bg shrink-0 border-r flex flex-col relative z-10"
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
            onClick={() => onNavigate("social")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              currentView === "social"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Share2 size={18} />
            Redes Sociais
          </button>

          <button
            onClick={() => onNavigate("planner")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              currentView === "planner"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Calendar size={18} />
            Planejador
          </button>

          <button
            onClick={() => onNavigate("trash")}
            onContextMenu={handleTrashContextMenu}
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

      {/* Context Menu for Trash */}
      {trashContextMenu && (
        <ContextMenu
          anchorRect={{
            top: trashContextMenu.y,
            right: trashContextMenu.x + 1,
            bottom: trashContextMenu.y + 1,
            left: trashContextMenu.x,
            width: 1,
            height: 1,
          }}
          options={[
            {
              label: "Excluir tudo",
              icon: <Trash2 size={16} />,
              onClick: () => {
                handleDeleteAll();
                setTrashContextMenu(null);
              },
              disabled: trashItems.length === 0,
            },
          ]}
          onClose={() => setTrashContextMenu(null)}
        />
      )}
    </aside>
  );
}
