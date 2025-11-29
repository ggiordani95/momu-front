"use client";

import { Folder } from "lucide-react";
import FileCard from "../../files/FileCard";
import FolderSkeleton from "../../files/FolderSkeleton";
import { useTrashItems } from "@/lib/hooks/querys/useTrash";
import {
  useRestoreItem,
  usePermanentDeleteItem,
} from "@/lib/hooks/querys/useItems";
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
  const { data: trashItems = [], isLoading: loading } = useTrashItems(topicId, {
    enabled: hasSynced !== false,
  });
  const restoreItemMutation = useRestoreItem(topicId);
  const permanentDeleteMutation = usePermanentDeleteItem(topicId);

  const handleRestore = async (id: string) => {
    try {
      await restoreItemMutation.mutateAsync(id);
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error("Error restoring item:", error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este item?")) {
      return;
    }

    try {
      await permanentDeleteMutation.mutateAsync(id);
      if (onPermanentDelete) {
        onPermanentDelete(id);
      }
    } catch (error) {
      console.error("Error permanently deleting item:", error);
    }
  };

  // Sort items by order_index (same as FileExplorer)
  const sortedItems = [...trashItems].sort(
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
