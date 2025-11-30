"use client";

import { Folder } from "lucide-react";
import { useMemo } from "react";
import FileCard from "../../files/FileCard";
import FolderSkeleton from "../../files/FolderSkeleton";
import {
  useRestoreItem,
  usePermanentDeleteItem,
} from "@/lib/hooks/querys/useFiles";
import {
  getPendingOperations,
  removePendingOperation,
} from "@/lib/services/offlineSync";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import type { HierarchicalFile } from "@/lib/types";

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
  // Use Zustand store - filter directly from global JSON
  // Get all files from the store and filter by workspace and active === false
  const { files: allFiles } = useWorkspaceStore();
  const deletedFiles = useMemo(() => {
    // Filter from global JSON: workspace current + active === false
    return allFiles.filter(
      (file) => file.workspace_id === topicId && file.active === false
    );
  }, [allFiles, topicId]);

  const { isSyncing } = useWorkspaceStore();
  const loading = isSyncing;
  const restoreItemMutation = useRestoreItem(topicId);
  const permanentDeleteMutation = usePermanentDeleteItem(topicId);

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

  const handlePermanentDelete = async (id: string) => {
    try {
      await permanentDeleteMutation.mutateAsync(id);
      if (onPermanentDelete) {
        onPermanentDelete(id);
      }
    } catch (error) {
      console.error("Error permanently deleting item:", error);
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

    return Array.from(itemsMap.values());
  }, [deletedFiles, pendingDeletes]);

  // Sort items by order_index (same as FileExplorer)
  const sortedItems = [...allTrashItems].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  return (
    <div className="h-full flex flex-col">
      {/* File Grid - same layout as FileExplorer */}
      <div className="flex-1 overflow-y-auto p-6">
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
                  onClick={() => {}} // Items in trash are not clickable
                  appearanceOrder={index}
                  isTrashView={true}
                  onRestore={() => handleRestore(item.id)}
                  onPermanentDelete={() => handlePermanentDelete(item.id)}
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
