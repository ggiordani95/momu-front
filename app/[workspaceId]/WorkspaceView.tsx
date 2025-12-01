"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { buildHierarchy } from "@/lib/utils/hierarchy";
import type { HierarchicalFile, CreateFileDto, Workspace } from "@/lib/types";
import SimpleSidebar from "@/components/SimpleSidebar";
import PageEditor from "@/components/editors/PageEditor";
import { TrashWorkspace } from "@/components/views/trash/TrashWorkspace";
import { SettingsWorkspace } from "@/components/views/settings/SettingsWorkspace";
import { ExplorerWorkspace } from "@/components/views/explorer/ExplorerWorkspace";
import {
  savePendingOperation,
  removePendingOperation,
  getPendingOperations,
} from "@/lib/services/offlineSync";
import { SocialWorkspace } from "@/components/views/social/SocialWorkspace";
import { PlannerWorkspace } from "@/components/views/planner/PlannerWorkspace";
import { AIWorkspace } from "@/components/views/ai/AIWorkspace";
import { GlobalSearch } from "@/components/GlobalSearch";

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
  const searchParams = useSearchParams();

  // Get view from URL query params, default to "explorer"
  const viewFromUrl = searchParams.get("view") as
    | "explorer"
    | "settings"
    | "trash"
    | "social"
    | "planner"
    | "ai"
    | null;

  const [currentView, setCurrentView] = useState<
    "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  >(viewFromUrl || "explorer");

  // Update view when URL changes (only on mount or when view param changes)
  useEffect(() => {
    if (viewFromUrl && viewFromUrl !== currentView) {
      setCurrentView(viewFromUrl);
    } else if (!viewFromUrl && currentView !== "explorer") {
      // If no view param and we're not on explorer, reset to explorer
      // This handles the case when navigating to workspace root
      setCurrentView("explorer");
    }
  }, [viewFromUrl, currentView]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Track if component is mounted to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state after component mounts (client-side only)
  useEffect(() => {
    // Use a state update function to avoid synchronous setState in effect
    setTimeout(() => {
      setIsMounted(true);
    }, 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [selectedItem, setSelectedItem] = useState<HierarchicalFile | null>(
    null
  );
  const [pendingItems, setPendingItems] = useState<
    Map<string, { item: HierarchicalFile; data: CreateFileDto }>
  >(new Map());
  const previousEditorPathRef = useRef<string | null>(null);

  // Use Zustand store for global state management

  // Use Zustand store instead of React Query
  // Only access store data after component is mounted to avoid hydration mismatch
  // Subscribe directly to files array to react to changes when markFileAsDeleted is called
  const { workspaces, files: allFiles } = useWorkspaceStore();
  const { isSyncing } = useWorkspaceStore();

  // Filter files by workspace and active status
  // This will automatically re-render when files array changes (e.g., when markFileAsDeleted updates it)
  const workspaceFiles = useMemo(() => {
    if (!isMounted) return [];
    return allFiles.filter(
      (file) => file.workspace_id === workspaceId && file.active !== false
    );
  }, [allFiles, workspaceId, isMounted]);
  const files = useMemo(() => buildHierarchy(workspaceFiles), [workspaceFiles]);
  const loading = isMounted ? isSyncing : true; // Show loading on server
  const itemsError = null;
  const workspacesItems = isMounted ? workspaces : []; // Empty array on server

  useEffect(() => {
    // Se não estiver carregando, não houver items, e não houver erro, verificar se o workspace existe
    if (
      !loading &&
      files.length === 0 &&
      !itemsError &&
      workspacesItems.length > 0
    ) {
      const workspaceExists = workspacesItems.some((f) => f.id === workspaceId);
      if (!workspaceExists) {
        console.warn(
          `⚠️ Workspace ${workspaceId} não existe, redirecionando para o primeiro workspace disponível`
        );
        const firstWorkspaceId = workspacesItems[0]?.id;
        if (firstWorkspaceId) {
          router.replace(`/${firstWorkspaceId}`);
        }
      }
    }
  }, [loading, files.length, itemsError, workspaceId, workspacesItems, router]);
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

    // First try to find the folder in the files tree
    const pathToFolder = buildPathToFolder(files, folderId);
    if (pathToFolder) {
      const newPath = `/${workspaceId}/${pathToFolder.join("/")}`;
      // Use replace instead of push to avoid adding to history and reduce flicker
      router.replace(newPath);
    } else {
      // Fallback: check if folder exists at all (even if empty)
      const folderExists = findItemById(files, folderId);
      if (folderExists) {
        // Folder exists but path building failed, try to build path from parent
        const parentId = folderExists.parent_id;
        if (parentId) {
          const parentPath = buildPathToFolder(files, parentId);
          if (parentPath) {
            const newPath = `/${workspaceId}/${[...parentPath, folderId].join(
              "/"
            )}`;
            router.replace(newPath);
          } else {
            // Just use parent and folder
            router.replace(`/${workspaceId}/${parentId}/${folderId}`);
          }
        } else {
          // Root level folder
          router.replace(`/${workspaceId}/${folderId}`);
        }
      } else {
        // Folder not found, but navigate anyway (might be a new folder)
        router.replace(`/${workspaceId}/${folderId}`);
      }
    }
    // Don't set currentFolderId here - let the useEffect handle it based on pathSegments
    // This prevents double state updates and flicker
  };

  const getBasePathWithoutEditor = () => {
    const trimmed =
      pathname !== "/" && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
    const segments = trimmed.split("/").filter(Boolean);

    if (selectedItem && segments[segments.length - 1] === selectedItem.id) {
      segments.pop();
    }

    if (segments.length === 0) {
      return "/";
    }

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
      // Open page for editing
      setSelectedItem(item);
      setCurrentFolderId(item.parent_id || null);

      const basePath = getBasePathWithoutEditor();
      previousEditorPathRef.current = basePath;
      const nextPath = appendSegment(basePath, item.id);
      router.push(nextPath);
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
      router.push(previousPath);
      previousEditorPathRef.current = null;
      return;
    }

    const trimmed =
      pathname !== "/" && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
    const segments = trimmed.split("/").filter(Boolean);
    if (segments.length > 0) {
      segments.pop();
      const fallbackPath = segments.length
        ? `/${segments.join("/")}`
        : `/${workspaceId}`;
      router.push(fallbackPath);
    }
  };

  const handleItemUpdate = async (
    id: string,
    field: "title" | "content",
    value: string
  ) => {
    // Check if this is a pending item (not yet created in backend)
    const pendingItem = pendingItems.get(id);
    const isTemporaryItem = id.startsWith("temp-");

    if (pendingItem || isTemporaryItem) {
      // Update Zustand store optimistically (so UI updates immediately)
      const { updateFileInStore } = useWorkspaceStore.getState();
      updateFileInStore(id, { [field]: value });

      // If updating title of a pending item, update the operation in localStorage
      if (field === "title" && pendingItem) {
        // If parent_id is a temporary ID, check if parent was already created
        // If not, create item without parent_id (at root level)
        let parentId: string | undefined = pendingItem.data.parent_id;
        if (parentId && parentId.startsWith("temp-")) {
          // Check if parent was already created in backend
          const parentPending = pendingItems.get(parentId);
          if (parentPending) {
            // Parent is still pending, create item at root level for now
            console.log(
              "⚠️ Parent is still pending, creating item at root level"
            );
            parentId = undefined;
          } else {
            // Parent should exist in backend, but we don't know its real ID
            // For now, create at root level
            console.log(
              "⚠️ Parent was pending but not found, creating item at root level"
            );
            parentId = undefined;
          }
        }

        // Update the pending item data with the new title
        setPendingItems((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(id);
          if (existing) {
            newMap.set(id, {
              ...existing,
              data: { ...existing.data, title: value, parent_id: parentId },
              item: { ...existing.item, title: value },
            });
          }
          return newMap;
        });

        // Update the operation in localStorage
        savePendingOperation({
          type: "CREATE",
          id: id, // Keep the same temp ID
          workspaceId,
          data: {
            ...pendingItem.data,
            title: value,
            parent_id: parentId || null,
          },
          timestamp: Date.now(),
        });

        // Trigger sync immediately if online (don't wait for next page load)
        const isOnline = typeof navigator !== "undefined" && navigator.onLine;
        if (isOnline) {
          // Use dynamic imports to avoid circular dependencies
          Promise.all([
            import("@/lib/services/fileService"),
            import("@/lib/services/offlineSync"),
            import("@/lib/stores/workspaceStore"),
          ]).then(
            ([
              { fileService },
              { getPendingOperations, clearPendingOperations },
              { useWorkspaceStore },
            ]) => {
              // Get pending operations and sync them
              const operations = getPendingOperations();
              if (operations.length > 0) {
                fileService
                  .syncBatch(operations)
                  .then((result) => {
                    if (result.success && result.failed === 0) {
                      const storeState = useWorkspaceStore.getState();

                      // Update temporary IDs in Zustand store with real IDs
                      if (
                        result.tempIdMap &&
                        Object.keys(result.tempIdMap).length > 0
                      ) {
                        const updatedFiles = storeState.files.map((file) => {
                          const realId = result.tempIdMap?.[file.id];
                          if (realId) {
                            console.log(
                              `🔄 [UPDATE] Updating temp ID ${file.id} -> ${realId} in store`
                            );
                            return { ...file, id: realId };
                          }
                          return file;
                        });
                        // Update files in store with real IDs
                        storeState.setFiles(updatedFiles);

                        // Also update pendingItems to use real IDs
                        setPendingItems((prev) => {
                          const newMap = new Map();
                          prev.forEach((value, key) => {
                            const realId = result.tempIdMap?.[key];
                            if (realId) {
                              newMap.set(realId, {
                                ...value,
                                item: { ...value.item, id: realId },
                              });
                            } else {
                              newMap.set(key, value);
                            }
                          });
                          return newMap;
                        });
                      }

                      clearPendingOperations();

                      // Trigger sync-files to refresh all data (this will get the real IDs from backend)
                      if (!storeState.isSyncing) {
                        storeState.syncFiles().then(() => {
                          console.log(
                            `✅ [UPDATE] File synced successfully: ${id} -> ${
                              result.tempIdMap?.[id] || "unknown"
                            }`
                          );
                        });
                      } else {
                        console.log(
                          `✅ [UPDATE] File synced successfully: ${id} -> ${
                            result.tempIdMap?.[id] || "unknown"
                          }`
                        );
                      }
                    } else {
                      console.warn(
                        `⚠️ [UPDATE] Some operations failed: ${result.failed} failed, ${result.synced} synced`
                      );
                    }
                  })
                  .catch((error) => {
                    console.error(`❌ [UPDATE] Failed to sync file:`, error);
                  });
              }
            }
          );
        }
      } else if (pendingItem) {
        // For content updates on pending items, just update the pending data
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

        // Also save UPDATE operation for content changes
        savePendingOperation({
          type: "UPDATE",
          id,
          workspaceId,
          field,
          value,
          timestamp: Date.now(),
        });
      } else if (isTemporaryItem) {
        // Item is temporary but not in pendingItems (shouldn't happen, but handle it)
        // Just save UPDATE operation
        savePendingOperation({
          type: "UPDATE",
          id,
          workspaceId,
          field,
          value,
          timestamp: Date.now(),
        });
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

        // Remove any pending UPDATE operation for this file from localStorage
        // For UPDATE operations, we need to find and remove them manually
        // since removePendingOperation expects the full operation ID format
        const pendingOps = getPendingOperations();
        const updateOpsToRemove = pendingOps.filter(
          (op) => op.type === "UPDATE" && op.id === id && op.field === field
        );

        if (updateOpsToRemove.length > 0) {
          // Remove each UPDATE operation using its full operation ID
          updateOpsToRemove.forEach((op) => {
            const operationId = `UPDATE-${op.id}-${op.timestamp}`;
            removePendingOperation(operationId);
          });
        }

        console.log(
          `✅ [UPDATE] File updated in backend: ${id} ${field} = "${value}"`
        );
        return;
      } catch (error) {
        console.error(
          `❌ [UPDATE] Failed to update in backend, saving to localStorage:`,
          error
        );
        // Fall through to save in localStorage as fallback
      }
    }

    // Save to localStorage for offline sync or as fallback
    savePendingOperation({
      type: "UPDATE",
      id,
      workspaceId,
      field,
      value,
      timestamp: Date.now(),
    });
    console.log(
      `💾 [UPDATE] Saved to localStorage for sync: ${id} ${field} = "${value}"`
    );
  };

  const handleBack = () => {
    // Go up one level in the path
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length > 2) {
      // Remove last folder from path
      pathParts.pop();
      const newPath = `/${pathParts.join("/")}`;
      router.push(newPath);
    } else {
      // Go to workspace root
      router.push(`/${workspaceId}`);
      setCurrentFolderId(null);
    }
  };

  const handleItemDeleteBatch = async (ids: string[]) => {
    console.log(
      "🗑️ [WorkspaceView] handleItemDeleteBatch called with ids:",
      ids
    );

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
      console.warn("⚠️ No active files found to delete");
      return;
    }

    const fileIdsToDelete = filesToDelete.map((f) => f.id);
    const tempIds = fileIdsToDelete.filter((id) => id.startsWith("temp-"));

    // Handle temporary items (not yet created in backend)
    if (tempIds.length > 0) {
      tempIds.forEach((id) => {
        // Remove from pending items state
        setPendingItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });

        // Also remove the CREATE operation from localStorage
        removePendingOperation(id);
        console.log(`🗑️ Removed pending item and CREATE operation:`, id);
      });
    }

    // Filter out temp IDs - only delete real files
    const realFileIds = fileIdsToDelete.filter((id) => !id.startsWith("temp-"));

    if (realFileIds.length === 0) {
      console.log("ℹ️ Only temporary items to delete, skipping API call");
      return;
    }

    // Mark all files as deleted in the store at once (optimistic update)
    markFilesAsDeleted(fileIdsToDelete);
    console.log(
      `✅ [Delete] Updated Zustand store for ${fileIdsToDelete.length} files`
    );

    // Check if online to call API immediately
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;

    if (isOnline) {
      try {
        // Call API to delete all files at once
        const { fileService } = await import("@/lib/services/fileService");
        const result = await fileService.deleteBatch(realFileIds);

        if (result.success) {
          console.log(
            `✅ [Delete Batch] Successfully deleted ${result.deleted} file(s) via API`
          );

          // Remove DELETE operations from localStorage since they were synced
          realFileIds.forEach((id) => {
            const pendingOps = getPendingOperations();
            const deleteOps = pendingOps.filter(
              (op) => op.type === "DELETE" && op.id === id
            );
            deleteOps.forEach((op) => {
              const operationId = `DELETE-${op.id}-${op.timestamp}`;
              removePendingOperation(operationId);
            });
          });

          // Sync files to get latest state from backend
          const { syncFiles } = useWorkspaceStore.getState();
          if (!useWorkspaceStore.getState().isSyncing) {
            await syncFiles();
          }
        } else {
          throw new Error("Delete batch failed");
        }
      } catch (error) {
        console.error(
          `❌ [Delete Batch] Failed to delete via API, saving to localStorage:`,
          error
        );

        // Fallback: save to localStorage for offline sync
        realFileIds.forEach((id) => {
          const pendingOps = getPendingOperations();
          const alreadyDeleted = pendingOps.some(
            (op) => op.type === "DELETE" && op.id === id
          );

          if (!alreadyDeleted) {
            savePendingOperation({
              type: "DELETE",
              id,
              workspaceId,
              timestamp: Date.now(),
            });
            console.log(`💾 Saved delete operation to localStorage:`, id);
          }
        });
      }
    } else {
      // Offline: save to localStorage for sync
      realFileIds.forEach((id) => {
        const pendingOps = getPendingOperations();
        const alreadyDeleted = pendingOps.some(
          (op) => op.type === "DELETE" && op.id === id
        );

        if (!alreadyDeleted) {
          savePendingOperation({
            type: "DELETE",
            id,
            workspaceId,
            timestamp: Date.now(),
          });
          console.log(`💾 Saved delete operation to localStorage:`, id);
        }
      });
    }
  };

  const handleItemDelete = async (id: string) => {
    console.log("🗑️ [WorkspaceView] handleItemDelete called with id:", id);

    // Always get the latest state from the store to avoid race conditions
    // This is especially important when deleting multiple files at once
    const { files, markFileAsDeleted } = useWorkspaceStore.getState();
    const file = files.find(
      (f) => f.id === id && f.workspace_id === workspaceId
    );

    if (file && file.active === false) {
      console.warn(
        `⚠️ Item ${id} is already deleted (active = false), skipping duplicate delete`
      );
      return;
    }

    // If item exists and is still active, mark it as deleted in the store first
    // This ensures the UI updates immediately
    if (file && file.active !== false) {
      markFileAsDeleted(id);
      console.log(`✅ [Delete] Updated Zustand store for file: ${id}`);
    } else if (!file) {
      // File not found in store - might be a pending item or already deleted
      console.warn(
        `⚠️ File ${id} not found in store, checking if it's pending...`
      );
    }

    // Then check if there's already a DELETE operation pending in localStorage
    // Get fresh state to avoid race conditions
    const pendingOps = getPendingOperations();
    const alreadyDeleted = pendingOps.some(
      (op) => op.type === "DELETE" && op.id === id
    );

    if (alreadyDeleted) {
      console.log(
        `ℹ️ Item ${id} already has DELETE operation in localStorage, UI updated`
      );
      return;
    }

    // Check if it's a pending item (not yet created in backend)
    if (id.startsWith("temp-")) {
      // Remove from pending items state
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      // Also remove the CREATE operation from localStorage
      // This prevents the item from being created when syncing
      removePendingOperation(id);
      console.log(`🗑️ Removed pending item and CREATE operation:`, id);
      return;
    }

    // Only save delete operation if file exists in store
    // This prevents creating delete operations for files that don't exist
    if (file) {
      // Save delete operation to localStorage for backend sync
      // (markFileAsDeleted was already called above if the file exists)
      savePendingOperation({
        type: "DELETE",
        id,
        workspaceId,
        timestamp: Date.now(),
      });
      console.log(`💾 Saved delete operation to localStorage:`, id);
    } else {
      console.warn(
        `⚠️ File ${id} not found in store, skipping delete operation save`
      );
    }

    // Note: The actual backend sync will happen on next page load
    // The UI update happens via removeOptimisticItem in HomeContent
  };

  const handleAddItem = async (itemData: CreateFileDto) => {
    // For all items (including videos), save to localStorage for offline sync
    // Videos will also be saved to localStorage and synced on next page load

    // For non-video items, create optimistically and open editor
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Calculate the next order_index for this parent_id
    // Find all items with the same parent_id (or root items if parent_id is null)
    // This function needs to check both backend items and pending items
    const getItemsForParent = (
      parentId: string | null | undefined
    ): HierarchicalFile[] => {
      if (parentId === null || parentId === undefined) {
        // Root files - include both backend files and pending items
        const rootBackendFiles = files.filter((file) => !file.parent_id);
        const rootPendingItems = Array.from(pendingItems.values())
          .map(({ item }) => item)
          .filter((item) => !item.parent_id);
        return [...rootBackendFiles, ...rootPendingItems];
      }

      // Files inside a folder - check both backend files and pending items
      // First check backend files
      const parent = findItemById(files, parentId);
      if (parent) {
        return parent.children || [];
      }

      // If not found in backend, check pending items
      const pendingParent = pendingItems.get(parentId);
      if (pendingParent) {
        return pendingParent.item.children || [];
      }

      // If parent is not found at all, return empty array
      // This can happen if parent is a temporary item that hasn't been added to pendingItems yet
      return [];
    };

    const siblingItems = getItemsForParent(itemData.parent_id);
    // Also include pending items with the same parent_id
    const pendingSiblings = Array.from(pendingItems.values())
      .map(({ item }) => item)
      .filter((item) => {
        if (itemData.parent_id === null || itemData.parent_id === undefined) {
          return !item.parent_id;
        }
        return item.parent_id === itemData.parent_id;
      });

    // Get max order_index from both existing and pending items
    const allSiblings = [...siblingItems, ...pendingSiblings];
    const maxOrderIndex =
      allSiblings.length > 0
        ? Math.max(...allSiblings.map((item) => item.order_index || 0))
        : -1;
    const nextOrderIndex = maxOrderIndex + 1;

    const optimisticItem: HierarchicalFile = {
      id: tempId,
      workspace_id: workspaceId,
      parent_id: itemData.parent_id || null,
      type: itemData.type,
      title: itemData.title || "Novo item",
      content: itemData.content || undefined,
      youtube_id: undefined,
      youtube_url: undefined,
      order_index: nextOrderIndex,
      active: true,
      created_at: new Date().toISOString(),
      children: [],
    };

    // Add optimistically to Zustand store
    // HierarchicalFile extends File, so we can pass it directly
    // The store will only use the File properties (children is ignored)
    const { addOptimisticFile } = useWorkspaceStore.getState();
    // Extract only File properties (exclude children)
    const fileForStore: import("@/lib/types").File = {
      id: optimisticItem.id,
      workspace_id: optimisticItem.workspace_id,
      type: optimisticItem.type,
      title: optimisticItem.title,
      content: optimisticItem.content,
      youtube_id: optimisticItem.youtube_id,
      youtube_url: optimisticItem.youtube_url,
      parent_id: optimisticItem.parent_id,
      order_index: optimisticItem.order_index,
      active: optimisticItem.active,
      created_at: optimisticItem.created_at,
      updated_at: optimisticItem.updated_at,
    };
    addOptimisticFile(fileForStore);

    // Add to pending items
    setPendingItems((prev) => {
      const newMap = new Map(prev);
      newMap.set(tempId, { item: optimisticItem, data: itemData });

      // If this item has a parent_id, update the parent's children array
      if (itemData.parent_id) {
        const parentPending = newMap.get(itemData.parent_id);
        if (parentPending) {
          // Parent is also a pending item, update its children
          const updatedParent = {
            ...parentPending.item,
            children: [...(parentPending.item.children || []), optimisticItem],
          };
          newMap.set(itemData.parent_id, {
            ...parentPending,
            item: updatedParent,
          });
          console.log(
            `✅ Updated parent ${itemData.parent_id} children:`,
            updatedParent.children.length
          );
        }
      }

      return newMap;
    });

    // Don't open editor automaticamente - deixa aparecer na lista pra renomear
    setCurrentFolderId(itemData.parent_id || null);

    // Save CREATE operation to localStorage for offline sync
    savePendingOperation({
      type: "CREATE",
      id: tempId,
      workspaceId,
      data: {
        ...itemData,
        parent_id: itemData.parent_id || null,
        order_index: nextOrderIndex,
      },
      timestamp: Date.now(),
    });
    console.log(`💾 Saved create operation to localStorage:`, tempId);

    console.log(`📝 Created optimistic item:`, optimisticItem);

    // Trigger sync immediately if online (don't wait for next page load)
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;
    if (isOnline) {
      // Use dynamic imports to avoid circular dependencies
      Promise.all([
        import("@/lib/services/fileService"),
        import("@/lib/services/offlineSync"),
        import("@/lib/stores/workspaceStore"),
      ]).then(
        ([
          { fileService },
          { getPendingOperations, clearPendingOperations },
          { useWorkspaceStore },
        ]) => {
          // Get pending operations and sync them
          const operations = getPendingOperations();
          if (operations.length > 0) {
            fileService
              .syncBatch(operations)
              .then((result) => {
                if (result.success && result.failed === 0) {
                  const storeState = useWorkspaceStore.getState();

                  // Update temporary IDs in Zustand store with real IDs
                  if (
                    result.tempIdMap &&
                    Object.keys(result.tempIdMap).length > 0
                  ) {
                    const updatedFiles = storeState.files.map((file) => {
                      const realId = result.tempIdMap?.[file.id];
                      if (realId) {
                        console.log(
                          `🔄 [CREATE] Updating temp ID ${file.id} -> ${realId} in store`
                        );
                        return { ...file, id: realId };
                      }
                      return file;
                    });
                    // Update files in store with real IDs
                    storeState.setFiles(updatedFiles);

                    // Also update pendingItems to use real IDs
                    setPendingItems((prev) => {
                      const newMap = new Map();
                      prev.forEach((value, key) => {
                        const realId = result.tempIdMap?.[key];
                        if (realId) {
                          newMap.set(realId, {
                            ...value,
                            item: { ...value.item, id: realId },
                          });
                        } else {
                          newMap.set(key, value);
                        }
                      });
                      return newMap;
                    });
                  }

                  clearPendingOperations();

                  // Trigger sync-files to refresh all data (this will get the real IDs from backend)
                  if (!storeState.isSyncing) {
                    storeState.syncFiles().then(() => {
                      console.log(
                        `✅ [CREATE] File synced successfully: ${tempId} -> ${
                          result.tempIdMap?.[tempId] || "unknown"
                        }`
                      );
                    });
                  } else {
                    console.log(
                      `✅ [CREATE] File synced successfully: ${tempId} -> ${
                        result.tempIdMap?.[tempId] || "unknown"
                      }`
                    );
                  }
                } else {
                  console.warn(
                    `⚠️ [CREATE] Some operations failed: ${result.failed} failed, ${result.synced} synced`
                  );
                }
              })
              .catch((error) => {
                console.error(`❌ [CREATE] Failed to sync file:`, error);
              });
          }
        }
      );
    }

    // Note: The item will be added to context in HomeContent via useEffect
    // The item will appear in the list and can be renamed inline
  };

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

  // Helper function to remove optimistic item from items list
  const removeOptimisticItemFromContext = useCallback(
    (itemId: string, itemsList: HierarchicalFile[]): HierarchicalFile[] => {
      // Remove both pending (temp-*) and existing items
      const removeFromList = (list: HierarchicalFile[]): HierarchicalFile[] => {
        return list
          .filter((item) => item.id !== itemId)
          .map((item) => {
            if (item.children) {
              return {
                ...item,
                children: removeFromList(item.children),
              };
            }
            return item;
          });
      };

      return removeFromList(itemsList);
    },
    []
  );

  // Helper function to replace optimistic item with real item
  const replaceOptimisticItemInContext = useCallback(
    (
      tempId: string,
      realItem: HierarchicalFile,
      itemsList: HierarchicalFile[]
    ): HierarchicalFile[] => {
      const replaceInList = (list: HierarchicalFile[]): HierarchicalFile[] => {
        return list.map((item) => {
          if (item.id === tempId) {
            return realItem;
          }
          if (item.children) {
            return {
              ...item,
              children: replaceInList(item.children),
            };
          }
          return item;
        });
      };

      return replaceInList(itemsList);
    },
    []
  );

  // Helper function to update an item in the items list
  const updateItemInContext = useCallback(
    (
      itemId: string,
      field: "title" | "content",
      value: string,
      itemsList: HierarchicalFile[]
    ): HierarchicalFile[] => {
      console.log(
        `🔧 [updateItemInContext] Updating ${itemId} ${field} = "${value}"`
      );
      const updateInList = (list: HierarchicalFile[]): HierarchicalFile[] => {
        return list.map((item) => {
          if (item.id === itemId) {
            console.log(
              `🔧 [updateItemInContext] Found item to update: ${item.id} "${item.title}" -> "${value}"`
            );
            return { ...item, [field]: value };
          }
          if (item.children) {
            return {
              ...item,
              children: updateInList(item.children),
            };
          }
          return item;
        });
      };
      const result = updateInList(itemsList);
      const updatedItem = findItemById(result, itemId);
      console.log(
        `🔧 [updateItemInContext] Result:`,
        updatedItem
          ? { id: updatedItem.id, title: updatedItem.title }
          : "NOT FOUND"
      );
      return result;
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
        setCurrentView={setCurrentView}
        currentFolderId={currentFolderId}
        selectedItem={selectedItem}
        handleFolderClick={handleFolderClick}
        handleItemClick={handleItemClick}
        handleCloseEditor={handleCloseEditor}
        handleBack={handleBack}
        handleItemUpdate={handleItemUpdate}
        handleAddItem={handleAddItem}
        handleItemDelete={handleItemDelete}
        handleItemDeleteBatch={handleItemDeleteBatch}
        files={files}
        workspaceId={workspaceId}
        loading={loading}
        pendingItems={pendingItems}
        setPendingItems={setPendingItems}
        workspacesItems={workspacesItems}
        router={router}
      />
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        workspaceId={workspaceId}
      />
    </>
  );
}

function HomeContent({
  currentView,
  setCurrentView,
  currentFolderId,
  selectedItem,
  handleFolderClick,
  handleItemClick,
  handleCloseEditor,
  handleBack,
  handleItemUpdate,
  handleAddItem,
  handleItemDelete,
  handleItemDeleteBatch,
  files,
  workspaceId,
  loading,
  pendingItems,
  setPendingItems,
  workspacesItems,
  router,
}: {
  currentView: "explorer" | "settings" | "trash" | "social" | "planner" | "ai";
  setCurrentView: (
    view: "explorer" | "settings" | "trash" | "social" | "planner" | "ai"
  ) => void;
  currentFolderId: string | null;
  selectedItem: HierarchicalFile | null;
  handleFolderClick: (folderId: string) => void;
  handleItemClick: (item: HierarchicalFile) => void;
  handleCloseEditor: () => void;
  handleBack: () => void;
  handleItemUpdate: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
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
  router: ReturnType<typeof useRouter>;
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
            // Check if context has different values (optimistic update)
            const hasUpdate =
              contextItem.title !== item.title ||
              contextItem.content !== item.content;
            if (hasUpdate) {
              console.log(
                `🔄 [mergedItems] Applying context update for ${item.id}: "${item.title}" -> "${contextItem.title}"`
              );
            }

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
          item.title === currentTitle &&
          !item.id.startsWith("temp-")
        );
      });

      if (realItem) {
        // Item was synchronized, remove from pendingItems
        itemsToRemove.push(tempId);
        console.log(
          `✅ Found synchronized item: ${realItem.id} matches temp ${tempId} (title: "${currentTitle}", parent: ${optimisticParentId})`
        );
      }
    });

    if (itemsToRemove.length > 0) {
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        itemsToRemove.forEach((id) => {
          newMap.delete(id);
        });
        if (newMap.size !== prev.size) {
          console.log(
            `🧹 Removed ${itemsToRemove.length} synchronized items from pendingItems (${prev.size} -> ${newMap.size})`
          );
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
      console.log(
        `🔄 [SYNC] mergedFiles changed, checking for optimistic updates...`
      );

      // Check if context has newer updates than mergedFiles
      const contextHasUpdates = itemsContext.data?.some((contextItem) => {
        const mergedItem = findItemById(mergedFiles, contextItem.id);
        if (!mergedItem) return false;
        // If context item has different title/content, it has optimistic updates
        const hasUpdate =
          contextItem.title !== mergedItem.title ||
          contextItem.content !== mergedItem.content;
        if (hasUpdate) {
          console.log(
            `🔄 [SYNC] Context has optimistic update for ${contextItem.id}: "${mergedItem.title}" -> "${contextItem.title}"`
          );
        }
        return hasUpdate;
      });

      // Only update if context doesn't have newer optimistic updates
      if (!contextHasUpdates) {
        console.log(
          `✅ [SYNC] No optimistic updates, syncing mergedFiles to context`
        );
        prevMergedItemsRef.current = mergedFiles;
        itemsContext.data = mergedFiles;
      } else {
        console.log(`⏭️ [SYNC] Skipping sync - context has optimistic updates`);
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
      <SimpleSidebar
        onNavigate={(view) => {
          setCurrentView(view);
          // Update URL with view query param
          const newUrl =
            view === "explorer"
              ? `/${workspaceId}`
              : `/${workspaceId}?view=${view}`;
          router.replace(newUrl);
        }}
        currentView={currentView}
        workspaceId={workspaceId}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {currentView === "explorer" ? (
          selectedItem && selectedItem.type === "note" ? (
            <PageEditor
              file={selectedItem}
              onBack={handleCloseEditor}
              onUpdate={handleItemUpdate}
              isNew={pendingItems.has(selectedItem.id)}
            />
          ) : (
            <ExplorerWorkspace
              currentFolderId={currentFolderId || undefined}
              onFolderClick={handleFolderClick}
              onItemClick={handleItemClick}
              files={files}
              onBack={currentFolderId ? handleBack : undefined}
              onAddItem={handleAddItem}
              onItemUpdate={wrappedHandleItemUpdate}
              onItemDelete={wrappedHandleItemDelete}
              onItemDeleteBatch={wrappedHandleItemDeleteBatch}
              loading={loading}
              workspaceId={workspaceId}
              pendingItems={pendingItems}
              workspaces={workspacesItems ?? []}
            />
          )
        ) : currentView === "trash" ? (
          <TrashWorkspace
            topicId={workspaceId}
            workspaces={workspacesItems}
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
