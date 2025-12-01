"use client";

import { Folder } from "lucide-react";
import { useMemo, useEffect, useCallback } from "react";
import FileCard from "../../files/FileCard";
import FolderSkeleton from "../../files/FolderSkeleton";
import Breadcrumb from "../../Breadcrumb";
import {
  useRestoreItem,
  usePermanentDeleteItem,
} from "@/lib/hooks/querys/useFiles";
import {
  getPendingOperations,
  removePendingOperation,
} from "@/lib/services/offlineSync";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import type { HierarchicalFile, Workspace } from "@/lib/types";
import { useMultiSelect } from "@/lib/hooks/useMultiSelect";

interface TrashWorkspaceProps {
  topicId: string;
  onRestore?: () => void;
  onPermanentDelete?: (id: string) => void;
  workspaces?: Workspace[];
}

export function TrashWorkspace({
  topicId,
  onRestore,
  onPermanentDelete,
  workspaces = [],
}: TrashWorkspaceProps) {
  // Use Zustand store - use getDeletedFilesByWorkspace for better performance
  // This ensures we get files with active === false
  const { getDeletedFilesByWorkspace, files: allFiles } = useWorkspaceStore();
  const deletedFiles = useMemo(() => {
    // Use the getter function which filters by workspace and active === false
    const filtered = getDeletedFilesByWorkspace(topicId);
    console.log(`🗑️ [TrashWorkspace] Filtered deleted files:`, {
      topicId,
      totalFiles: allFiles.length,
      deletedFilesCount: filtered.length,
      deletedFileIds: filtered.map((f) => f.id),
      allFilesActiveStatus: allFiles
        .filter((f) => f.workspace_id === topicId)
        .map((f) => ({ id: f.id, active: f.active })),
    });
    return filtered;
  }, [getDeletedFilesByWorkspace, topicId, allFiles]);

  const { isSyncing } = useWorkspaceStore();
  const loading = isSyncing;
  const restoreItemMutation = useRestoreItem(topicId);
  const permanentDeleteMutation = usePermanentDeleteItem(topicId);

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      try {
        // Optimistically remove file from Zustand store immediately
        const { removeFilePermanently } = useWorkspaceStore.getState();
        removeFilePermanently(id);

        // Call API to permanently delete from database
        const { fileService } = await import("@/lib/services/fileService");
        await fileService.permanentDelete(id);

        // Also call mutation for React Query cache invalidation
        await permanentDeleteMutation.mutateAsync(id);

        if (onPermanentDelete) {
          onPermanentDelete(id);
        }

        // Sync files to refresh state from backend
        const { syncFiles } = useWorkspaceStore.getState();
        if (!useWorkspaceStore.getState().isSyncing) {
          await syncFiles();
        }
      } catch (error) {
        console.error("Error permanently deleting item:", error);
        // On error, re-sync to get correct state
        const { syncFiles } = useWorkspaceStore.getState();
        if (!useWorkspaceStore.getState().isSyncing) {
          syncFiles();
        }
      }
    },
    [permanentDeleteMutation, onPermanentDelete]
  );

  const handlePermanentDeleteBatch = useCallback(async (ids: string[]) => {
    try {
      // Optimistically remove files from Zustand store immediately
      const { removeFilePermanently } = useWorkspaceStore.getState();
      ids.forEach((id) => removeFilePermanently(id));

      // Call API to permanently delete from database
      const { fileService } = await import("@/lib/services/fileService");
      const result = await fileService.permanentDeleteBatch(ids);

      if (result.success) {
        console.log(
          `✅ [Permanent Delete Batch] Successfully deleted ${result.deleted} file(s) from database`
        );

        // Sync files to refresh state from backend
        const { syncFiles } = useWorkspaceStore.getState();
        if (!useWorkspaceStore.getState().isSyncing) {
          await syncFiles();
        }
      } else {
        throw new Error("Permanent delete batch failed");
      }
    } catch (error) {
      console.error("Error permanently deleting items:", error);
      // On error, re-sync to get correct state
      const { syncFiles } = useWorkspaceStore.getState();
      if (!useWorkspaceStore.getState().isSyncing) {
        syncFiles();
      }
    }
  }, []);

  // Multi-select functionality
  const {
    selectedIds,
    isSelecting,
    selectionBox,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleFileClick,
    clearSelection,
  } = useMultiSelect();

  // Handle Delete key to permanently delete selected files
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Delete if there are selected files and not typing in an input
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.size > 0 &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Permanently delete all selected files in batch
        const fileIdsArray = Array.from(selectedIds);

        // Use batch delete for better performance
        if (fileIdsArray.length > 1) {
          handlePermanentDeleteBatch(fileIdsArray);
        } else if (fileIdsArray.length === 1) {
          handlePermanentDelete(fileIdsArray[0]);
        }

        // Clear selection after deleting
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedIds,
    clearSelection,
    handlePermanentDelete,
    handlePermanentDeleteBatch,
  ]);

  // Get DELETE operations from localStorage that haven't been synced yet
  // These are items that were deleted but the Zustand store hasn't been updated yet
  const pendingDeletes = useMemo(() => {
    const operations = getPendingOperations(topicId);
    const deleteOps = operations.filter((op) => op.type === "DELETE");

    // Find the items that were deleted locally but not yet in Zustand store
    const deletedItems: HierarchicalFile[] = [];
    const deletedFileIds = new Set(deletedFiles.map((f) => f.id));

    deleteOps.forEach((op) => {
      if (op.type === "DELETE" && !deletedFileIds.has(op.id)) {
        // Item was deleted but not yet in Zustand store
        // Try to find it in all files (including deleted ones) from global JSON
        const file = allFiles.find(
          (f) => f.id === op.id && f.workspace_id === topicId
        );
        if (file) {
          // Create a HierarchicalFile from the File
          deletedItems.push({
            ...file,
            children: [],
          } as HierarchicalFile);
        }
      }
    });

    return deletedItems;
  }, [topicId, deletedFiles, allFiles]);

  const handleRestore = async (id: string) => {
    try {
      // Optimistically mark file as restored in Zustand store
      const { markFileAsRestored } = useWorkspaceStore.getState();
      markFileAsRestored(id);

      // Remove DELETE operation from localStorage if it exists
      // This prevents the item from being deleted again when syncing
      removePendingOperation(id);

      await restoreItemMutation.mutateAsync(id);
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error("Error restoring item:", error);
    }
  };

  // Merge Zustand deleted files (from global JSON) and locally deleted items
  // Remove duplicates using a Map to ensure unique IDs
  const allTrashItems = useMemo(() => {
    const itemsMap = new Map<string, HierarchicalFile>();

    // First, add Zustand deleted files from global JSON (filtered by workspace + active === false)
    // These are the most up-to-date from syncService
    deletedFiles.forEach((file) => {
      itemsMap.set(file.id, {
        ...file,
        children: [],
      } as HierarchicalFile);
    });

    // Then, add local-only items (not yet synced to Zustand)
    // These are items deleted locally but Zustand store hasn't been updated yet
    pendingDeletes.forEach((file) => {
      if (!itemsMap.has(file.id)) {
        itemsMap.set(file.id, file);
      }
    });

    const result = Array.from(itemsMap.values());
    console.log(`🗑️ [TrashWorkspace] allTrashItems calculated:`, {
      deletedFilesCount: deletedFiles.length,
      pendingDeletesCount: pendingDeletes.length,
      totalTrashItems: result.length,
      trashItemIds: result.map((f) => f.id),
    });
    return result;
  }, [deletedFiles, pendingDeletes]);

  // Sort items by order_index (same as FileExplorer)
  const sortedItems = [...allTrashItems].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[]}
        currentFolderId={null}
        onNavigate={() => {}}
        workspaces={workspaces}
        currentWorkspaceId={topicId}
        currentView="trash"
      />
      {/* File Grid - same layout as FileExplorer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Selection Box */}
        {isSelecting && selectionBox && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-50"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
            }}
          />
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,2fr))] gap-6 w-full">
          {loading ? (
            <>
              {/* Loading Skeletons */}
              {[...Array(3)].map((_, i) => (
                <FolderSkeleton key={`trash-skeleton-${i}`} />
              ))}
            </>
          ) : (
            <>
              {/* All items (same as FileExplorer) */}
              {sortedItems.map((item, index) => (
                <FileCard
                  key={item.id}
                  file={item as HierarchicalFile}
                  onClick={(e) => {
                    // Handle multi-select
                    handleFileClick(item.id, e);
                  }}
                  appearanceOrder={index}
                  isTrashView={true}
                  onRestore={() => handleRestore(item.id)}
                  onPermanentDelete={() => handlePermanentDelete(item.id)}
                  isSelected={selectedIds.has(item.id)}
                />
              ))}

              {/* Empty State - same as FileExplorer */}
              {sortedItems.length === 0 && (
                <div className="text-center py-10 text-foreground/40">
                  <Folder size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Lixeira vazia</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
