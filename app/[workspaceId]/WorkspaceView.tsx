"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { buildHierarchy } from "@/lib/utils/hierarchy";
import type { HierarchicalFile, CreateFileDto, Workspace } from "@/lib/types";
import SimpleSidebar from "@/components/SimpleSidebar";
import NotionBlockEditor from "@/components/editors/NotionBlockEditor";
import { TrashWorkspace } from "@/components/views/trash/TrashWorkspace";
import { SettingsWorkspace } from "@/components/views/settings/SettingsWorkspace";
import { ExplorerWorkspace } from "@/components/views/explorer/ExplorerWorkspace";
import { SocialWorkspace } from "@/components/views/social/SocialWorkspace";
import { PlannerWorkspace } from "@/components/views/planner/PlannerWorkspace";
import { AIWorkspace } from "@/components/views/ai/AIWorkspace";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ArrowLeft, X } from "lucide-react";
import { FolderIcon, NoteIcon, VideoIcon } from "@/components/icons/ItemIcons";
import { createPortal } from "react-dom";

interface WorkspaceViewProps {
  workspaceId: string;
  pathSegments?: string[];
}

export default function WorkspaceView({
  workspaceId,
  pathSegments = [],
}: WorkspaceViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Get current view from Zustand store (single source of truth)
  const { currentView: storeView, setCurrentView } = useWorkspaceStore();

  // Sync URL with store ONLY on initial load or direct URL navigation (not internal navigation)
  // Use a ref to track if we've already synced to avoid unnecessary updates
  const hasSyncedRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  const isInternalNavRef = useRef(false);

  useEffect(() => {
    // Check if this is an internal navigation FIRST (before checking pathname change)
    // This prevents the effect from running when SimpleSidebar updates the URL
    if (
      typeof window !== "undefined" &&
      (window as Window & { __isInternalNavigation?: boolean })
        .__isInternalNavigation
    ) {
      isInternalNavRef.current = true;
      // Update prevPathnameRef to prevent this effect from running again
      prevPathnameRef.current = pathname;
      return;
    }

    // Reset internal nav flag if it was set
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
    }

    // Skip if pathname hasn't actually changed (and it's not an internal nav)
    if (prevPathnameRef.current === pathname && hasSyncedRef.current) {
      return;
    }
    prevPathnameRef.current = pathname;

    // Get view from URL pathname (e.g., /explorer, /trash, /ai)
    const viewFromPath = pathname?.split("/")[1] as
      | "explorer"
      | "settings"
      | "trash"
      | "social"
      | "planner"
      | "ai"
      | undefined;

    // Only sync on initial load or when pathname changes from external navigation
    if (!hasSyncedRef.current) {
      // Initial load: sync URL to store
      if (viewFromPath) {
        setCurrentView(viewFromPath);
      } else {
        // No view in URL on initial load, default to explorer and update URL silently
        setCurrentView("explorer");
        if (typeof window !== "undefined") {
          requestAnimationFrame(() => {
            window.history.replaceState(
              { ...window.history.state, view: "explorer" },
              "",
              "/explorer"
            );
          });
        }
      }
      hasSyncedRef.current = true;
    } else if (viewFromPath && viewFromPath !== storeView) {
      // External navigation (user typed URL directly or used browser back/forward)
      setCurrentView(viewFromPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Use store view as single source of truth (not pathname)
  const currentView = storeView;
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Track if component is mounted to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state after component mounts (client-side only)
  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
    }, 0);
  }, []);

  const [showSearchHint, setShowSearchHint] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const searchHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect OS for keyboard shortcuts display
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const platform = navigator.platform.toLowerCase();
      const userAgent = navigator.userAgent.toLowerCase();
      const isMacOS =
        platform.includes("mac") ||
        platform.includes("iphone") ||
        platform.includes("ipad") ||
        userAgent.includes("mac os x");
      setIsMac(isMacOS);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isTypingInInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable ||
        target?.closest("input, textarea, [contenteditable]");

      // Open search with Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        setShowSearchHint(false);
        return;
      }

      // Add folder with Ctrl+F or Cmd+F (only in explorer view)
      // Note: Ctrl+F is also used by browser for search, so we need to prevent default
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "f" || e.key === "F") &&
        !e.shiftKey &&
        !isTypingInInput &&
        currentView === "explorer"
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (handleAddItemRef.current) {
          handleAddItemRef.current({
            type: "folder",
            title: "Nova Pasta",
            parent_id: currentFolderId || undefined,
          });
        }
        return;
      }

      // Add note with Ctrl+Y or Cmd+Y (only in explorer view)
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || e.key === "Y") &&
        !isTypingInInput &&
        currentView === "explorer"
      ) {
        e.preventDefault();
        if (handleAddItemRef.current) {
          handleAddItemRef.current({
            type: "note",
            title: "Novo Bloco de Notas",
            parent_id: currentFolderId || undefined,
          });
        }
        return;
      }

      // Add video with Ctrl+L or Cmd+L (only in explorer view)
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "l" || e.key === "L") &&
        !e.shiftKey &&
        !isTypingInInput &&
        currentView === "explorer"
      ) {
        e.preventDefault();
        setShowYouTubeModal(true);
        return;
      }

      // Close search hint if search is open
      if (isSearchOpen) {
        setShowSearchHint(false);
        return;
      }

      // Show hint when user types a regular character (not modifier keys)
      // Only if not typing in an input/textarea/contenteditable

      // Check if it's a printable character (letters, numbers, and common characters)
      const isPrintableChar =
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        /^[a-zA-Z0-9]$/.test(e.key);

      if (!isTypingInInput && isPrintableChar) {
        setShowSearchHint(true);

        // Clear existing timeout
        if (searchHintTimeoutRef.current) {
          clearTimeout(searchHintTimeoutRef.current);
        }

        // Hide hint after 4 seconds
        searchHintTimeoutRef.current = setTimeout(() => {
          setShowSearchHint(false);
        }, 4000);
      }
    };

    // Use capture phase to catch events earlier
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (searchHintTimeoutRef.current) {
        clearTimeout(searchHintTimeoutRef.current);
      }
    };
  }, [isSearchOpen, currentView, currentFolderId]);

  const [selectedItem, setSelectedItem] = useState<HierarchicalFile | null>(
    null
  );
  const [pendingItems, setPendingItems] = useState<
    Map<string, { item: HierarchicalFile; data: CreateFileDto }>
  >(new Map());
  const previousEditorPathRef = useRef<string | null>(null);
  const handleAddItemRef = useRef<
    ((itemData: CreateFileDto) => Promise<void>) | null
  >(null);

  // Use Zustand store for global state management

  // Use Zustand store instead of React Query
  // Only access store data after component is mounted to avoid hydration mismatch
  // Subscribe directly to files array to react to changes when markFileAsDeleted is called
  const {
    workspaces,
    files: allFiles,
    setCurrentWorkspace,
  } = useWorkspaceStore();
  const { isSyncing } = useWorkspaceStore();

  // Filter files by workspace and active status
  // This will automatically re-render when files array changes (e.g., when markFileAsDeleted updates it)
  const workspaceFiles = useMemo(() => {
    if (!isMounted) return [];
    const filtered = allFiles.filter(
      (file) => file.workspace_id === workspaceId && file.active !== false
    );

    return filtered;
  }, [allFiles, workspaceId, isMounted]);
  const files = useMemo(() => buildHierarchy(workspaceFiles), [workspaceFiles]);
  const loading = isMounted ? isSyncing : true;
  const itemsError = null;
  const workspacesItems = useMemo(() => {
    if (isMounted) {
      return workspaces;
    }
    return [];
  }, [workspaces, isMounted]);

  // Update currentWorkspace in store when workspaceId changes
  useEffect(() => {
    if (isMounted && workspaceId && workspacesItems.length > 0) {
      const workspace = workspacesItems.find((w) => w.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace({
          id: workspace.id,
          title: workspace.title,
        });
      }
    }
  }, [workspaceId, workspacesItems, isMounted, setCurrentWorkspace]);

  // Reset navigation state when workspace changes
  const prevWorkspaceIdRef = useRef<string | undefined>(workspaceId);
  useEffect(() => {
    if (
      prevWorkspaceIdRef.current !== workspaceId &&
      prevWorkspaceIdRef.current
    ) {
      // Workspace changed - reset navigation to root
      setCurrentFolderId(null);
      setSelectedItem(null);
      prevWorkspaceIdRef.current = workspaceId;
    } else if (!prevWorkspaceIdRef.current) {
      prevWorkspaceIdRef.current = workspaceId;
    }
  }, [workspaceId, setCurrentFolderId]);

  useEffect(() => {
    if (
      !loading &&
      files.length === 0 &&
      !itemsError &&
      workspacesItems.length > 0
    ) {
      const workspaceExists = workspacesItems.some((f) => f.id === workspaceId);
      if (!workspaceExists) {
        // Only redirect if we're not in trash view (trash view can have empty files)
        const view = currentView || "explorer";
        if (view !== "trash") {
          // Redirect to explorer view (workspace managed by Zustand) without page reload
          startTransition(() => {
            router.replace("/explorer", { scroll: false });
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    files.length,
    itemsError,
    workspaceId,
    workspacesItems,
    router,
    // Use storeView directly to ensure stable dependency
    storeView,
  ]);
  // Note: Mutations are no longer used directly - operations are saved to localStorage
  // and synced on next page load via useOfflineSync

  const pathKey = pathSegments.join("/");

  // Use refs to track previous values and avoid unnecessary state updates
  const prevPathKeyRef = useRef<string>("");
  const prevCurrentFolderIdRef = useRef<string | null>(null);
  const prevSelectedItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!files || files.length === 0) {
      return;
    }

    // Skip if path hasn't actually changed
    if (prevPathKeyRef.current === pathKey) {
      return;
    }

    prevPathKeyRef.current = pathKey;

    // Use startTransition to mark state updates as non-urgent
    // This prevents flicker by allowing React to batch updates smoothly
    startTransition(() => {
      if (!pathSegments || pathSegments.length === 0) {
        // Only update if values actually changed
        if (
          prevCurrentFolderIdRef.current !== null ||
          prevSelectedItemIdRef.current !== null
        ) {
          prevCurrentFolderIdRef.current = null;
          prevSelectedItemIdRef.current = null;
          setCurrentFolderId(null);
          setSelectedItem(null);
        }
        return;
      }

      const lastSegment = pathSegments[pathSegments.length - 1];
      const targetItem = findItemById(files, lastSegment);

      if (!targetItem) {
        // Item not found in files tree - might be an empty folder or pending item
        // Still set currentFolderId to allow navigation (the folder might exist but be empty)
        if (prevCurrentFolderIdRef.current !== lastSegment) {
          prevCurrentFolderIdRef.current = lastSegment;
          prevSelectedItemIdRef.current = null;
          setCurrentFolderId(lastSegment);
          setSelectedItem(null);
        }
        return;
      }

      if (targetItem.type === "folder") {
        // Only update if folder ID changed
        if (prevCurrentFolderIdRef.current !== targetItem.id) {
          prevCurrentFolderIdRef.current = targetItem.id;
          setCurrentFolderId(targetItem.id);
        }
        // Only update selectedItem if it changed
        setSelectedItem((prev) => {
          const newValue = prev?.id === targetItem.id ? prev : null;
          if (prevSelectedItemIdRef.current !== (newValue?.id || null)) {
            prevSelectedItemIdRef.current = newValue?.id || null;
            return newValue;
          }
          return prev;
        });
      } else {
        // Only update if item changed
        if (prevSelectedItemIdRef.current !== targetItem.id) {
          prevSelectedItemIdRef.current = targetItem.id;
          setSelectedItem(targetItem);
        }
        // Only update folder ID if it changed
        const newFolderId = targetItem.parent_id || null;
        if (prevCurrentFolderIdRef.current !== newFolderId) {
          prevCurrentFolderIdRef.current = newFolderId;
          setCurrentFolderId(newFolderId);
        }
      }
    });
  }, [pathKey, files, pathSegments]);

  const handleFolderClick = (folderId: string) => {
    // Build path to folder (including parent folders)
    const buildPathToFolder = (
      files: HierarchicalFile[],
      targetId: string,
      currentPath: string[] = []
    ): string[] | null => {
      for (const item of files) {
        if (item.id === targetId) {
          return [...currentPath, item.id];
        }
        // Check children even if empty array (for empty folders)
        if (item.children && item.children.length >= 0) {
          const found = buildPathToFolder(item.children, targetId, [
            ...currentPath,
            item.id,
          ]);
          if (found) return found;
        }
      }
      return null;
    };

    // Get current view from pathname
    const viewFromPath = pathname?.split("/")[1] || "explorer";
    const baseRoute = `/${viewFromPath}`;

    // First try to find the folder in the files tree
    const pathToFolder = buildPathToFolder(files, folderId);
    let newPath: string;
    let newPathSegments: string[] = [];

    // Always include workspaceId in the path: /explorer/{workspaceId}/{folderPath}
    if (pathToFolder) {
      newPathSegments = pathToFolder;
      newPath = `${baseRoute}/${workspaceId}/${pathToFolder.join("/")}`;
    } else {
      // Fallback: check if folder exists at all (even if empty)
      const folderExists = findItemById(files, folderId);
      if (folderExists) {
        // Folder exists but path building failed, try to build path from parent
        const parentId = folderExists.parent_id;
        if (parentId) {
          const parentPath = buildPathToFolder(files, parentId);
          if (parentPath) {
            newPathSegments = [...parentPath, folderId];
            newPath = `${baseRoute}/${workspaceId}/${newPathSegments.join(
              "/"
            )}`;
          } else {
            // Just use parent and folder
            newPathSegments = [parentId, folderId];
            newPath = `${baseRoute}/${workspaceId}/${newPathSegments.join(
              "/"
            )}`;
          }
        } else {
          // Root level folder - just folder ID after workspaceId
          newPathSegments = [folderId];
          newPath = `${baseRoute}/${workspaceId}/${folderId}`;
        }
      } else {
        // Folder not found, but navigate anyway (might be a new folder)
        newPathSegments = [folderId];
        newPath = `${baseRoute}/${workspaceId}/${folderId}`;
      }
    }

    // Update state directly to avoid waiting for pathname to change
    const targetItem = findItemById(files, folderId);
    if (targetItem && targetItem.type === "folder") {
      // Update state immediately
      prevCurrentFolderIdRef.current = folderId;
      prevSelectedItemIdRef.current = null;
      setCurrentFolderId(folderId);
      setSelectedItem(null);
    }

    // Update URL asynchronously using history API to avoid re-render/flash
    // Use requestAnimationFrame to ensure it happens after React's render
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.history.replaceState(
          { ...window.history.state, path: newPath },
          "",
          newPath
        );
      });
    }
  };

  const getBasePathWithoutEditor = () => {
    const trimmed =
      pathname !== "/" && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
    const segments = trimmed.split("/").filter(Boolean);

    // Get view from first segment (explorer, trash, ai, etc)
    const view = segments[0] || "explorer";

    // Remove the item ID if it's the last segment
    if (selectedItem && segments[segments.length - 1] === selectedItem.id) {
      segments.pop();
    }

    // Check if we're in explorer view with workspaceId structure
    if (view === "explorer" && segments.length >= 2) {
      const secondSegment = segments[1];
      const { workspaces } = useWorkspaceStore.getState();
      const isWorkspaceId = workspaces.some((w) => w.id === secondSegment);

      if (isWorkspaceId) {
        // In /explorer/{workspaceId}/... structure
        // If only view and workspaceId remain, return /explorer/{workspaceId}
        if (segments.length === 2) {
          return `/${view}/${secondSegment}`;
        }
        // Return view route with workspaceId and remaining path segments
        return `/${segments.join("/")}`;
      }
    }

    // If only view remains, return just the view route
    if (segments.length <= 1) {
      return `/${view}`;
    }

    // Return view route with remaining path segments
    return `/${segments.join("/")}`;
  };

  const appendSegment = (path: string, segment: string) => {
    const trimmed =
      path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
    if (!trimmed || trimmed === "") {
      return `/${segment}`;
    }
    return `${trimmed}/${segment}`;
  };

  const handleItemClick = (item: HierarchicalFile) => {
    // Handle item click (open page, video, etc.)
    if (item.type === "video" && item.youtube_url) {
      window.open(item.youtube_url, "_blank");
    } else if (item.type === "note") {
      // Update state first
      setSelectedItem(item);
      setCurrentFolderId(item.parent_id || null);

      const basePath = getBasePathWithoutEditor();
      previousEditorPathRef.current = basePath;
      const nextPath = appendSegment(basePath, item.id);

      // Update URL asynchronously using history API to avoid re-render/flash
      // Use requestAnimationFrame to ensure it happens after React's render
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          window.history.pushState(
            { ...window.history.state, path: nextPath },
            "",
            nextPath
          );
        });
      }
    }
  };

  const handleCloseEditor = () => {
    // If closing editor with a pending item, remove it
    if (selectedItem && pendingItems.has(selectedItem.id)) {
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        newMap.delete(selectedItem.id);
        return newMap;
      });
    }

    setSelectedItem(null);
    const previousPath = previousEditorPathRef.current;
    if (previousPath) {
      previousEditorPathRef.current = null;
      // Update URL asynchronously using history API to avoid re-render/flash
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          window.history.replaceState(
            { ...window.history.state, path: previousPath },
            "",
            previousPath
          );
        });
      }
      return;
    }

    const trimmed =
      pathname !== "/" && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
    const segments = trimmed.split("/").filter(Boolean);
    if (segments.length > 0) {
      segments.pop();
      // Get current view from pathname
      const viewFromPath = pathname?.split("/")[1] || "explorer";
      const fallbackPath = segments.length
        ? `/${segments.join("/")}`
        : `/${viewFromPath}`;

      // Update URL asynchronously using history API to avoid re-render/flash
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          window.history.replaceState(
            { ...window.history.state, path: fallbackPath },
            "",
            fallbackPath
          );
        });
      }
    }
  };

  const handleItemUpdate = async (
    id: string,
    field: "title" | "content",
    value: string
  ) => {
    // Check if this is a pending item (not yet created in backend)
    const pendingItem = pendingItems.get(id);

    if (pendingItem) {
      // Update the pending item data
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(id);
        if (existing) {
          newMap.set(id, {
            ...existing,
            data: { ...existing.data, [field]: value },
            item: { ...existing.item, [field]: value },
          });
        }
        return newMap;
      });

      // If item is already created in backend, update it directly
      // Otherwise, it will be updated when the item is created
      {
        try {
          const { fileService } = await import("@/lib/services/fileService");
          await fileService.update(id, { [field]: value });
        } catch (error) {}
      }
      return;
    }

    // For existing items, optimistically update the file in Zustand store
    const { updateFileInStore } = useWorkspaceStore.getState();
    updateFileInStore(id, { [field]: value });

    // Check if online to sync immediately
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;

    if (isOnline) {
      // Try to update immediately in backend
      try {
        const { fileService } = await import("@/lib/services/fileService");
        const updatedFile = await fileService.update(id, { [field]: value });

        // Update Zustand store with the response from backend (to get latest data)
        updateFileInStore(id, {
          [field]: value,
          updated_at: updatedFile.updated_at,
        });

        return;
      } catch (error) {
        // Fall through to save in localStorage as fallback
      }
    }

    // If update failed, revert optimistic update
    const { updateFileInStore: revertUpdate } = useWorkspaceStore.getState();
    const originalFile = files.find((f) => f.id === id);
    if (originalFile) {
      revertUpdate(id, { [field]: originalFile[field] });
    }
  };

  const handleNavigateToWorkspaceRoot = () => {
    // Navigate to workspace root: /explorer/{workspaceId}
    const view = pathname?.split("/")[1] || "explorer";
    const newPath = `/${view}/${workspaceId}`;

    // Update state
    setCurrentFolderId(null);
    setSelectedItem(null);

    // Update URL
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.history.replaceState(
          { ...window.history.state, path: newPath },
          "",
          newPath
        );
      });
    }
  };

  const handleBack = () => {
    // Go up one level in the path
    const pathParts = pathname.split("/").filter(Boolean);
    const view = pathParts[0] || "explorer";

    let newPath: string;

    // Check if we're in explorer view and have workspaceId structure
    if (view === "explorer" && pathParts.length >= 2) {
      // Check if second segment is workspaceId
      const secondSegment = pathParts[1];
      const { workspaces } = useWorkspaceStore.getState();
      const isWorkspaceId = workspaces.some((w) => w.id === secondSegment);

      if (isWorkspaceId) {
        // We're in /explorer/{workspaceId}/{folderPath} structure
        if (pathParts.length > 2) {
          // Remove last folder from path, keep workspaceId
          const newPathParts = pathParts.slice(0, -1);
          newPath = `/${newPathParts.join("/")}`;
        } else {
          // Go to workspace root: /explorer/{workspaceId}
          newPath = `/${view}/${secondSegment}`;
          setCurrentFolderId(null);
        }
      } else {
        // Old structure or other view - use original logic
        if (pathParts.length > 1) {
          pathParts.pop();
          newPath = `/${pathParts.join("/")}`;
        } else {
          newPath = `/${view}`;
          setCurrentFolderId(null);
        }
      }
    } else {
      // Not in explorer or old structure
      if (pathParts.length > 1) {
        pathParts.pop();
        newPath = `/${pathParts.join("/")}`;
      } else {
        newPath = `/${view}`;
        setCurrentFolderId(null);
      }
    }

    // Update URL asynchronously using history API to avoid re-render/flash
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.history.replaceState(
          { ...window.history.state, path: newPath },
          "",
          newPath
        );
      });
    }
  };

  const handleItemDeleteBatch = async (ids: string[]) => {
    // Get the latest state from the store once for all files
    const { files, markFilesAsDeleted } = useWorkspaceStore.getState();

    // Filter to only files that exist and are active
    const filesToDelete = files.filter(
      (f) =>
        ids.includes(f.id) &&
        f.workspace_id === workspaceId &&
        f.active !== false
    );

    if (filesToDelete.length === 0) {
      return;
    }

    const fileIdsToDelete = filesToDelete.map((f) => f.id);

    // Mark all files as deleted in the store at once (optimistic update)
    markFilesAsDeleted(fileIdsToDelete);

    // Check if online to call API immediately
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;

    if (isOnline) {
      try {
        // Call API to delete all files at once
        const { fileService } = await import("@/lib/services/fileService");
        const result = await fileService.deleteBatch(fileIdsToDelete);

        if (result.success) {
          // Sync files to get latest state from backend
          const { syncFiles } = useWorkspaceStore.getState();
          if (!useWorkspaceStore.getState().isSyncing) {
            await syncFiles();
          }
        } else {
          throw new Error("Delete batch failed");
        }
      } catch (error) {}
    }
  };

  const handleItemDelete = async (id: string) => {
    console.log("[handleItemDelete] Deleting file:", id);
    // Always get the latest state from the store to avoid race conditions
    // This is especially important when deleting multiple files at once
    const { files, markFileAsDeleted } = useWorkspaceStore.getState();
    const file = files.find(
      (f) => f.id === id && f.workspace_id === workspaceId
    );

    console.log("[handleItemDelete] File found:", {
      fileId: id,
      fileExists: !!file,
      fileActive: file?.active,
      totalFilesInStore: files.length,
    });

    if (file && file.active === false) {
      console.log("[handleItemDelete] File already deleted, skipping");
      return;
    }

    // If item exists and is still active, mark it as deleted in the store first
    // This ensures the UI updates immediately
    if (file && file.active !== false) {
      console.log("[handleItemDelete] Marking file as deleted in store");
      markFileAsDeleted(id);
    } else if (!file) {
      console.log("[handleItemDelete] File not found in store");
      // File not found in store - might be a pending item or already deleted
    }

    // Delete directly in API
    if (file) {
      try {
        console.log("[handleItemDelete] Calling API to delete file");
        const { fileService } = await import("@/lib/services/fileService");
        await fileService.delete(id);
        console.log("[handleItemDelete] File deleted successfully, syncing...");

        // Sync files to refresh state and include deleted files
        const { syncFiles } = useWorkspaceStore.getState();
        if (!useWorkspaceStore.getState().isSyncing) {
          console.log("[handleItemDelete] Starting sync...");
          await syncFiles();
          console.log("[handleItemDelete] Sync completed");
        } else {
          console.log("[handleItemDelete] Sync already in progress, skipping");
        }
      } catch (error) {
        console.error("[handleItemDelete] Error deleting file:", error);
        // On error, restore file in store
        const { markFileAsRestored } = useWorkspaceStore.getState();
        markFileAsRestored(id);
      }
    } else {
    }
    // The UI update happens via removeOptimisticItem in HomeContent
  };

  const handleItemComplete = useCallback(
    async (id: string, completed: boolean) => {
      // For existing items, optimistically update
      const { updateFileInStore } = useWorkspaceStore.getState();
      const { files: currentFiles } = useWorkspaceStore.getState();
      const originalFile = currentFiles.find((f) => f.id === id);

      if (!originalFile) {
        return;
      }

      // Optimistic update
      updateFileInStore(id, {
        completed,
        completed_at: completed ? new Date().toISOString() : undefined,
      });

      const isOnline = typeof navigator !== "undefined" && navigator.onLine;

      if (isOnline) {
        try {
          const { fileService } = await import("@/lib/services/fileService");
          const updateData = {
            completed,
            completed_at: completed ? new Date().toISOString() : undefined,
          };

          const updatedFile = await fileService.update(id, updateData);

          // Use the values from the backend response instead of the local values
          // This ensures we're using what was actually saved in the database
          const backendCompleted = updatedFile.completed === true;

          // Update store with response from backend
          updateFileInStore(id, {
            completed: backendCompleted,
            completed_at: updatedFile.completed_at,
            updated_at: updatedFile.updated_at,
          });

          return;
        } catch (error: unknown) {}
      } else {
      }
    },
    []
  );

  const handleAddItem = useCallback(
    async (itemData: CreateFileDto) => {
      // Create directly in API - no temporary files
      try {
        console.log("[handleAddItem] Creating item:", itemData);
        const { fileService } = await import("@/lib/services/fileService");
        const { getNextOrderIndex, addOptimisticFile } =
          useWorkspaceStore.getState();

        const parentId = itemData.parent_id || null;
        const nextOrderIndex = getNextOrderIndex(workspaceId, parentId);

        // Generate ID on frontend for optimistic update
        const fileId = crypto.randomUUID();

        // Create optimistic file object for immediate UI update
        const optimisticFile: import("@/lib/types").File = {
          id: fileId,
          workspace_id: workspaceId,
          type: itemData.type,
          title: itemData.title,
          content: itemData.content,
          youtube_url: itemData.youtube_url,
          parent_id: itemData.parent_id || null,
          order_index: nextOrderIndex,
          active: itemData.active !== false,
          created_at: new Date().toISOString(),
        };

        // Add file to store immediately for optimistic update
        addOptimisticFile(optimisticFile);

        // Create file in API with the ID generated on frontend
        const createdFile = await fileService.create(workspaceId, {
          id: fileId,
          ...itemData,
          parent_id: itemData.parent_id || undefined,
          order_index: nextOrderIndex,
        } as CreateFileDto & { id: string });

        console.log("[handleAddItem] File created:", createdFile);

        // Sync files to refresh all data and ensure consistency
        const { syncFiles } = useWorkspaceStore.getState();
        if (!useWorkspaceStore.getState().isSyncing) {
          console.log("[handleAddItem] Syncing files...");
          await syncFiles();
          console.log("[handleAddItem] Files synced");
        }

        // Navigate to the parent folder to show the new file
        setCurrentFolderId(itemData.parent_id || null);
      } catch (error) {
        console.error("[handleAddItem] Error creating item:", error);
        // On error, remove the optimistic file from store
        // The sync will restore the correct state
      }
    },
    [workspaceId, setCurrentFolderId]
  );

  // Update handleAddItemRef when handleAddItem is defined
  useEffect(() => {
    handleAddItemRef.current = handleAddItem;
  }, [handleAddItem]);

  // Helper function to add optimistic item to items list
  const addOptimisticItemToContext = useCallback(
    (
      optimisticItem: HierarchicalFile,
      itemsList: HierarchicalFile[],
      allPendingItems?: Map<
        string,
        { item: HierarchicalFile; data: CreateFileDto }
      >
    ): HierarchicalFile[] => {
      // First check if item already exists (to avoid duplicates)
      const existingItem = findItemById(itemsList, optimisticItem.id);
      if (existingItem) {
        return itemsList; // Item already exists, don't add again
      }

      if (optimisticItem.parent_id) {
        // Find parent and add as child
        const findAndAddChild = (
          itemsList: HierarchicalFile[]
        ): HierarchicalFile[] => {
          return itemsList.map((item) => {
            if (item.id === optimisticItem.parent_id) {
              // Check if child already exists in parent's children
              const childExists = (item.children || []).some(
                (child) => child.id === optimisticItem.id
              );
              if (childExists) {
                return item; // Child already exists, don't add again
              }
              return {
                ...item,
                children: [...(item.children || []), optimisticItem],
              };
            }
            if (item.children) {
              return {
                ...item,
                children: findAndAddChild(item.children),
              };
            }
            return item;
          });
        };
        const result = findAndAddChild(itemsList);

        // If parent not found, check if it's a pending item
        const parentFound = findItemById(result, optimisticItem.parent_id);
        if (!parentFound && allPendingItems?.has(optimisticItem.parent_id)) {
          // Parent is also pending, add to root for now
          // But first check if item is already in root
          const alreadyInRoot = itemsList.some(
            (item) => item.id === optimisticItem.id
          );
          if (alreadyInRoot) {
            return itemsList;
          }
          return [...itemsList, optimisticItem];
        }

        if (!parentFound) {
          // Parent not found, add to root
          // But first check if item is already in root
          const alreadyInRoot = itemsList.some(
            (item) => item.id === optimisticItem.id
          );
          if (alreadyInRoot) {
            return itemsList;
          }
          return [...itemsList, optimisticItem];
        }

        return result;
      } else {
        // Add to root - but check if already exists
        const alreadyInRoot = itemsList.some(
          (item) => item.id === optimisticItem.id
        );
        if (alreadyInRoot) {
          return itemsList;
        }
        return [...itemsList, optimisticItem];
      }
    },
    []
  );

  // Don't render until mounted to avoid hydration mismatch
  // This ensures server and client render the same initial state
  if (!isMounted) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        suppressHydrationWarning
      >
        <p className="text-foreground/60">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <HomeContent
        currentView={currentView}
        currentFolderId={currentFolderId}
        selectedItem={selectedItem}
        handleFolderClick={handleFolderClick}
        handleItemClick={handleItemClick}
        handleCloseEditor={handleCloseEditor}
        handleBack={handleBack}
        handleNavigateToWorkspaceRoot={handleNavigateToWorkspaceRoot}
        handleItemUpdate={handleItemUpdate}
        handleItemComplete={handleItemComplete}
        handleAddItem={handleAddItem}
        handleItemDelete={handleItemDelete}
        handleItemDeleteBatch={handleItemDeleteBatch}
        files={files}
        workspaceId={workspaceId}
        loading={loading}
        pendingItems={pendingItems}
        setPendingItems={setPendingItems}
        workspacesItems={workspacesItems}
      />
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        workspaceId={workspaceId}
      />
      {/* Add Item Icons and Search Hint - appears when user types */}
      {!isSearchOpen &&
        currentView === "explorer" &&
        !(selectedItem && selectedItem.type === "note") && (
          <div className="fixed bottom-6 right-6 z-10 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex flex-col gap-3">
              {/* Add Item Icons */}
              <div className="flex items-center justify-evenly gap-2 p-2 rounded-xl bg-background/80 backdrop-blur-sm">
                {/* Folder Icon */}
                <button
                  onClick={() => {
                    handleAddItem({
                      type: "folder",
                      title: "Nova Pasta",
                      parent_id: currentFolderId || undefined,
                    });
                  }}
                  className="p-2 rounded-lg transition-all hover:scale-110 flex flex-col items-center justify-center gap-5  "
                  title="Adicionar Pasta"
                  style={{ color: "#a78bfa" }}
                >
                  <FolderIcon size={32} />
                  <kbd className="px-2.5 py-1 rounded-lg text-sm text-foreground/70 font-semibold bg-foreground/5">
                    {isMac ? "Cmd" : "Ctrl"} + F
                  </kbd>
                </button>

                {/* Note Icon */}
                <button
                  onClick={() => {
                    handleAddItem({
                      type: "note",
                      title: "Novo Bloco de Notas",
                      parent_id: currentFolderId || undefined,
                    });
                  }}
                  className="p-2 rounded-lg transition-all hover:scale-110 flex flex-col items-center justify-center gap-5"
                  title="Adicionar Bloco de Notas"
                  style={{ color: "#60a5fa" }}
                >
                  <NoteIcon size={32} />
                  <kbd className="px-2.5 py-1 rounded-lg text-sm text-foreground/70 font-semibold bg-foreground/5">
                    {isMac ? "Cmd" : "Ctrl"} + Y
                  </kbd>
                </button>
                {/* Video Icon - opens YouTube modal */}
                <button
                  onClick={() => {
                    setShowYouTubeModal(true);
                  }}
                  className="p-2 rounded-lg transition-all hover:scale-110 flex flex-col items-center justify-center gap-5"
                  title="Adicionar Vídeo"
                  style={{ color: "#f87171" }}
                >
                  <VideoIcon size={32} />
                  <kbd className="px-2.5 py-1 rounded-lg text-sm text-foreground/70 font-semibold bg-foreground/5">
                    {isMac ? "Cmd" : "Ctrl"} + L
                  </kbd>
                </button>
              </div>
              {/* Search Hint */}
              <div className="p-2.5 rounded-xl flex items-center justify-center gap-2 text-foreground bg-background/80 backdrop-blur-sm">
                <span className="text-sm font-medium">Pressione</span>
                <kbd className="px-2.5 py-1 rounded-lg text-sm text-foreground/70 font-semibold bg-foreground/5">
                  {isMac ? "Cmd" : "Ctrl"} + K
                </kbd>
                <span className="text-sm font-medium">para buscar</span>
              </div>
            </div>
          </div>
        )}
      {/* YouTube URL Modal */}
      {showYouTubeModal && (
        <YouTubeUrlModal
          onConfirm={async (url: string) => {
            await handleAddItem({
              type: "video",
              title: "Novo Vídeo",
              youtube_url: url,
              parent_id: currentFolderId || undefined,
            });
            setShowYouTubeModal(false);
          }}
          onCancel={() => {
            setShowYouTubeModal(false);
          }}
        />
      )}
    </>
  );
}

// YouTube URL Modal Component
interface YouTubeUrlModalProps {
  onConfirm: (url: string) => void;
  onCancel: () => void;
}

function YouTubeUrlModal({ onConfirm, onCancel }: YouTubeUrlModalProps) {
  const [url, setUrl] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      inputRef.current?.focus();
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleCancel = useCallback(() => {
    setIsMounted(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleCancel]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUrl = (url || "").trim();
    if (!trimmedUrl) return;
    onConfirm(trimmedUrl);
    handleCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (typeof window === "undefined") return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        opacity: isMounted ? 1 : 0,
        transition: "opacity 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
        style={{
          transform: isMounted ? "scale(1)" : "scale(0.95)",
          opacity: isMounted ? 1 : 0,
          transition: "all 0.2s ease-out",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Inserir Vídeo do YouTube
          </h3>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground/60 hover:text-foreground"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="youtube-url-input"
              className="block text-sm font-medium text-foreground/70 mb-2"
            >
              URL do YouTube
            </label>
            <input
              ref={inputRef}
              id="youtube-url-input"
              type="url"
              value={url || ""}
              onChange={(e) => setUrl(e.target.value || "")}
              placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCancel();
                }
              }}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function HomeContent({
  currentView,
  currentFolderId,
  selectedItem,
  handleFolderClick,
  handleItemClick,
  handleCloseEditor,
  handleBack,
  handleNavigateToWorkspaceRoot,
  handleItemUpdate,
  handleItemComplete,
  handleAddItem,
  handleItemDelete,
  handleItemDeleteBatch,
  files,
  workspaceId,
  loading,
  pendingItems,
  setPendingItems,
  workspacesItems,
}: {
  currentView: "explorer" | "settings" | "trash" | "social" | "planner" | "ai";
  currentFolderId: string | null;
  selectedItem: HierarchicalFile | null;
  handleFolderClick: (folderId: string) => void;
  handleItemClick: (item: HierarchicalFile) => void;
  handleCloseEditor: () => void;
  handleBack: () => void;
  handleNavigateToWorkspaceRoot: () => void;
  handleItemUpdate: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  handleItemComplete: (id: string, completed: boolean) => void;
  handleAddItem: (item: CreateFileDto) => void;
  handleItemDelete: (id: string) => void;
  handleItemDeleteBatch: (ids: string[]) => void;
  files: HierarchicalFile[];
  workspaceId: string;
  loading: boolean;
  pendingItems: Map<string, { item: HierarchicalFile; data: CreateFileDto }>;
  setPendingItems: React.Dispatch<
    React.SetStateAction<
      Map<string, { item: HierarchicalFile; data: CreateFileDto }>
    >
  >;
  workspacesItems: Workspace[];
}) {
  // Use Zustand store instead of React Query
  const { getFilesByWorkspace } = useWorkspaceData();
  const workspaceFiles = getFilesByWorkspace(workspaceId);
  const itemsContextData = useMemo(
    () => buildHierarchy(workspaceFiles),
    [workspaceFiles]
  );
  // Create a mutable object for optimistic updates (similar to React Query's data)
  const itemsContext = useMemo(
    () => ({ data: itemsContextData }),
    [itemsContextData]
  );

  // Use handlers directly - Zustand handles optimistic updates
  const wrappedHandleItemUpdate = handleItemUpdate;
  const wrappedHandleItemComplete = handleItemComplete;
  const wrappedHandleItemDelete = handleItemDelete;
  const wrappedHandleItemDeleteBatch = handleItemDeleteBatch;

  // Create stable key for pending items to avoid unnecessary recalculations
  // Use size and keys string as dependencies since Map itself isn't tracked
  const pendingItemsKeysString = Array.from(pendingItems.keys())
    .sort()
    .join(",");
  const pendingItemsKey = useMemo(
    () => `${pendingItems.size}-${pendingItemsKeysString}`,
    [pendingItems.size, pendingItemsKeysString]
  );

  // Create a stable key from context items to detect changes
  const contextItemsKey = useMemo(() => {
    if (!itemsContext?.data) return null;
    return JSON.stringify(itemsContext.data || []);
  }, [itemsContext?.data]);

  // Calculate merged files (backend files + optimistic items)
  const mergedFiles = useMemo(() => {
    // Start with files from backend
    let result = [...files];

    // Apply optimistic updates from context if available
    // This ensures that renames and other updates are immediately visible
    if (itemsContext?.data) {
      const updateItemFromContext = (
        list: HierarchicalFile[],
        contextItems: HierarchicalFile[]
      ): HierarchicalFile[] => {
        return list.map((item) => {
          // Find matching item in context (by ID) - recursively searches all levels
          const contextItem = findItemById(contextItems, item.id);
          if (contextItem && contextItem.id === item.id) {
            // Merge children: use context children if they exist, otherwise use backend children
            const mergedChildren =
              contextItem.children && contextItem.children.length > 0
                ? updateItemFromContext(contextItem.children, contextItems)
                : item.children
                ? updateItemFromContext(item.children, contextItems)
                : undefined;

            // Always use context version if it exists (has optimistic updates)
            return {
              ...contextItem,
              children: mergedChildren,
            };
          }
          // Recursively update children even if this item wasn't found in context
          if (item.children) {
            return {
              ...item,
              children: updateItemFromContext(item.children, contextItems),
            };
          }
          return item;
        });
      };

      result = updateItemFromContext(result, itemsContext.data);
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, itemsContext?.data, contextItemsKey, pendingItemsKey]);

  // Remove synchronized items from pendingItems when they appear in backend
  useEffect(() => {
    if (pendingItems.size === 0) return;

    const itemsToRemove: string[] = [];

    pendingItems.forEach(({ item: optimisticItem }, tempId) => {
      // Check if a real item with matching parent_id and title exists in backend
      // Use the current title from optimisticItem (which may have been renamed)
      const currentTitle = optimisticItem.title;

      // Normalize parent_id for comparison (both null and undefined should match)
      const optimisticParentId = optimisticItem.parent_id || null;

      const realItem = files.find((item) => {
        const itemParentId = item.parent_id || null;
        return (
          itemParentId === optimisticParentId &&
          item.type === optimisticItem.type &&
          item.title === currentTitle
        );
      });

      if (realItem) {
        // Item was synchronized, remove from pendingItems
        itemsToRemove.push(tempId);
      }
    });

    if (itemsToRemove.length > 0) {
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        itemsToRemove.forEach((id) => {
          newMap.delete(id);
        });
        if (newMap.size !== prev.size) {
        }
        return newMap;
      });
    }
  }, [files, pendingItems, setPendingItems]);

  // Sync merged items with context (only when they actually change)
  // But don't overwrite optimistic updates that are already in context
  const prevMergedItemsRef = useRef<HierarchicalFile[]>([]);
  useEffect(() => {
    if (!itemsContext) {
      return;
    }

    // Compare by IDs, titles, and content to detect changes
    // This function recursively collects all item data including children
    const getAllItemData = (items: HierarchicalFile[]): string => {
      return items
        .map((item) => {
          const childrenData = item.children
            ? getAllItemData(item.children)
            : "";
          return `${item.id}:${item.title}:${
            item.content || ""
          }:${childrenData}`;
        })
        .join("|");
    };

    const prevData = getAllItemData(prevMergedItemsRef.current);
    const currentData = getAllItemData(mergedFiles);

    // Only update context if mergedItems actually changed
    // But check if context already has optimistic updates that we should preserve
    if (prevData !== currentData) {
      // Check if context has newer updates than mergedFiles
      const contextHasUpdates = itemsContext.data?.some((contextItem) => {
        const mergedItem = findItemById(mergedFiles, contextItem.id);
        if (!mergedItem) return false;
        // If context item has different title/content, it has optimistic updates
        const hasUpdate =
          contextItem.title !== mergedItem.title ||
          contextItem.content !== mergedItem.content;

        return hasUpdate;
      });

      // Only update if context doesn't have newer optimistic updates
      if (!contextHasUpdates) {
        prevMergedItemsRef.current = mergedFiles;
        itemsContext.data = mergedFiles;
      }
    }
  }, [itemsContext, mergedFiles]);

  return (
    <div
      className="flex h-screen overflow-hidden relative bg-background"
      style={{ backgroundColor: "var(--background)" }}
      suppressHydrationWarning
    >
      {/* Glassmorphism background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-background"
        style={{
          backdropFilter: "blur(50px) saturate(180%)",
          WebkitBackdropFilter: "blur(50px) saturate(180%)",
        }}
        suppressHydrationWarning
      />

      {/* Sidebar */}
      <SimpleSidebar currentView={currentView} workspaceId={workspaceId} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {currentView === "explorer" ? (
          selectedItem && selectedItem.type === "note" ? (
            <div className="h-full flex flex-col">
              {/* Header with back button and title */}
              <div className="flex items-center gap-4 p-4 border-b border-border">
                <button
                  onClick={handleCloseEditor}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-foreground/5 transition-colors text-sm text-foreground/70 hover:text-foreground"
                >
                  <ArrowLeft size={18} />
                  Voltar
                </button>
                <input
                  type="text"
                  value={selectedItem.title}
                  onChange={(e) => {
                    handleItemUpdate(selectedItem.id, "title", e.target.value);
                  }}
                  className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-foreground/40"
                  placeholder="Sem título"
                />
              </div>
              {/* Notion Block Editor - Centered */}
              <div className="flex-1 overflow-auto">
                <div className="w-full max-w-4xl mx-auto px-8 py-12">
                  <NotionBlockEditor
                    content={selectedItem.content || ""}
                    onSave={(content) => {
                      handleItemUpdate(selectedItem.id, "content", content);
                    }}
                    placeholder="Pressione '/' para comandos"
                    autoFocus={pendingItems.has(selectedItem.id)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <ExplorerWorkspace
              currentFolderId={currentFolderId || undefined}
              onFolderClick={handleFolderClick}
              onItemClick={handleItemClick}
              files={files}
              onBack={currentFolderId ? handleBack : undefined}
              onNavigateToWorkspaceRoot={handleNavigateToWorkspaceRoot}
              onAddItem={handleAddItem}
              onItemUpdate={wrappedHandleItemUpdate}
              onItemComplete={wrappedHandleItemComplete}
              onItemDelete={wrappedHandleItemDelete}
              onItemDeleteBatch={wrappedHandleItemDeleteBatch}
              loading={loading}
              pendingItems={pendingItems}
            />
          )
        ) : currentView === "trash" ? (
          <TrashWorkspace
            topicId={workspaceId}
            onRestore={() => {
              // React Query will automatically refetch
            }}
            onPermanentDelete={() => {
              // React Query will automatically refetch
            }}
          />
        ) : currentView === "social" ? (
          <SocialWorkspace />
        ) : currentView === "planner" ? (
          <PlannerWorkspace workspaceId={workspaceId} />
        ) : currentView === "ai" ? (
          <AIWorkspace workspaceId={workspaceId} />
        ) : (
          <SettingsWorkspace />
        )}
      </main>
    </div>
  );
}

function findItemById(
  files: HierarchicalFile[],
  id: string
): HierarchicalFile | null {
  for (const item of files) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
