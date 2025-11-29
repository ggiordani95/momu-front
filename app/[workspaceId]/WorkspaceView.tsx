"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

import {
  useWorkspaceItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
} from "@/lib/hooks/querys/useItems";
import type { HierarchicalItem, CreateItemDto } from "@/lib/types";
import { ItemsProvider, useItems } from "@/lib/contexts/ItemsContext";
import SimpleSidebar from "@/components/SimpleSidebar";
import PageEditor from "@/components/editors/PageEditor";
import { TrashWorkspace } from "@/components/views/trash/TrashWorkspace";
import { SettingsWorkspace } from "@/components/views/settings/SettingsWorkspace";
import { ExplorerWorkspace } from "@/components/views/explorer/ExplorerWorkspace";

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
    "explorer" | "settings" | "trash"
  >("explorer");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HierarchicalItem | null>(
    null
  );
  const [pendingItems, setPendingItems] = useState<
    Map<string, { item: HierarchicalItem; data: CreateItemDto }>
  >(new Map());
  const previousEditorPathRef = useRef<string | null>(null);

  // React Query hooks
  const { data: items = [], isLoading: loading } =
    useWorkspaceItems(workspaceId);
  const createItemMutation = useCreateItem(workspaceId);
  const updateItemMutation = useUpdateItem(workspaceId);
  const deleteItemMutation = useDeleteItem(workspaceId);

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
      // If updating title of a pending item, create it in backend
      if (field === "title") {
        try {
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

          const itemDataToCreate = {
            ...pendingItem.data,
            title: value,
            parent_id: parentId,
          };

          console.log(`📝 Creating pending item in backend:`, itemDataToCreate);

          const newItem = await createItemMutation.mutateAsync(
            itemDataToCreate
          );

          if (!newItem || ("error" in newItem && newItem.error)) {
            const errorMessage =
              "error" in newItem ? newItem.error : "Erro desconhecido";
            console.error("❌ Failed to create pending item:", errorMessage);
            alert(`Erro ao criar item: ${errorMessage}`);
            // Remove from pending and close editor
            setPendingItems((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            handleCloseEditor();
            return;
          }

          // Remove from pending items
          setPendingItems((prev) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });

          // Don't open editor - just create the item
          // The item will appear in the list and React Query will refetch
          console.log(`✅ Pending item created successfully:`, newItem);
        } catch (error) {
          console.error("❌ Error creating pending item:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";
          alert(`Erro ao criar item: ${errorMessage}`);
        }
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

    // For existing items, update in backend
    try {
      await updateItemMutation.mutateAsync({
        itemId: id,
        data: { [field]: value },
      });
    } catch (error) {
      console.error("Error updating item:", error);
    }
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
    // Send to backend (soft delete) - React Query will invalidate and refetch
    try {
      await deleteItemMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleAddItem = async (itemData: CreateItemDto) => {
    // For video, create immediately in backend
    if (itemData.type === "video") {
      try {
        console.log(`📝 Creating video item:`, { ...itemData, workspaceId });
        const newItem = await createItemMutation.mutateAsync(itemData);

        if (!newItem || ("error" in newItem && newItem.error)) {
          const errorMessage =
            "error" in newItem ? newItem.error : "Erro desconhecido";
          console.error("❌ Failed to create item:", errorMessage);
          alert(`Erro ao criar item: ${errorMessage}`);
          return;
        }

        console.log(`✅ Video item created successfully:`, newItem);
      } catch (error) {
        console.error("❌ Error adding item:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";
        alert(`Erro ao criar item: ${errorMessage}`);
      }
      return;
    }

    // For non-video items, create optimistically and open editor
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Calculate the next order_index for this parent_id
    // Find all items with the same parent_id (or root items if parent_id is null)
    const getItemsForParent = (
      parentId: string | null | undefined
    ): HierarchicalItem[] => {
      if (parentId === null || parentId === undefined) {
        // Root items
        return items.filter((item) => !item.parent_id);
      }
      // Items inside a folder
      const parent = findItemById(items, parentId);
      return parent?.children || [];
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
      return newMap;
    });

    // Don't open editor automatically - let item appear in list for renaming
    setCurrentFolderId(itemData.parent_id || null);

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
    if (!itemId.startsWith("temp-")) return itemsList;

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

  return (
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
        addOptimisticItem={addOptimisticItemToContext}
        removeOptimisticItem={removeOptimisticItemFromContext}
        replaceOptimisticItem={replaceOptimisticItemInContext}
      />
    </ItemsProvider>
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
  addOptimisticItem,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeOptimisticItem, // Not used directly, but kept for consistency with parent component
  replaceOptimisticItem,
}: {
  currentView: "explorer" | "settings" | "trash";
  setCurrentView: (view: "explorer" | "settings" | "trash") => void;
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
}) {
  const itemsContext = useItems();

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

    // Replace optimistic items with real items if they exist in backend
    // (This happens when React Query refetches after creating an item)
    pendingItems.forEach(({ item: optimisticItem }) => {
      console.log(
        "🔍 Processing optimistic item:",
        optimisticItem.id,
        optimisticItem.title,
        "parent_id:",
        optimisticItem.parent_id
      );

      // Check if a real item with matching parent_id and title exists
      // (since we don't know the real ID yet)
      const realItem = items.find(
        (item) =>
          item.parent_id === optimisticItem.parent_id &&
          item.type === optimisticItem.type &&
          item.title === optimisticItem.title &&
          !item.id.startsWith("temp-")
      );

      if (realItem) {
        console.log("✅ Found real item, replacing:", realItem.id);
        // Replace optimistic item with real item
        result = replaceOptimisticItem(optimisticItem.id, realItem, result);
      } else {
        // Add optimistic item if it doesn't exist yet
        const exists = findItemById(result, optimisticItem.id);
        if (!exists) {
          console.log("➕ Adding optimistic item to result", {
            itemId: optimisticItem.id,
            parentId: optimisticItem.parent_id,
            resultCountBefore: result.length,
            resultRootIds: result.map((i) => i.id),
          });
          const resultBefore = JSON.stringify(result);
          result = addOptimisticItem(optimisticItem, result, pendingItems);
          const resultAfter = JSON.stringify(result);
          console.log("➕ After adding, result count:", result.length);
          console.log("➕ Result changed:", resultBefore !== resultAfter);
          console.log(
            "➕ Result items IDs:",
            result.map((i) => i.id)
          );

          // If parent_id exists, check if it was added to children
          if (optimisticItem.parent_id) {
            const parent = findItemById(result, optimisticItem.parent_id);
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

    // Compare by IDs to avoid unnecessary updates
    const prevIds = prevMergedItemsRef.current
      .map((i) => i.id)
      .sort()
      .join(",");
    const currentIds = mergedItems
      .map((i) => i.id)
      .sort()
      .join(",");

    console.log("🔄 Syncing items to context", {
      prevCount: prevMergedItemsRef.current.length,
      currentCount: mergedItems.length,
      prevIds: prevIds.substring(0, 100), // Truncate for readability
      currentIds: currentIds.substring(0, 100), // Truncate for readability
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
              currentFolderId={currentFolderId}
              onFolderClick={handleFolderClick}
              onItemClick={handleItemClick}
              onBack={currentFolderId ? handleBack : undefined}
              onAddItem={handleAddItem}
              onItemUpdate={handleItemUpdate}
              onItemDelete={handleItemDelete}
              loading={loading}
              workspaceId={workspaceId}
              pendingItems={pendingItems}
            />
          )
        ) : currentView === "trash" ? (
          <TrashWorkspace
            topicId={workspaceId}
            onRestore={() => {
              // React Query will automatically refetch
            }}
            onPermanentDelete={() => {
              // React Query will automatically refetch
            }}
          />
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
