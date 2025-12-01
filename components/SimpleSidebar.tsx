"use client";

import { useState } from "react";
import {
  FolderTree,
  Settings,
  Trash2,
  Share2,
  Calendar,
  Sparkles,
  Airplay,
} from "lucide-react";
import Image from "next/image";
import ContextMenu from "./editors/ContextMenu";
import { usePermanentDeleteItem } from "@/lib/hooks/querys/useFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";

interface SimpleSidebarProps {
  onNavigate: (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => void;
  currentView: "explorer" | "settings" | "trash" | "social" | "planner" | "ai";
  workspaceId: string;
}

export default function SimpleSidebar({
  onNavigate,
  currentView,
  workspaceId,
}: SimpleSidebarProps) {
  const [trashContextMenu, setTrashContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Get trash items from Zustand store (files with active === false)
  const { getDeletedFilesByWorkspace } = useWorkspaceStore();
  const trashItems = workspaceId ? getDeletedFilesByWorkspace(workspaceId) : [];
  const permanentDeleteMutation = usePermanentDeleteItem(workspaceId);

  const handleTrashContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTrashContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDeleteAll = async () => {
    if (trashItems.length === 0) return;

    try {
      const { removeFilePermanently, syncFiles } = useWorkspaceStore.getState();

      // Optimistically remove all files from Zustand store immediately
      trashItems.forEach((file) => {
        removeFilePermanently(file.id);
      });

      // Excluir todos os itens permanentemente no backend
      await Promise.all(
        trashItems.map((file) => permanentDeleteMutation.mutateAsync(file.id))
      );

      // Sync files to refresh state from backend
      if (!useWorkspaceStore.getState().isSyncing) {
        syncFiles();
      }

      console.log(
        `✅ [DELETE ALL] Permanently deleted ${trashItems.length} item(s) from trash`
      );
    } catch (error) {
      console.error("Error deleting all items:", error);
      // On error, re-sync to get correct state
      const { syncFiles } = useWorkspaceStore.getState();
      if (!useWorkspaceStore.getState().isSyncing) {
        syncFiles();
      }
    }
  };
  return (
    <aside
      className="w-52 bg-[var(--sidebar-bg)] shrink-0 border-r flex flex-col relative z-10"
      style={{
        borderColor: "var(--border-color)",
      }}
    >
      <div
        className="flex items-center"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-center p-4">
          <Image
            src="/momu.png"
            alt="MOMU"
            width={32}
            height={32}
            className="h-9  object-contain"
            priority
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <button
            onClick={() => onNavigate("explorer")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-md font-medium transition-colors ${
              currentView === "explorer"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <FolderTree size={21} />
            Meu explorador
          </button>

          {/* <button
            onClick={() => onNavigate("social")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-md font-medium transition-colors ${
              currentView === "social"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Share2 size={16} />
            Redes Sociais
          </button> */}

          {/* <button
            onClick={() => onNavigate("planner")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-md font-medium transition-colors ${
              currentView === "planner"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Calendar size={16} />
            Planejador
          </button> */}

          <button
            onClick={() => onNavigate("trash")}
            onContextMenu={handleTrashContextMenu}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-md font-medium transition-colors ${
              currentView === "trash"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Trash2 size={21} />
            Lixeira
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-md font-medium transition-colors ${
              currentView === "settings"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Settings size={21} />
            Configurações
          </button>

          <div className="border-t border-[var(--border-color)] my-2" />

          <button
            onClick={() => onNavigate("ai")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-md font-medium transition-colors`}
          >
            <Airplay size={21} className="text-purple-300" />
            Assistente de IA
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
