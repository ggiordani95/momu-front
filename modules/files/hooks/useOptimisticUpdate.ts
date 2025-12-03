import type { HierarchicalFile } from "@/lib/types";

interface ApplyOptimisticUpdateParams {
  items: HierarchicalFile[];
  itemsContext: {
    items: HierarchicalFile[];
    setItems: (items: HierarchicalFile[]) => void;
  } | null;
  currentFolderId: string | null;
  reorderedItems: HierarchicalFile[];
}

/**
 * Função utilitária para atualização otimista do estado local
 */
export function applyOptimisticUpdate({
  items,
  itemsContext,
  currentFolderId,
  reorderedItems,
}: ApplyOptimisticUpdateParams) {
  if (!itemsContext) return;

  // Create a map of original items by ID for preserving full item data
  const originalItemsMap = new Map<string, HierarchicalFile>();
  const buildItemsMap = (itemsList: HierarchicalFile[]) => {
    itemsList.forEach((item) => {
      originalItemsMap.set(item.id, item);
      if (item.children) {
        buildItemsMap(item.children);
      }
    });
  };
  buildItemsMap(items);

  const updateItemsRecursive = (
    itemsList: HierarchicalFile[]
  ): HierarchicalFile[] => {
    // If we're at the root level and currentFolderId is null, update root items
    if (!currentFolderId) {
      // Get root items that are NOT being reordered (they have parent_id or are not in reordered list)
      const reorderedItemIds = new Set(reorderedItems.map((item) => item.id));
      const otherRootItems = itemsList.filter(
        (item) => !item.parent_id && !reorderedItemIds.has(item.id)
      );

      // Build updated root items: reordered items first (with full data from original), then others
      const updatedReorderedItems = reorderedItems.map((reorderedItem) => {
        const originalItem = originalItemsMap.get(reorderedItem.id);
        if (originalItem) {
          return {
            ...originalItem,
            order_index: reorderedItem.order_index,
          };
        }
        return reorderedItem;
      });

      // Get nested items (with parent_id) and update their children recursively
      const nestedItems = itemsList
        .filter((item) => item.parent_id)
        .map((item) => {
          if (item.children) {
            return {
              ...item,
              children: updateItemsRecursive(item.children),
            };
          }
          return item;
        });

      // Return: reordered root items + other root items + nested items
      return [...updatedReorderedItems, ...otherRootItems, ...nestedItems];
    }

    // If we're inside a folder, update that folder's children
    return itemsList.map((item) => {
      if (item.id === currentFolderId) {
        // Replace children with reordered items (preserving full item data)
        const updatedChildren = reorderedItems.map((reorderedItem) => {
          const originalChild = originalItemsMap.get(reorderedItem.id);
          if (originalChild) {
            return {
              ...originalChild,
              order_index: reorderedItem.order_index,
            };
          }
          return reorderedItem;
        });

        return {
          ...item,
          children: updatedChildren,
        };
      }
      if (item.children) {
        return { ...item, children: updateItemsRecursive(item.children) };
      }
      return item;
    });
  };

  const updatedItems = updateItemsRecursive(items);
  itemsContext.setItems(updatedItems);
}
