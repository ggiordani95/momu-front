"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useWorkspaceItems } from "@/lib/hooks/querys/useItems";
import type { HierarchicalItem, CreateItemDto } from "@/lib/types";
import { ItemsProvider, useItems } from "@/lib/contexts/ItemsContext";
import SimpleSidebar from "@/components/SimpleSidebar";
import PageEditor from "@/components/editors/PageEditor";
import { TrashWorkspace } from "@/components/views/trash/TrashWorkspace";
import { SettingsWorkspace } from "@/components/views/settings/SettingsWorkspace";
import { ExplorerWorkspace } from "@/components/views/explorer/ExplorerWorkspace";
import { useOfflineSync } from "@/lib/hooks/useOfflineSync";
import { savePendingOperation } from "@/lib/services/offlineSync";
import { SocialWorkspace } from "@/components/views/social/SocialWorkspace";
import { PlannerWorkspace } from "@/components/views/planner/PlannerWorkspace";
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
  const [currentView, setCurrentView] = useState<
    "explorer" | "settings" | "trash" | "social" | "planner"
  >("explorer");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
  


  const [selectedItem, setSelectedItem] = useState<HierarchicalItem | null>(
    null
  );
  const [pendingItems, setPendingItems] = useState<
    Map<string, { item: HierarchicalItem; data: CreateItemDto }>
  >(new Map());
  const previousEditorPathRef = useRef<string | null>(null);

  // Offline sync hook (sincroniza automaticamente em background)
  // Deve executar ANTES de carregar os dados
  const { hasSynced } = useOfflineSync(workspaceId);

  // React Query hooks
  // Só carrega os dados após o sync ter sido executado (pelo menos uma vez)
  const { data: items = [], isLoading: loading } = useWorkspaceItems(
    workspaceId,
    {
      enabled: hasSynced !== false, // Aguarda o sync (hasSynced pode ser true ou undefined inicialmente)
    }
  );
  // Note: Mutations are no longer used directly - operations are saved to localStorage
  // and synced on next page load via useOfflineSync

  const pathKey = pathSegments.join("/");

  useEffect(() => {
    if (!items || items.length === 0) {
      return;
    }

    // Use a microtask to batch state updates and avoid flicker
    Promise.resolve().then(() => {
      if (!pathSegments || pathSegments.length === 0) {
        setCurrentFolderId(null);
        setSelectedItem(null);
        return;
      }

      const lastSegment = pathSegments[pathSegments.length - 1];
      const targetItem = findItemById(items, lastSegment);

      if (!targetItem) {
        setCurrentFolderId(lastSegment);
        setSelectedItem(null);
        return;
      }

      if (targetItem.type === "section") {
        setCurrentFolderId(targetItem.id);
        setSelectedItem((prev) => (prev?.id === targetItem.id ? prev : null));
      } else {
        setSelectedItem(targetItem);
        setCurrentFolderId(targetItem.parent_id || null);
      }
    });
  }, [pathKey, items, pathSegments]);

  const handleFolderClick = (folderId: string) => {
    // Build path to folder (including parent folders)
    const buildPathToFolder = (
      items: HierarchicalItem[],
      targetId: string,
      currentPath: string[] = []
    ): string[] | null => {
      for (const item of items) {
        if (item.id === targetId) {
          return [...currentPath, item.id];
        }
        if (item.children) {
          const found = buildPathToFolder(item.children, targetId, [
            ...currentPath,
            item.id,
          ]);
          if (found) return found;
        }
      }
      return null;
    };

    const pathToFolder = buildPathToFolder(items, folderId);
    if (pathToFolder) {
      const newPath = `/${workspaceId}/${pathToFolder.join("/")}`;
      router.push(newPath);
    } else {
      // Fallback: just use the folder ID
      router.push(`/${workspaceId}/${folderId}`);
    }
    setCurrentFolderId(folderId);
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

  const handleItemClick = (item: HierarchicalItem) => {
    // Handle item click (open page, video, etc.)
    if (item.type === "video" && item.youtube_url) {
      window.open(item.youtube_url, "_blank");
    } else if (item.type === "note" || item.type === "task") {
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

    if (pendingItem) {
      // If updating title of a pending item, update the operation in localStorage
      if (field === "title") {
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
        console.log(`💾 Updated create operation in localStorage:`, id);

        // Item will be created when sync runs on next page load
      } else {
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
      }
      return;
    }

    // For existing items, save to localStorage for offline sync
    // Instead of calling backend immediately
    savePendingOperation({
      type: "UPDATE",
      id,
      workspaceId,
      field,
      value,
      timestamp: Date.now(),
    });
    console.log(`💾 Saved update operation to localStorage:`, {
      id,
      field,
      value,
    });

    // Note: The actual backend sync will happen on next page load
    // For now, we update optimistically in the context (already done above)
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

  const handleItemDelete = async (id: string) => {
    // Save to localStorage for offline sync instead of calling backend immediately
    // Check if it's a pending item (not yet created in backend)
    if (id.startsWith("temp-")) {
      // Just remove from pending items
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      console.log(`🗑️ Removed pending item:`, id);
      return;
    }

    // For existing items, optimistically remove from context first
    // The item will be removed from UI immediately
    // Then save delete operation to localStorage for backend sync
    // Note: The actual removal from context happens in HomeContent via removeOptimisticItem

    // Save delete operation to localStorage
    savePendingOperation({
      type: "DELETE",
      id,
      workspaceId,
      timestamp: Date.now(),
    });
    console.log(`💾 Saved delete operation to localStorage:`, id);

    // Note: The actual backend sync will happen on next page load
    // The UI update happens via removeOptimisticItem in HomeContent
  };

  const handleAddItem = async (itemData: CreateItemDto) => {
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
    ): HierarchicalItem[] => {
      if (parentId === null || parentId === undefined) {
        // Root items - include both backend items and pending items
        const rootBackendItems = items.filter((item) => !item.parent_id);
        const rootPendingItems = Array.from(pendingItems.values())
          .map(({ item }) => item)
          .filter((item) => !item.parent_id);
        return [...rootBackendItems, ...rootPendingItems];
      }

      // Items inside a folder - check both backend items and pending items
      // First check backend items
      const parent = findItemById(items, parentId);
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

    const optimisticItem: HierarchicalItem = {
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

    // Don't open editor automatically - let item appear in list for renaming
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

    // Note: The item will be added to context in HomeContent via useEffect
    // The item will appear in the list and can be renamed inline
  };

  // Helper function to add optimistic item to items list
  const addOptimisticItemToContext = useCallback(
    (
      optimisticItem: HierarchicalItem,
      itemsList: HierarchicalItem[],
      allPendingItems?: Map<
        string,
        { item: HierarchicalItem; data: CreateItemDto }
      >
    ): HierarchicalItem[] => {
      console.log("🔧 addOptimisticItemToContext called", {
        itemId: optimisticItem.id,
        parentId: optimisticItem.parent_id,
        itemsListCount: itemsList.length,
      });

      if (optimisticItem.parent_id) {
        // Find parent and add as child
        const findAndAddChild = (
          itemsList: HierarchicalItem[]
        ): HierarchicalItem[] => {
          return itemsList.map((item) => {
            if (item.id === optimisticItem.parent_id) {
              console.log("✅ Found parent, adding child", {
                parentId: item.id,
                currentChildrenCount: item.children?.length || 0,
              });
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
          console.log(
            "⚠️ Parent is also a pending item, adding to root instead"
          );
          // Parent is also pending, add to root for now
          return [...itemsList, optimisticItem];
        }

        if (!parentFound) {
          console.log("⚠️ Parent not found, adding to root instead");
          // Parent not found, add to root
          return [...itemsList, optimisticItem];
        }

        console.log("🔧 After adding to parent, result count:", result.length);
        return result;
      } else {
        // Add to root
        console.log("✅ Adding to root level");
        const result = [...itemsList, optimisticItem];
        console.log("🔧 After adding to root, result count:", result.length);
        return result;
      }
    },
    []
  );

  // Helper function to remove optimistic item from items list
  const removeOptimisticItemFromContext = (
    itemId: string,
    itemsList: HierarchicalItem[]
  ): HierarchicalItem[] => {
    // Remove both pending (temp-*) and existing items
    const removeFromList = (list: HierarchicalItem[]): HierarchicalItem[] => {
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
  };

  // Helper function to replace optimistic item with real item
  const replaceOptimisticItemInContext = useCallback(
    (
      tempId: string,
      realItem: HierarchicalItem,
      itemsList: HierarchicalItem[]
    ): HierarchicalItem[] => {
      const replaceInList = (list: HierarchicalItem[]): HierarchicalItem[] => {
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
      itemsList: HierarchicalItem[]
    ): HierarchicalItem[] => {
      const updateInList = (list: HierarchicalItem[]): HierarchicalItem[] => {
        return list.map((item) => {
          if (item.id === itemId) {
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
      return updateInList(itemsList);
    },
    []
  );

  return (
    <>
      <ItemsProvider initialItems={items}>
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
          items={items}
          workspaceId={workspaceId}
          loading={loading}
          pendingItems={pendingItems}
          hasSynced={hasSynced}
          addOptimisticItem={addOptimisticItemToContext}
          removeOptimisticItem={removeOptimisticItemFromContext}
          replaceOptimisticItem={replaceOptimisticItemInContext}
          updateItemInContext={updateItemInContext}
        />
        <GlobalSearch 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          workspaceId={workspaceId} 
        />
      </ItemsProvider>
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
  items,
  workspaceId,
  loading,
  pendingItems,
  hasSynced,
  addOptimisticItem,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeOptimisticItem, // Not used directly, but kept for consistency with parent component
  replaceOptimisticItem,
  updateItemInContext,
}: {
  currentView: "explorer" | "settings" | "trash" | "social" | "planner";
  setCurrentView: (view: "explorer" | "settings" | "trash" | "social" | "planner") => void;
  currentFolderId: string | null;
  selectedItem: HierarchicalItem | null;
  handleFolderClick: (folderId: string) => void;
  handleItemClick: (item: HierarchicalItem) => void;
  handleCloseEditor: () => void;
  handleBack: () => void;
  handleItemUpdate: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  handleAddItem: (item: CreateItemDto) => void;
  handleItemDelete: (id: string) => void;
  items: HierarchicalItem[];
  workspaceId: string;
  loading: boolean;
  pendingItems: Map<string, { item: HierarchicalItem; data: CreateItemDto }>;
  hasSynced?: boolean;
  addOptimisticItem: (
    item: HierarchicalItem,
    itemsList: HierarchicalItem[],
    allPendingItems?: Map<
      string,
      { item: HierarchicalItem; data: CreateItemDto }
    >
  ) => HierarchicalItem[];
  removeOptimisticItem: (
    itemId: string,
    itemsList: HierarchicalItem[]
  ) => HierarchicalItem[];
  replaceOptimisticItem: (
    tempId: string,
    realItem: HierarchicalItem,
    itemsList: HierarchicalItem[]
  ) => HierarchicalItem[];
  updateItemInContext: (
    itemId: string,
    field: "title" | "content",
    value: string,
    itemsList: HierarchicalItem[]
  ) => HierarchicalItem[];
}) {
  const itemsContext = useItems();

  // Wrap handleItemUpdate to add optimistic update
  const wrappedHandleItemUpdate = useCallback(
    async (id: string, field: "title" | "content", value: string) => {
      // Optimistically update the item in context (for both pending and existing items)
      if (itemsContext) {
        const updatedItems = updateItemInContext(
          id,
          field,
          value,
          itemsContext.items
        );
        itemsContext.setItems(updatedItems);
      }

      // Call the original handleItemUpdate (saves to localStorage)
      await handleItemUpdate(id, field, value);
    },
    [itemsContext, handleItemUpdate, updateItemInContext]
  );

  // Wrap handleItemDelete to add optimistic removal
  const wrappedHandleItemDelete = useCallback(
    async (id: string) => {
      // Optimistically remove the item from context
      if (itemsContext) {
        const updatedItems = removeOptimisticItem(id, itemsContext.items);
        itemsContext.setItems(updatedItems);
      }

      // Call the original handleItemDelete (saves to localStorage)
      await handleItemDelete(id);
    },
    [itemsContext, handleItemDelete, removeOptimisticItem]
  );

  // Create stable key for pending items to avoid unnecessary recalculations
  // Use size and keys string as dependencies since Map itself isn't tracked
  const pendingItemsKeysString = Array.from(pendingItems.keys())
    .sort()
    .join(",");
  const pendingItemsKey = useMemo(
    () => `${pendingItems.size}-${pendingItemsKeysString}`,
    [pendingItems.size, pendingItemsKeysString]
  );

  // Calculate merged items (backend items + optimistic items)
  const mergedItems = useMemo(() => {
    console.log("🔄 Calculating mergedItems", {
      itemsCount: items.length,
      pendingItemsCount: pendingItems.size,
      pendingItemsKeys: Array.from(pendingItems.keys()),
    });

    // Start with items from backend
    let result = [...items];

    // Process pending items in order: first parents, then children
    // This ensures that when we add a child, its parent already exists in the result
    const pendingItemsArray = Array.from(pendingItems.values());

    // Sort by depth: items without parent_id first, then items with parent_id
    const sortedPendingItems = pendingItemsArray.sort((a, b) => {
      const aHasParent = a.item.parent_id ? 1 : 0;
      const bHasParent = b.item.parent_id ? 1 : 0;
      return aHasParent - bHasParent;
    });

    // Replace optimistic items with real items if they exist in backend
    // (This happens when React Query refetches after creating an item)
    // Use the item from pendingItems to get the latest version with updated children
    sortedPendingItems.forEach(({ item: optimisticItem }) => {
      // Use the item from pendingItems to ensure we have the latest version
      // (including updated children if this is a parent folder)
      const latestItem =
        pendingItems.get(optimisticItem.id)?.item || optimisticItem;
      console.log(
        "🔍 Processing optimistic item:",
        latestItem.id,
        latestItem.title,
        "parent_id:",
        latestItem.parent_id,
        "children count:",
        latestItem.children?.length || 0
      );

      // Check if a real item with matching parent_id and title exists
      // (since we don't know the real ID yet)
      // Only check for real items (not temp-*), and only if the optimistic item has been renamed
      // (i.e., title is not "Novo item")
      const isRenamed = latestItem.title !== "Novo item";
      const realItem = isRenamed
        ? items.find(
            (item) =>
              item.parent_id === latestItem.parent_id &&
              item.type === latestItem.type &&
              item.title === latestItem.title &&
              !item.id.startsWith("temp-")
          )
        : null;

      if (realItem) {
        console.log("✅ Found real item, replacing:", realItem.id);
        // Replace optimistic item with real item
        result = replaceOptimisticItem(latestItem.id, realItem, result);
      } else {
        // Add optimistic item if it doesn't exist yet
        const exists = findItemById(result, latestItem.id);
        if (!exists) {
          console.log("➕ Adding optimistic item to result", {
            itemId: latestItem.id,
            parentId: latestItem.parent_id,
            childrenCount: latestItem.children?.length || 0,
            resultCountBefore: result.length,
            resultRootIds: result.map((i) => i.id),
          });
          const resultBefore = JSON.stringify(result);
          // Use latestItem which has the updated children array
          result = addOptimisticItem(latestItem, result, pendingItems);
          const resultAfter = JSON.stringify(result);
          console.log("➕ After adding, result count:", result.length);
          console.log("➕ Result changed:", resultBefore !== resultAfter);
          console.log(
            "➕ Result items IDs:",
            result.map((i) => i.id)
          );

          // Verify parent's children if this item has a parent
          if (latestItem.parent_id) {
            const parent = findItemById(result, latestItem.parent_id);
            if (parent) {
              console.log(
                "➕ Parent found, children count:",
                parent.children?.length || 0
              );
              console.log(
                "➕ Parent children IDs:",
                parent.children?.map((c) => c.id) || []
              );
            } else {
              console.log("⚠️ Parent not found in result!");
            }
          }
        } else {
          console.log("⚠️ Optimistic item already exists in result");
        }
      }
    });

    console.log("✅ Final mergedItems count:", result.length);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pendingItemsKey, addOptimisticItem, replaceOptimisticItem]);

  // Sync merged items with context (only when they actually change)
  const prevMergedItemsRef = useRef<HierarchicalItem[]>([]);
  useEffect(() => {
    if (!itemsContext) {
      console.log("⚠️ itemsContext is not available");
      return;
    }

    // Compare by IDs and children structure to detect changes
    // This function recursively collects all IDs including children
    const getAllIds = (items: HierarchicalItem[]): string[] => {
      const ids: string[] = [];
      items.forEach((item) => {
        ids.push(item.id);
        if (item.children && item.children.length > 0) {
          ids.push(...getAllIds(item.children));
        }
      });
      return ids;
    };

    const prevIds = getAllIds(prevMergedItemsRef.current).sort().join(",");
    const currentIds = getAllIds(mergedItems).sort().join(",");

    console.log("🔄 Syncing items to context", {
      prevCount: prevMergedItemsRef.current.length,
      currentCount: mergedItems.length,
      prevIdsCount: prevMergedItemsRef.current.length,
      currentIdsCount: mergedItems.length,
      prevAllIdsCount: getAllIds(prevMergedItemsRef.current).length,
      currentAllIdsCount: getAllIds(mergedItems).length,
      changed: prevIds !== currentIds,
    });

    if (prevIds !== currentIds) {
      console.log("✅ Updating context with mergedItems");
      prevMergedItemsRef.current = mergedItems;
      itemsContext.setItems(mergedItems);
      console.log("✅ Context updated, items count:", mergedItems.length);
    } else {
      console.log("⏭️ Skipping context update (no changes)");
    }
  }, [itemsContext, mergedItems]);

  return (
    <div
      className="flex h-screen overflow-hidden relative bg-background"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Glassmorphism background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-background"
        style={{
          backdropFilter: "blur(50px) saturate(180%)",
          WebkitBackdropFilter: "blur(50px) saturate(180%)",
        }}
      />

      {/* Sidebar */}
      <SimpleSidebar
        onNavigate={setCurrentView}
        currentView={currentView}
        workspaceId={workspaceId}
        hasSynced={hasSynced}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {currentView === "explorer" ? (
          selectedItem &&
          (selectedItem.type === "note" || selectedItem.type === "task") ? (
            <PageEditor
              item={selectedItem}
              onBack={handleCloseEditor}
              onUpdate={handleItemUpdate}
              isNew={pendingItems.has(selectedItem.id)}
            />
          ) : (
            <ExplorerWorkspace
              currentFolderId={currentFolderId || undefined}
              onFolderClick={handleFolderClick}
              onItemClick={handleItemClick}
              onBack={currentFolderId ? handleBack : undefined}
              onAddItem={handleAddItem}
              onItemUpdate={wrappedHandleItemUpdate}
              onItemDelete={wrappedHandleItemDelete}
              loading={loading}
              workspaceId={workspaceId}
              pendingItems={pendingItems}
            />
          )
        ) : currentView === "trash" ? (
          <TrashWorkspace
            topicId={workspaceId}
            hasSynced={hasSynced}
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
        ) : (
          <SettingsWorkspace />
        )}
      </main>
    </div>
  );
}

function findItemById(
  items: HierarchicalItem[],
  id: string
): HierarchicalItem | null {
  for (const item of items) {
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
