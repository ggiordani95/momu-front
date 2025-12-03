import type React from "react";
import type { HierarchicalFile } from "@/lib/types";
import { findFileById } from "../utils/hierarchy";

interface UseItemReorderProps {
  files: HierarchicalFile[];
  sortedFiles: HierarchicalFile[]; // All items together, sorted by order_index
  draggedFileIdRef: React.RefObject<string | null>;
  workspaceId: string;
}

/**
 * Hook para calcular a reordenação de itens
 */
export function useItemReorder({
  files,
  sortedFiles,
  draggedFileIdRef,
  workspaceId,
}: UseItemReorderProps) {
  const calculateReorder = (targetFileId: string) => {
    const sourceFileId = draggedFileIdRef.current;
    if (!sourceFileId || sourceFileId === targetFileId || !workspaceId) {
      return null;
    }

    // Find items
    const sourceFile = findFileById(files, sourceFileId);
    const targetFile = findFileById(files, targetFileId);

    if (!sourceFile || !targetFile) {
      return null;
    }

    // Use sortedItems directly (already contains all items in correct order)
    const allDisplayFiles = sortedFiles;
    const sourceIndex = allDisplayFiles.findIndex(
      (file) => file.id === sourceFileId
    );
    const targetIndex = allDisplayFiles.findIndex(
      (file) => file.id === targetFileId
    );

    if (sourceIndex === -1 || targetIndex === -1) {
      return null;
    }

    // Reorder items
    const newFiles = [...allDisplayFiles];
    const [removed] = newFiles.splice(sourceIndex, 1);
    newFiles.splice(targetIndex, 0, removed);

    // Update order_index for all items in newItems
    const reorderedFiles = newFiles.map((file, index) => ({
      ...file,
      order_index: index,
    }));

    return {
      reorderedFiles,
      updates: reorderedFiles.map((file, index) => ({
        fileId: file.id,
        orderIndex: index,
      })),
    };
  };

  return { calculateReorder };
}
