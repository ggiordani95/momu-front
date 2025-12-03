"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  Settings,
  Trash2,
  Airplay,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Download,
  LogOut,
  Search,
  Edit,
  Check,
} from "lucide-react";
import { createPortal } from "react-dom";
import ContextMenu from "./editors/ContextMenu";
import { usePermanentDeleteItem } from "@/modules/files";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { ProgressSection } from "./ProgressSection";

// Workspace Selector Button Component (Linear-style)
function WorkspaceSelectorButton({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => void;
}) {
  const { workspaces, currentWorkspace, setCurrentWorkspace, setCurrentView } =
    useWorkspaceStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showWorkspaceSubmenu, setShowWorkspaceSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  // Detect OS for keyboard shortcuts
  const [isMac, setIsMac] = useState(false);

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

  // Detect OS and mount state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const platform = navigator.platform.toLowerCase();
      const userAgent = navigator.userAgent.toLowerCase();
      const isMacOS =
        platform.includes("mac") ||
        platform.includes("iphone") ||
        platform.includes("ipad") ||
        userAgent.includes("mac os x");
      setTimeout(() => {
        setIsMounted(true);
        setIsMac(isMacOS);
      }, 0);
    }
  }, []);

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
        setShowWorkspaceSubmenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setShowWorkspaceSubmenu(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isDropdownOpen]);

  const handleWorkspaceSelect = useCallback(
    (selectedWorkspaceId: string) => {
      setIsDropdownOpen(false);
      setShowWorkspaceSubmenu(false);
      const workspace = workspaces.find((w) => w.id === selectedWorkspaceId);
      if (workspace) {
        // Mark this as internal navigation to prevent flicker
        if (typeof window !== "undefined") {
          (
            window as Window & { __isInternalNavigation?: boolean }
          ).__isInternalNavigation = true;
        }

        // Update workspace in store first (instant UI update)
        setCurrentWorkspace({
          id: workspace.id,
          title: workspace.title,
        });

        // Update view to explorer
        setCurrentView("explorer");

        // Update URL asynchronously using history API to avoid re-render/flash
        if (typeof window !== "undefined") {
          requestAnimationFrame(() => {
            const newUrl = `/explorer/${workspace.id}`;
            window.history.pushState(
              {
                ...window.history.state,
                workspaceId: workspace.id,
                view: "explorer",
              },
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
      }
    },
    [workspaces, setCurrentWorkspace, setCurrentView]
  );

  const handleSettings = useCallback(() => {
    setIsDropdownOpen(false);
    setCurrentView("settings");
    if (onNavigate) {
      onNavigate("settings");
    }
  }, [setCurrentView, onNavigate]);

  const handleLogout = useCallback(() => {
    setIsDropdownOpen(false);
    // TODO: Implement logout functionality
    console.log("Logout clicked");
  }, []);

  // Get button position for dropdown positioning
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isDropdownOpen]);

  if (!activeWorkspace || workspaces.length === 0 || !isMounted) {
    return null;
  }

  const menuItems = [
    {
      id: "settings",
      label: "Configurações",
      icon: <Settings size={16} />,
      onClick: handleSettings,
    },
    {
      id: "invite",
      label: "Convidar usuário",
      icon: <UserPlus size={16} />,
      onClick: () => {
        setIsDropdownOpen(false);
        // TODO: Implement invite functionality
        console.log("Invite clicked");
      },
    },
    {
      id: "switch-workspace",
      label: "Mudar de workspace",
      icon: <ChevronRight size={16} />,
      hasSubmenu: true,
      onClick: () => setShowWorkspaceSubmenu(true),
    },
    {
      id: "logout",
      label: "Sair",
      icon: <LogOut size={16} />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  const dropdownContent = isDropdownOpen && buttonRect && (
    <div
      ref={dropdownRef}
      className="fixed bg-background border border-border rounded-lg shadow-2xl z-[100] min-w-[280px] max-w-[320px]"
      style={{
        top: buttonRect.bottom + 8,
        left: buttonRect.left,
      }}
    >
      {/* User Account Section */}
      <div className="px-3 py-2.5 border-b border-border">
        <div className="text-sm text-foreground/70">
          {/* TODO: Get actual user email from auth context */}
          user@example.com
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item) => {
          if (item.id === "switch-workspace" && showWorkspaceSubmenu) {
            return (
              <div key={item.id}>
                {/* Back button */}
                <button
                  onClick={() => setShowWorkspaceSubmenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  <span>Back</span>
                </button>
                {/* Workspace list */}
                <div className="border-t border-border">
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
                      <span className="flex-1 text-sm text-left text-foreground">
                        {ws.title}
                      </span>
                      {activeWorkspace.id === ws.id && (
                        <Check
                          size={16}
                          className="text-foreground/60 shrink-0"
                        />
                      )}
                    </button>
                  ))}
                  {/* Create or join workspace */}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowWorkspaceSubmenu(false);
                        // TODO: Implement create/join workspace
                        console.log("Create or join workspace");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
                    >
                      <span>Create or join a workspace...</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowWorkspaceSubmenu(false);
                        // TODO: Implement add account
                        console.log("Add account");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
                    >
                      <span>Add an account...</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                item.danger
                  ? "text-red-400 hover:bg-foreground/5"
                  : "text-foreground hover:bg-foreground/5"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.hasSubmenu && !showWorkspaceSubmenu && (
                <ChevronRight
                  size={16}
                  className="text-foreground/40 shrink-0"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="relative w-full py-2">
        <div className="flex items-center gap-2">
          <button
            ref={buttonRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex-1 flex items-center gap-2 rounded-md hover:bg-foreground/5 transition-colors group"
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
          {/* Search and Edit icons */}
          <button
            className="p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground shrink-0"
            title="Search"
          >
            <Search size={16} />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground shrink-0"
            title="Edit"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>

      {/* Dropdown Portal */}
      {isMounted && typeof window !== "undefined" && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}
    </>
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
      className="w-64 bg-sidebar shrink-0 border-r flex flex-col relative z-10"
      style={{
        borderColor: "var(--border-color)",
      }}
    >
      <div
        className="flex items-center border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="w-full p-3">
          <WorkspaceSelectorButton
            workspaceId={workspaceId}
            onNavigate={onNavigate}
          />
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
