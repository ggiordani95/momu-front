"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  Settings,
  Trash2,
  Airplay,
  ChevronDown,
} from "lucide-react";
import ContextMenu from "./editors/ContextMenu";
import { usePermanentDeleteItem } from "@/lib/hooks/querys/useFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { ProgressSection } from "./ProgressSection";

// Workspace Selector Button Component (Linear-style)
function WorkspaceSelectorButton({ workspaceId }: { workspaceId: string }) {
  const { workspaces, currentWorkspace, setCurrentWorkspace } =
    useWorkspaceStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get current workspace
  const activeWorkspace =
    workspaces.find((w) => w.id === workspaceId) ||
    (currentWorkspace
      ? workspaces.find((w) => w.id === currentWorkspace.id)
      : null) ||
    workspaces[0];

  // Get initials for avatar
  const getInitials = (title: string) => {
    return title
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get color for avatar based on workspace title
  const getAvatarColor = (title: string) => {
    const colors = [
      "bg-purple-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
    ];
    const index = title.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const handleWorkspaceSelect = (selectedWorkspaceId: string) => {
    setIsDropdownOpen(false);
    const workspace = workspaces.find((w) => w.id === selectedWorkspaceId);
    if (workspace) {
      setCurrentWorkspace({
        id: workspace.id,
        title: workspace.title,
      });
    }
  };

  if (!activeWorkspace || workspaces.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full py-2">
      <button
        ref={buttonRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center gap-2 rounded-md hover:bg-foreground/5 transition-colors group"
      >
        {/* Avatar */}
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold shrink-0 ${getAvatarColor(
            activeWorkspace.title
          )}`}
        >
          {getInitials(activeWorkspace.title)}
        </div>
        {/* Workspace name */}
        <span className="flex-1 text-sm font-medium text-foreground truncate text-left">
          {activeWorkspace.title}
        </span>
        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-foreground/40 shrink-0 transition-transform ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleWorkspaceSelect(ws.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-foreground/5 transition-colors ${
                activeWorkspace.id === ws.id ? "bg-foreground/10" : ""
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold shrink-0 ${getAvatarColor(
                  ws.title
                )}`}
              >
                {getInitials(ws.title)}
              </div>
              <span className="flex-1 text-sm text-left">{ws.title}</span>
              {activeWorkspace.id === ws.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/60 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SimpleSidebarProps {
  onNavigate?: (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => void;
  currentView?: "explorer" | "settings" | "trash" | "social" | "planner" | "ai";
  workspaceId: string;
}

export default function SimpleSidebar({
  onNavigate,
  currentView,
  workspaceId,
}: SimpleSidebarProps) {
  const pathname = usePathname();
  const { currentView: storeView, setCurrentView } = useWorkspaceStore();

  // Use store view if currentView prop is not provided
  const activeView = currentView || storeView;

  const handleNavigate = (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => {
    // Check if we're already in the target view
    const currentPathView = pathname?.split("/")[1];
    if (currentPathView === view && activeView === view) {
      // Already in the target view, do nothing
      return;
    }

    // Mark this as internal navigation FIRST to prevent WorkspaceView from re-rendering
    // We'll set a flag in the window object that WorkspaceView can check
    if (typeof window !== "undefined") {
      (
        window as Window & { __isInternalNavigation?: boolean }
      ).__isInternalNavigation = true;
    }

    // Update view in Zustand store (instant UI update)
    setCurrentView(view);

    // Update URL asynchronously using history API to avoid re-render/flash
    // Use requestAnimationFrame to ensure it happens after React's render
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const newUrl = `/${view}`;
        window.history.replaceState(
          { ...window.history.state, view },
          "",
          newUrl
        );
        // Clear the flag after a delay to ensure WorkspaceView's useEffect has run
        setTimeout(() => {
          (
            window as Window & { __isInternalNavigation?: boolean }
          ).__isInternalNavigation = false;
        }, 100);
      });
    }

    // Call onNavigate callback if provided (for backward compatibility)
    if (onNavigate) {
      onNavigate(view);
    }
  };
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
    } catch (_error) {
      // On error, re-sync to get correct state
      const { syncFiles } = useWorkspaceStore.getState();
      if (!useWorkspaceStore.getState().isSyncing) {
        syncFiles();
      }
    }
  };
  return (
    <aside
      className="w-52 bg-sidebar shrink-0 border-r flex flex-col relative z-10"
      style={{
        borderColor: "var(--border-color)",
      }}
    >
      <div
        className="flex items-center border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="w-full p-3">
          <WorkspaceSelectorButton workspaceId={workspaceId} />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <button
            onClick={() => handleNavigate("explorer")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "explorer"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <FolderTree size={18} />
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
            onClick={() => handleNavigate("trash")}
            onContextMenu={handleTrashContextMenu}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "trash"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Trash2 size={18} />
            Lixeira
          </button>

          {/* Progress Section */}
          <ProgressSection workspaceId={workspaceId} />

          <button
            onClick={() => handleNavigate("settings")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "settings"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Settings size={18} />
            Configurações
          </button>

          <div className="border-t border-border my-2" />

          <button
            onClick={() => handleNavigate("ai")}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors ${
              activeView === "ai"
                ? "bg-hover text-foreground"
                : "hover:bg-hover/50 text-foreground/70"
            }`}
          >
            <Airplay size={18} className="text-purple-500" />
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
