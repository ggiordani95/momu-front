import type React from "react";
import type { HierarchicalItem } from "../types";
import { findItemById } from "../utils/hierarchy";

interface UseItemReorderProps {
  items: HierarchicalItem[];
  sortedItems: HierarchicalItem[]; // All items together, sorted by order_index
  draggedItemIdRef: React.RefObject<string | null>;
  workspaceId: string;
}

/**
 * Hook para calcular a reordenação de itens
 */
export function useItemReorder({
  items,
  sortedItems,
  draggedItemIdRef,
  workspaceId,
}: UseItemReorderProps) {
  const calculateReorder = (targetItemId: string) => {
    const sourceItemId = draggedItemIdRef.current;
    if (!sourceItemId || sourceItemId === targetItemId || !workspaceId) {
      return null;
    }

    // Find items
    const sourceItem = findItemById(items, sourceItemId);
    const targetItem = findItemById(items, targetItemId);

    if (!sourceItem || !targetItem) {
      return null;
    }

    // Use sortedItems directly (already contains all items in correct order)
    const allDisplayItems = sortedItems;
    const sourceIndex = allDisplayItems.findIndex(
      (item) => item.id === sourceItemId
    );
    const targetIndex = allDisplayItems.findIndex(
      (item) => item.id === targetItemId
    );

    if (sourceIndex === -1 || targetIndex === -1) {
      return null;
    }

    // Reorder items
    const newItems = [...allDisplayItems];
    const [removed] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    // Update order_index for all items in newItems
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    return {
      reorderedItems,
      updates: reorderedItems.map((item, index) => ({
        itemId: item.id,
        orderIndex: index,
      })),
    };
  };

  return { calculateReorder };
}
