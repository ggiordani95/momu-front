import type { FolderItem, HierarchicalItem } from "@/lib/types";

/**
 * Build hierarchical structure from flat array of items
 */
export function buildHierarchy(items: FolderItem[]): HierarchicalItem[] {
  const itemMap = new Map<string, HierarchicalItem>();
  const rootItems: HierarchicalItem[] = [];

  // First pass: create map
  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build hierarchy
  items.forEach((item) => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        parent.children!.push(node);
      } else {
        // Parent not found, treat as root
        rootItems.push(node);
      }
    } else {
      rootItems.push(node);
    }
  });

  return rootItems;
}

export function findItemById(
  items: HierarchicalItem[],
  id: string
): HierarchicalItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}
