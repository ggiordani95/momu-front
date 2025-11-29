"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { useRouter, usePathname } from "next/navigation";

import { useWorkspaceItems } from "@/lib/hooks/querys/useItems";
import { useFolders } from "@/lib/hooks/querys/useFolders";
import type { HierarchicalItem, CreateItemDto, Folder } from "@/lib/types";
import { ItemsProvider, useItems } from "@/lib/contexts/ItemsContext";
import SimpleSidebar from "@/components/SimpleSidebar";
import PageEditor from "@/components/editors/PageEditor";
import { TrashWorkspace } from "@/components/views/trash/TrashWorkspace";
import { SettingsWorkspace } from "@/components/views/settings/SettingsWorkspace";
import { ExplorerWorkspace } from "@/components/views/explorer/ExplorerWorkspace";
import { useOfflineSync } from "@/lib/hooks/useOfflineSync";
import {
  savePendingOperation,
  removePendingOperation,
} from "@/lib/services/offlineSync";
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
  const {
    data: items = [],
    isLoading: loading,
    error: itemsError,
  } = useWorkspaceItems(workspaceId, {
    enabled: hasSynced !== false, // Aguarda o sync (hasSynced pode ser true ou undefined inicialmente)
  });

  // Verificar se o workspace existe - se não houver items e não estiver carregando, pode ser que o workspace não exista
  const foldersQuery = useFolders();
  const workspacesItems = useMemo(
    () => foldersQuery.data || [],
    [foldersQuery.data]
  );

  useEffect(() => {
    // Se não estiver carregando, não houver items, e não houver erro, verificar se o workspace existe
    if (
      !loading &&
      items.length === 0 &&
      !itemsError &&
      workspacesItems.length > 0
    ) {
      const workspaceExists = workspacesItems.some((f) => f.id === workspaceId);
      if (!workspaceExists) {
        console.warn(
          `⚠️ Workspace ${workspaceId} não existe, redirecionando para o primeiro workspace disponível`
        );
        const firstWorkspaceId = workspacesItems[0]?.id;
        if (firstWorkspaceId) {
          router.replace(`/${firstWorkspaceId}`);
        }
      }
    }
  }, [loading, items.length, itemsError, workspaceId, workspacesItems, router]);
  // Note: Mutations are no longer used directly - operations are saved to localStorage
  // and synced on next page load via useOfflineSync

  const pathKey = pathSegments.join("/");

  // Use refs to track previous values and avoid unnecessary state updates
  const prevPathKeyRef = useRef<string>("");
  const prevCurrentFolderIdRef = useRef<string | null>(null);
  const prevSelectedItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!items || items.length === 0) {
      return;
    }

    // Skip if path hasn't actually changed
    if (prevPathKeyRef.current === pathKey) {
      return;
    }

    prevPathKeyRef.current = pathKey;

    // Use startTransition to mark state updates as non-urgent
    // This prevents flicker by allowing React to batch updates smoothly
    startTransition(() => {
      if (!pathSegments || pathSegments.length === 0) {
        // Only update if values actually changed
        if (
          prevCurrentFolderIdRef.current !== null ||
          prevSelectedItemIdRef.current !== null
        ) {
          prevCurrentFolderIdRef.current = null;
          prevSelectedItemIdRef.current = null;
          setCurrentFolderId(null);
          setSelectedItem(null);
        }
        return;
      }

      const lastSegment = pathSegments[pathSegments.length - 1];
      const targetItem = findItemById(items, lastSegment);

      if (!targetItem) {
        // Item not found in items tree - might be an empty folder or pending item
        // Still set currentFolderId to allow navigation (the folder might exist but be empty)
        if (prevCurrentFolderIdRef.current !== lastSegment) {
          prevCurrentFolderIdRef.current = lastSegment;
          prevSelectedItemIdRef.current = null;
          setCurrentFolderId(lastSegment);
          setSelectedItem(null);
        }
        return;
      }

      if (targetItem.type === "folder") {
        // Only update if folder ID changed
        if (prevCurrentFolderIdRef.current !== targetItem.id) {
          prevCurrentFolderIdRef.current = targetItem.id;
          setCurrentFolderId(targetItem.id);
        }
        // Only update selectedItem if it changed
        setSelectedItem((prev) => {
          const newValue = prev?.id === targetItem.id ? prev : null;
          if (prevSelectedItemIdRef.current !== (newValue?.id || null)) {
            prevSelectedItemIdRef.current = newValue?.id || null;
            return newValue;
          }
          return prev;
        });
      } else {
        // Only update if item changed
        if (prevSelectedItemIdRef.current !== targetItem.id) {
          prevSelectedItemIdRef.current = targetItem.id;
          setSelectedItem(targetItem);
        }
        // Only update folder ID if it changed
        const newFolderId = targetItem.parent_id || null;
        if (prevCurrentFolderIdRef.current !== newFolderId) {
          prevCurrentFolderIdRef.current = newFolderId;
          setCurrentFolderId(newFolderId);
        }
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
        // Check children even if empty array (for empty folders)
        if (item.children && item.children.length >= 0) {
          const found = buildPathToFolder(item.children, targetId, [
            ...currentPath,
            item.id,
          ]);
          if (found) return found;
        }
      }
      return null;
    };

    // First try to find the folder in the items tree
    const pathToFolder = buildPathToFolder(items, folderId);
    if (pathToFolder) {
      const newPath = `/${workspaceId}/${pathToFolder.join("/")}`;
      // Use replace instead of push to avoid adding to history and reduce flicker
      router.replace(newPath);
    } else {
      // Fallback: check if folder exists at all (even if empty)
      const folderExists = findItemById(items, folderId);
      if (folderExists) {
        // Folder exists but path building failed, try to build path from parent
        const parentId = folderExists.parent_id;
        if (parentId) {
          const parentPath = buildPathToFolder(items, parentId);
          if (parentPath) {
            const newPath = `/${workspaceId}/${[...parentPath, folderId].join(
              "/"
            )}`;
            router.replace(newPath);
          } else {
            // Just use parent and folder
            router.replace(`/${workspaceId}/${parentId}/${folderId}`);
          }
        } else {
          // Root level folder
          router.replace(`/${workspaceId}/${folderId}`);
        }
      } else {
        // Folder not found, but navigate anyway (might be a new folder)
        router.replace(`/${workspaceId}/${folderId}`);
      }
    }
    // Don't set currentFolderId here - let the useEffect handle it based on pathSegments
    // This prevents double state updates and flicker
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
    } else if (item.type === "note") {
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
      // Remove from pending items state
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      // Also remove the CREATE operation from localStorage
      // This prevents the item from being created when syncing
      removePendingOperation(id);
      console.log(`🗑️ Removed pending item and CREATE operation:`, id);
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

    // Don't open editor automaticamente - deixa aparecer na lista pra renomear
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
      // First check if item already exists (to avoid duplicates)
      const existingItem = findItemById(itemsList, optimisticItem.id);
      if (existingItem) {
        return itemsList; // Item already exists, don't add again
      }

      if (optimisticItem.parent_id) {
        // Find parent and add as child
        const findAndAddChild = (
          itemsList: HierarchicalItem[]
        ): HierarchicalItem[] => {
          return itemsList.map((item) => {
            if (item.id === optimisticItem.parent_id) {
              // Check if child already exists in parent's children
              const childExists = (item.children || []).some(
                (child) => child.id === optimisticItem.id
              );
              if (childExists) {
                return item; // Child already exists, don't add again
              }
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
          // Parent is also pending, add to root for now
          // But first check if item is already in root
          const alreadyInRoot = itemsList.some(
            (item) => item.id === optimisticItem.id
          );
          if (alreadyInRoot) {
            return itemsList;
          }
          return [...itemsList, optimisticItem];
        }

        if (!parentFound) {
          // Parent not found, add to root
          // But first check if item is already in root
          const alreadyInRoot = itemsList.some(
            (item) => item.id === optimisticItem.id
          );
          if (alreadyInRoot) {
            return itemsList;
          }
          return [...itemsList, optimisticItem];
        }

        return result;
      } else {
        // Add to root - but check if already exists
        const alreadyInRoot = itemsList.some(
          (item) => item.id === optimisticItem.id
        );
        if (alreadyInRoot) {
          return itemsList;
        }
        return [...itemsList, optimisticItem];
      }
    },
    []
  );

  // Helper function to remove optimistic item from items list
  const removeOptimisticItemFromContext = useCallback(
    (itemId: string, itemsList: HierarchicalItem[]): HierarchicalItem[] => {
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
    },
    []
  );

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
      console.log(
        `🔧 [updateItemInContext] Updating ${itemId} ${field} = "${value}"`
      );
      const updateInList = (list: HierarchicalItem[]): HierarchicalItem[] => {
        return list.map((item) => {
          if (item.id === itemId) {
            console.log(
              `🔧 [updateItemInContext] Found item to update: ${item.id} "${item.title}" -> "${value}"`
            );
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
      const result = updateInList(itemsList);
      const updatedItem = findItemById(result, itemId);
      console.log(
        `🔧 [updateItemInContext] Result:`,
        updatedItem
          ? { id: updatedItem.id, title: updatedItem.title }
          : "NOT FOUND"
      );
      return result;
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
          setPendingItems={setPendingItems}
          hasSynced={hasSynced}
          addOptimisticItem={addOptimisticItemToContext}
          removeOptimisticItem={removeOptimisticItemFromContext}
          replaceOptimisticItem={replaceOptimisticItemInContext}
          updateItemInContext={updateItemInContext}
          workspacesItems={workspacesItems}
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
  setPendingItems,
  hasSynced,
  addOptimisticItem,
  removeOptimisticItem, // Not used directly, but kept for consistency with parent component
  replaceOptimisticItem,
  updateItemInContext,
  workspacesItems,
}: {
  currentView: "explorer" | "settings" | "trash" | "social" | "planner";
  setCurrentView: (
    view: "explorer" | "settings" | "trash" | "social" | "planner"
  ) => void;
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
  setPendingItems: React.Dispatch<
    React.SetStateAction<
      Map<string, { item: HierarchicalItem; data: CreateItemDto }>
    >
  >;
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
  workspacesItems: Folder[];
}) {
  const itemsContext = useItems();

  // Wrap handleItemUpdate to add optimistic update
  const wrappedHandleItemUpdate = useCallback(
    async (id: string, field: "title" | "content", value: string) => {
      console.log(`🔄 [RENAME] Starting rename: ${id} ${field} = "${value}"`);

      // Optimistically update the item in context (for both pending and existing items)
      if (itemsContext) {
        console.log(
          `📦 [RENAME] Context available, items count: ${itemsContext.items.length}`
        );
        const itemBefore = findItemById(itemsContext.items, id);
        console.log(
          `📦 [RENAME] Item before update:`,
          itemBefore
            ? { id: itemBefore.id, title: itemBefore.title }
            : "NOT FOUND"
        );

        const updatedItems = updateItemInContext(
          id,
          field,
          value,
          itemsContext.items
        );

        const itemAfter = findItemById(updatedItems, id);
        console.log(
          `📦 [RENAME] Item after update:`,
          itemAfter ? { id: itemAfter.id, title: itemAfter.title } : "NOT FOUND"
        );

        console.log(`📦 [RENAME] Setting updated items to context...`);
        itemsContext.setItems(updatedItems);
        console.log(`✅ [RENAME] Context updated`);
      } else {
        console.log(`⚠️ [RENAME] No itemsContext available`);
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

  // Create a stable key from context items to detect changes
  const contextItemsKey = useMemo(() => {
    if (!itemsContext?.items) return null;
    return JSON.stringify(
      itemsContext.items.map((i) => ({ id: i.id, title: i.title }))
    );
  }, [itemsContext?.items]);

  // Calculate merged items (backend items + optimistic items)
  const mergedItems = useMemo(() => {
    // Start with items from backend
    let result = [...items];

    // Apply optimistic updates from context if available
    // This ensures that renames and other updates are immediately visible
    if (itemsContext?.items) {
      const updateItemFromContext = (
        list: HierarchicalItem[],
        contextItems: HierarchicalItem[]
      ): HierarchicalItem[] => {
        return list.map((item) => {
          // Find matching item in context (by ID) - recursively searches all levels
          const contextItem = findItemById(contextItems, item.id);
          if (contextItem && contextItem.id === item.id) {
            // Check if context has different values (optimistic update)
            const hasUpdate =
              contextItem.title !== item.title ||
              contextItem.content !== item.content;
            if (hasUpdate) {
              console.log(
                `🔄 [mergedItems] Applying context update for ${item.id}: "${item.title}" -> "${contextItem.title}"`
              );
            }

            // Merge children: use context children if they exist, otherwise use backend children
            const mergedChildren =
              contextItem.children && contextItem.children.length > 0
                ? updateItemFromContext(contextItem.children, contextItems)
                : item.children
                ? updateItemFromContext(item.children, contextItems)
                : undefined;

            // Always use context version if it exists (has optimistic updates)
            return {
              ...contextItem,
              children: mergedChildren,
            };
          }
          // Recursively update children even if this item wasn't found in context
          if (item.children) {
            return {
              ...item,
              children: updateItemFromContext(item.children, contextItems),
            };
          }
          return item;
        });
      };

      result = updateItemFromContext(result, itemsContext.items);
    }

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

      // Check if a real item with matching parent_id and title exists in backend
      // (since we don't know the real ID yet)
      // Check for real items (not temp-*) that match the optimistic item
      const realItem = items.find(
        (item) =>
          item.parent_id === latestItem.parent_id &&
          item.type === latestItem.type &&
          item.title === latestItem.title &&
          !item.id.startsWith("temp-")
      );

      // Check if item exists in result (context) with same ID
      const existingInResult = findItemById(result, latestItem.id);

      if (realItem) {
        // Item was synchronized, replace optimistic item with real item
        // But preserve any optimistic updates from context
        const contextItem = itemsContext?.items
          ? findItemById(itemsContext.items, realItem.id)
          : null;
        const itemToUse =
          contextItem && contextItem.id === realItem.id
            ? contextItem // Use context version if it exists (has optimistic updates)
            : realItem; // Otherwise use backend version
        result = replaceOptimisticItem(latestItem.id, itemToUse, result);
      } else if (existingInResult && existingInResult.id === latestItem.id) {
        // Item exists in result, use existing version (may have optimistic updates)
        // Don't add again, it's already in result
      } else {
        // Add optimistic item if it doesn't exist yet
        const exists = findItemById(result, latestItem.id);
        if (!exists) {
          // Use latestItem which has the updated children array
          result = addOptimisticItem(latestItem, result, pendingItems);
        }
      }
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    itemsContext?.items,
    contextItemsKey,
    pendingItemsKey,
    addOptimisticItem,
    replaceOptimisticItem,
  ]);

  // Remove synchronized items from pendingItems when they appear in backend
  useEffect(() => {
    if (pendingItems.size === 0) return;

    const itemsToRemove: string[] = [];

    pendingItems.forEach(({ item: optimisticItem }, tempId) => {
      // Check if a real item with matching parent_id and title exists in backend
      // Use the current title from optimisticItem (which may have been renamed)
      const currentTitle = optimisticItem.title;

      // Normalize parent_id for comparison (both null and undefined should match)
      const optimisticParentId = optimisticItem.parent_id || null;

      const realItem = items.find((item) => {
        const itemParentId = item.parent_id || null;
        return (
          itemParentId === optimisticParentId &&
          item.type === optimisticItem.type &&
          item.title === currentTitle &&
          !item.id.startsWith("temp-")
        );
      });

      if (realItem) {
        // Item was synchronized, remove from pendingItems
        itemsToRemove.push(tempId);
        console.log(
          `✅ Found synchronized item: ${realItem.id} matches temp ${tempId} (title: "${currentTitle}", parent: ${optimisticParentId})`
        );
      }
    });

    if (itemsToRemove.length > 0) {
      setPendingItems((prev) => {
        const newMap = new Map(prev);
        itemsToRemove.forEach((id) => {
          newMap.delete(id);
        });
        if (newMap.size !== prev.size) {
          console.log(
            `🧹 Removed ${itemsToRemove.length} synchronized items from pendingItems (${prev.size} -> ${newMap.size})`
          );
        }
        return newMap;
      });
    }
  }, [items, pendingItems, setPendingItems]);

  // Sync merged items with context (only when they actually change)
  // But don't overwrite optimistic updates that are already in context
  const prevMergedItemsRef = useRef<HierarchicalItem[]>([]);
  useEffect(() => {
    if (!itemsContext) {
      return;
    }

    // Compare by IDs, titles, and content to detect changes
    // This function recursively collects all item data including children
    const getAllItemData = (items: HierarchicalItem[]): string => {
      return items
        .map((item) => {
          const childrenData = item.children
            ? getAllItemData(item.children)
            : "";
          return `${item.id}:${item.title}:${
            item.content || ""
          }:${childrenData}`;
        })
        .join("|");
    };

    const prevData = getAllItemData(prevMergedItemsRef.current);
    const currentData = getAllItemData(mergedItems);

    // Only update context if mergedItems actually changed
    // But check if context already has optimistic updates that we should preserve
    if (prevData !== currentData) {
      console.log(
        `🔄 [SYNC] mergedItems changed, checking for optimistic updates...`
      );

      // Check if context has newer updates than mergedItems
      const contextHasUpdates = itemsContext.items.some((contextItem) => {
        const mergedItem = findItemById(mergedItems, contextItem.id);
        if (!mergedItem) return false;
        // If context item has different title/content, it has optimistic updates
        const hasUpdate =
          contextItem.title !== mergedItem.title ||
          contextItem.content !== mergedItem.content;
        if (hasUpdate) {
          console.log(
            `🔄 [SYNC] Context has optimistic update for ${contextItem.id}: "${mergedItem.title}" -> "${contextItem.title}"`
          );
        }
        return hasUpdate;
      });

      // Only update if context doesn't have newer optimistic updates
      if (!contextHasUpdates) {
        console.log(
          `✅ [SYNC] No optimistic updates, syncing mergedItems to context`
        );
        prevMergedItemsRef.current = mergedItems;
        itemsContext.setItems(mergedItems);
      } else {
        console.log(`⏭️ [SYNC] Skipping sync - context has optimistic updates`);
      }
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
          selectedItem && selectedItem.type === "note" ? (
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
              workspaces={workspacesItems ?? []}
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
