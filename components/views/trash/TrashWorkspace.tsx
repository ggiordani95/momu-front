"use client";

import { Folder } from "lucide-react";
import { useMemo } from "react";
import FileCard from "../../files/FileCard";
import FolderSkeleton from "../../files/FolderSkeleton";
import { useTrashItems } from "@/lib/hooks/querys/useTrash";
import {
  useRestoreItem,
  usePermanentDeleteItem,
} from "@/lib/hooks/querys/useItems";
import {
  getPendingOperations,
  removePendingOperation,
} from "@/lib/services/offlineSync";
import { useWorkspaceItems } from "@/lib/hooks/querys/useItems";
import type { HierarchicalItem } from "@/lib/types";

interface TrashWorkspaceProps {
  topicId: string;
  onRestore?: () => void;
  onPermanentDelete?: (id: string) => void;
  hasSynced?: boolean;
}

export function TrashWorkspace({
  topicId,
  onRestore,
  onPermanentDelete,
  hasSynced,
}: TrashWorkspaceProps) {
  // React Query hooks
  const { data: trashItems = [], isLoading: trashLoading } = useTrashItems(
    topicId,
    {
      enabled: hasSynced !== false,
    }
  );
  const { data: workspaceItems = [] } = useWorkspaceItems(topicId, {
    enabled: hasSynced !== false,
  });

  // Use workspace items
  const actualWorkspaceItems = useMemo(() => {
    return workspaceItems;
  }, [workspaceItems]);

  const loading = trashLoading;
  const restoreItemMutation = useRestoreItem(topicId);
  const permanentDeleteMutation = usePermanentDeleteItem(topicId);

  // Get DELETE operations from localStorage that haven't been synced yet
  const pendingDeletes = useMemo(() => {
    const operations = getPendingOperations(topicId);
    const deleteOps = operations.filter((op) => op.type === "DELETE");

    // Find the items that were deleted locally but not yet synced
    const deletedItems: HierarchicalItem[] = [];
    deleteOps.forEach((op) => {
      if (op.type === "DELETE") {
        // Find the item in workspaceItems (before it was deleted)
        // We need to flatten the hierarchy to find the item
        const findItemInHierarchy = (
          items: HierarchicalItem[],
          id: string
        ): HierarchicalItem | null => {
          for (const item of items) {
            if (item.id === id) {
              return item;
            }
            if (item.children) {
              const found = findItemInHierarchy(item.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const item = findItemInHierarchy(actualWorkspaceItems, op.id);
        if (item) {
          deletedItems.push(item);
        }
      }
    });

    return deletedItems;
  }, [topicId, actualWorkspaceItems]);

  const handleRestore = async (id: string) => {
    try {
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

  // Merge backend trash items with locally deleted items (not yet synced)
  // Remove duplicates (if an item is in both, prefer backend version)
  const allTrashItems = useMemo(() => {
    const backendIds = new Set(trashItems.map((item) => item.id));
    const localOnly = pendingDeletes.filter((item) => !backendIds.has(item.id));
    return [...trashItems, ...localOnly];
  }, [trashItems, pendingDeletes]);

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
                  file={item as HierarchicalItem}
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
