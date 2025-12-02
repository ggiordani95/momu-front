"use client";

import { Folder } from "lucide-react";
import { useMemo, useEffect, useCallback } from "react";
import FileCard from "../../files/FileCard";
import FolderSkeleton from "../../files/FolderSkeleton";
import {
  useRestoreItem,
  usePermanentDeleteItem,
} from "@/lib/hooks/querys/useFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import type { HierarchicalFile } from "@/lib/types";
import { useMultiSelect } from "@/lib/hooks/useMultiSelect";

interface TrashWorkspaceProps {
  topicId: string;
  onRestore?: () => void;
  onPermanentDelete?: (id: string) => void;
}

export function TrashWorkspace({
  topicId,
  onRestore,
  onPermanentDelete,
}: TrashWorkspaceProps) {
  // Use Zustand store - use getDeletedFilesByWorkspace for better performance
  // This ensures we get files with active === false
  const { getDeletedFilesByWorkspace, files } = useWorkspaceStore();
  const deletedFiles = useMemo(() => {
    // Use the getter function which filters by workspace and active === false
    const filtered = getDeletedFilesByWorkspace(topicId);
    console.log("[TrashWorkspace] Deleted files:", {
      workspaceId: topicId,
      totalFilesInStore: files.length,
      deletedFilesCount: filtered.length,
      deletedFileIds: filtered.map((f) => f.id),
      allFilesInWorkspace: files.filter((f) => f.workspace_id === topicId)
        .length,
      activeFilesInWorkspace: files.filter(
        (f) => f.workspace_id === topicId && f.active !== false
      ).length,
    });
    return filtered;
  }, [getDeletedFilesByWorkspace, topicId, files]);

  const { isSyncing } = useWorkspaceStore();
  const loading = isSyncing;
  const restoreItemMutation = useRestoreItem(topicId);
  const permanentDeleteMutation = usePermanentDeleteItem(topicId);

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      try {
        // Check if file exists in store before trying to delete
        const { files, removeFilePermanently } = useWorkspaceStore.getState();
        const fileExists = files.some((f) => f.id === id);

        if (!fileExists) {
          console.warn(
            `⚠️ File ${id} not found in store, may have already been deleted`
          );
          return;
        }

        // Optimistically remove file from Zustand store immediately
        removeFilePermanently(id);

        // Call API to permanently delete from database
        const { fileService } = await import("@/lib/services/fileService");
        try {
          await fileService.permanentDelete(id);
        } catch (apiError: unknown) {
          // If file not found, it may have already been deleted - restore in store
          const isNotFound =
            (apiError instanceof Error &&
              apiError.message?.includes("not found")) ||
            (apiError &&
              typeof apiError === "object" &&
              "status" in apiError &&
              (apiError as { status?: number }).status === 404);

          if (isNotFound) {
            // File already deleted, restore it in store (it was removed optimistically)
            const { markFileAsRestored } = useWorkspaceStore.getState();
            markFileAsRestored(id);
            return;
          }
          // Re-throw other errors - restore file in store on error
          const { markFileAsRestored } = useWorkspaceStore.getState();
          markFileAsRestored(id);
          throw apiError;
        }

        // Also call mutation for React Query cache invalidation
        await permanentDeleteMutation.mutateAsync(id);

        if (onPermanentDelete) {
          onPermanentDelete(id);
        }
      } catch (error) {
        console.error("Error permanently deleting item:", error);
        // On error, restore file in store (it was removed optimistically)
        const { markFileAsRestored } = useWorkspaceStore.getState();
        markFileAsRestored(id);
      }
    },
    [permanentDeleteMutation, onPermanentDelete]
  );

  const handlePermanentDeleteBatch = useCallback(async (ids: string[]) => {
    try {
      // Filter out files that don't exist in store
      const { files, removeFilePermanently, markFileAsRestored } =
        useWorkspaceStore.getState();
      const existingIds = ids.filter((id) => files.some((f) => f.id === id));

      if (existingIds.length === 0) {
        console.warn(`⚠️ No files found in store to delete`);
        return;
      }

      // Optimistically remove files from Zustand store immediately
      existingIds.forEach((id) => removeFilePermanently(id));

      // Call API to permanently delete from database
      const { fileService } = await import("@/lib/services/fileService");
      try {
        const result = await fileService.permanentDeleteBatch(existingIds);

        if (result.success) {
        } else {
          throw new Error("Permanent delete batch failed");
        }
      } catch (apiError: unknown) {
        // If some files not found, that's okay - they may have already been deleted
        const isNotFound =
          (apiError instanceof Error &&
            apiError.message?.includes("not found")) ||
          (apiError &&
            typeof apiError === "object" &&
            "status" in apiError &&
            (apiError as { status?: number }).status === 404);

        if (isNotFound) {
          return;
        }
        // On error, restore files in store (they were removed optimistically)
        existingIds.forEach((id) => markFileAsRestored(id));
        throw apiError;
      }
    } catch (error) {
      console.error("Error permanently deleting items:", error);
      // On error, restore files in store (they were removed optimistically)
      const { markFileAsRestored } = useWorkspaceStore.getState();
      ids.forEach((id) => markFileAsRestored(id));
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

  const handleRestore = async (id: string) => {
    try {
      // Optimistically mark file as restored in Zustand store
      const { markFileAsRestored } = useWorkspaceStore.getState();
      markFileAsRestored(id);

      await restoreItemMutation.mutateAsync(id);
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error("Error restoring item:", error);
    }
  };

  // Use deleted files directly from Zustand store
  const allTrashItems = useMemo(() => {
    return deletedFiles.map((file) => ({
      ...file,
      children: [],
    })) as HierarchicalFile[];
  }, [deletedFiles]);

  // Sort items by order_index (same as FileExplorer)
  const sortedItems = [...allTrashItems].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  return (
    <div className="h-full flex flex-col">
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
