"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FolderTree,
  Settings,
  Trash2,
  Airplay,
  ChevronDown,
  ChevronRight,
  UserPlus,
  LogOut,
  Search,
  Check,
} from "lucide-react";
import { createPortal } from "react-dom";
import ContextMenu from "../../editor/components/ContextMenu";
import { usePermanentDeleteFile } from "@/modules/files";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { ProgressSection } from "../../../components/ProgressSection";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { NavItem, FavoriteItem } from "@/components/ui/sidebar-01/types";

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
      setTimeout(() => {
        setIsMounted(true);
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
      className="fixed bg-[var(--sidebar)] border border-border rounded-lg shadow-2xl z-100 w-[280px]"
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors"
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
                      className={`w-full flex items-center gap-2 px-3 py-2   transition-colors ${
                        activeWorkspace.id === ws.id
                          ? "bg-[var(--sidebar)]"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold shrink-0 ${getAvatarColor(
                          ws.title
                        )}`}
                      >
                        {getInitials(ws.title)}
                      </div>
                      <span className="flex-1 text-sm text-left text-foreground truncate">
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70   transition-colors"
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70  transition-colors"
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
                item.danger ? "text-destructive " : "text-foreground "
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.hasSubmenu && !showWorkspaceSubmenu && (
                <ChevronRight
                  size={16}
                  className="text-foreground/60 shrink-0"
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
            className="flex-1 flex items-center gap-2 rounded-md  transition-colors group"
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
            <span className="flex-1 text-sm font-medium text-foreground truncate text-left max-w-[140px]">
              {activeWorkspace.title}
            </span>
            {/* Chevron */}
            <ChevronDown
              className={`w-4 h-4 text-foreground/60 shrink-0 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
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

// Custom NavHeader with Workspace Selector and Search
function CustomNavHeader({
  workspaceId,
  onNavigate,
  onSearchOpen,
}: {
  workspaceId: string;
  onNavigate?: (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => void;
  onSearchOpen: () => void;
}) {
  const isMac =
    typeof window !== "undefined" &&
    (navigator.platform.toLowerCase().includes("mac") ||
      navigator.userAgent.toLowerCase().includes("mac os x"));

  // Note: Keyboard shortcut is handled globally in WorkspaceView
  // We only need the click handler here

  return (
    <SidebarHeader>
      {/* Search Bar - Top */}
      <div
        className="flex items-center justify-between pb-2 pt-3 cursor-pointer"
        onClick={onSearchOpen}
      >
        <div className="flex items-center flex-1 gap-3">
          <Search className="h-4 w-4 text-foreground/70" />
          <span className="text-sm text-foreground/70 font-normal">
            Procurar
          </span>
        </div>
        <div className="flex items-center justify-center px-2 py-1 border border-border rounded-md">
          <kbd className="text-foreground/70 inline-flex font-[inherit] text-xs font-medium">
            <span className="opacity-70">
              {isMac ? "⌘ + " : "Ctrl +"}
              {"/"}
            </span>
          </kbd>
        </div>
      </div>

      {/* Workspace Selector - Below Search */}
      <div className="pb-2 pt-1">
        <WorkspaceSelectorButton
          workspaceId={workspaceId}
          onNavigate={onNavigate}
        />
      </div>
    </SidebarHeader>
  );
}

interface SimpleSidebarProps {
  onNavigate?: (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => void;
  workspaceId: string;
}

export default function SimpleSidebar({
  onNavigate,
  workspaceId,
}: SimpleSidebarProps) {
  const {
    currentView: storeView,
    setCurrentView,
    workspaces,
  } = useWorkspaceStore();
  const [trashContextMenu, setTrashContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Use store view as single source of truth
  // WorkspaceView handles syncing pathname → store on mount/URL changes
  const activeView = storeView;

  const handleNavigate = (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => {
    // Check if we're already in the target view (use store, not pathname)
    if (storeView === view) {
      // Already in the target view, do nothing
      return;
    }

    // Update view in Zustand store first (instant UI update)
    // This will trigger re-render in WorkspaceView to show correct content
    setCurrentView(view);

    // Update URL using history API (no re-render, smooth navigation)
    // WorkspaceView already renders based on storeView, so we don't need router.push
    if (typeof window !== "undefined") {
      const newUrl = `/${view}`;
      window.history.replaceState(
        { ...window.history.state, view },
        "",
        newUrl
      );
    }

    // Call onNavigate callback if provided (for backward compatibility)
    if (onNavigate) {
      onNavigate(view);
    }
  };

  // Get trash items from Zustand store (files with active === false)
  const { getDeletedFilesByWorkspace } = useWorkspaceStore();
  const trashItems = workspaceId ? getDeletedFilesByWorkspace(workspaceId) : [];
  const permanentDeleteMutation = usePermanentDeleteFile(workspaceId);

  const handleTrashContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTrashContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDeleteAll = async () => {
    if (trashItems.length === 0) return;

    try {
      const { removeFilePermanently } = useWorkspaceStore.getState();

      // Optimistically remove all files from Zustand store immediately
      trashItems.forEach((file) => {
        removeFilePermanently(file.id);
      });

      // Excluir todos os itens permanentemente no backend
      await Promise.all(
        trashItems.map((file) => permanentDeleteMutation.mutateAsync(file.id))
      );
    } catch {
      // On error, re-sync to get correct state
    }
  };

  // Main navigation items
  const navItems: NavItem[] = [
    {
      id: "explorer",
      title: "Meu explorador",
      icon: FolderTree,
      isActive: activeView === "explorer",
    },
    {
      id: "trash",
      title: "Lixeira",
      icon: Trash2,
      isActive: activeView === "trash",
    },
    {
      id: "ai",
      title: "Assistente de IA",
      icon: Airplay,
      isActive: activeView === "ai",
    },
  ];

  // Favorite workspaces (first 4 workspaces as favorites)
  const favoriteWorkspaces: FavoriteItem[] = workspaces
    .slice(0, 4)
    .map((ws) => {
      const colors = [
        "bg-green-400 dark:bg-green-300",
        "bg-blue-400 dark:bg-blue-300",
        "bg-orange-400 dark:bg-orange-300",
        "bg-red-400 dark:bg-red-300",
        "bg-purple-400 dark:bg-purple-300",
        "bg-pink-400 dark:bg-pink-300",
        "bg-indigo-400 dark:bg-indigo-300",
        "bg-teal-400 dark:bg-teal-300",
      ];
      const colorIndex = ws.title.charCodeAt(0) % colors.length;
      return {
        id: ws.id,
        title: ws.title,
        href: `/explorer/${ws.id}`,
        color: colors[colorIndex],
      };
    });

  // Handle workspace selection from favorites
  const handleWorkspaceSelect = (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      const { setCurrentWorkspace, setCurrentView } =
        useWorkspaceStore.getState();
      setCurrentWorkspace({
        id: workspace.id,
        title: workspace.title,
      });
      setCurrentView("explorer");
      if (typeof window !== "undefined") {
        window.history.pushState(
          { ...window.history.state, workspaceId: workspace.id },
          "",
          `/explorer/${workspace.id}`
        );
      }
    }
  };

  return (
    <>
      <Sidebar collapsible="icon" variant="inset">
        <CustomNavHeader
          workspaceId={workspaceId}
          onNavigate={onNavigate}
          onSearchOpen={() => {
            // Dispatch custom event to open search in WorkspaceView
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("openGlobalSearch"));
            }
          }}
        />

        <SidebarContent>
          {/* Main Navigation - using NavMain structure */}
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.isActive}
                      className={"text-foreground hover:text-foreground"}
                      onClick={() =>
                        handleNavigate(item.id as typeof activeView)
                      }
                      onContextMenu={
                        item.id === "trash" ? handleTrashContextMenu : undefined
                      }
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* Collapsible Sections: Favorites (Workspaces) - using NavCollapsible structure */}
          {favoriteWorkspaces.length > 0 && (
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel
                  asChild
                  className="text-sm text-foreground/70"
                >
                  <CollapsibleTrigger>
                    Favoritos
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180 text-foreground/60" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {favoriteWorkspaces.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton asChild>
                            <a
                              href={item.href}
                              className="flex items-center gap-3 text-foreground"
                              onClick={(e) => {
                                e.preventDefault();
                                handleWorkspaceSelect(item.id);
                              }}
                            >
                              <div
                                className={`h-3 w-3 rounded-[4px] ${item.color}`}
                              />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}

          {/* Progress Section */}
          <ProgressSection workspaceId={workspaceId} />
        </SidebarContent>
      </Sidebar>

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
    </>
  );
}
