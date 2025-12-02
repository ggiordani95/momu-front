"use client";

import { useState, useEffect, useRef } from "react";
import EditableContentItem from "./editors/EditableContentItem";
import AddItemInline from "./AddItemInline";
import AddItemButton from "./AddItemButton";
import RichTextEditor from "./editors/RichTextEditor";
import { type ItemType, getItemTypeIcon } from "@/lib/itemTypes";
import { HierarchicalFile, UpdateFileDto } from "@/lib/types";
import {
  useCreateFile,
  useUpdateFile,
  useUpdateItemOrder,
} from "@/lib/hooks/querys/useFiles";
import { toast } from "sonner";

interface TopicItem {
  id: string;
  type: ItemType;
  title: string;
  content?: string;
  youtube_id?: string;
  parent_id?: string;
  children?: TopicItem[];
}

interface ContentAreaProps {
  initialItems: TopicItem[];
  topicId: string;
}

type AddItemPosition =
  | { type: "top" }
  | { type: "after"; itemIndex: number }
  | { type: "end" }
  | { type: "child"; parentId: string };

export default function ContentArea({
  initialItems,
  topicId,
}: ContentAreaProps) {
  const [items, setItems] = useState(initialItems);
  const createFileMutation = useCreateFile(topicId);
  const updateFileMutation = useUpdateFile(topicId);
  const updateItemOrderMutation = useUpdateItemOrder(topicId);
  const optimisticIdRef = useRef(0);

  const [addItemPosition, setAddItemPosition] =
    useState<AddItemPosition | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Shared drag state - all EditableContentItem components need to know this
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Get modules (sections) from root items
  const modules = items.filter((item) => item.type === "folder");

  // Get selected module or default to first module
  const selectedModule = selectedModuleId
    ? modules.find((m) => m.id === selectedModuleId)
    : modules.length > 0
    ? modules[0]
    : null;

  // Items to display: if a module is selected, show its children, otherwise show all non-section items
  const displayItems = selectedModule
    ? selectedModule.children || []
    : items.filter((item) => item.type !== "folder");

  // Helper to get icon
  const getIcon = (type: ItemType) => {
    const IconComponent = getItemTypeIcon(type);
    if (IconComponent) {
      return <IconComponent size={24} />;
    }
    return null;
  };

  // Listen to hash changes to update selected module
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        const moduleItem = modules.find((m) => m.id === hash);
        if (moduleItem) {
          setSelectedModuleId(hash);
        }
      } else if (modules.length > 0) {
        // Default to first module if no hash
        setSelectedModuleId(modules[0].id);
        window.location.hash = modules[0].id;
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [modules]);

  // Update selected module reference when items change
  useEffect(() => {
    if (selectedModuleId) {
      const updatedModule = items.find(
        (m) => m.id === selectedModuleId && m.type === "folder"
      );
      if (!updatedModule && modules.length > 0) {
        // If selected module was deleted, schedule state update outside the render/effect cycle
        setTimeout(() => {
          setSelectedModuleId(modules[0].id as string);
          window.location.hash = modules[0].id;
        }, 0);
      }
    }
  }, [items, selectedModuleId, modules]);

  const handleUpdate = (
    id: string,
    field: "title" | "content" | "completed" | "video_watched_seconds",
    value: string | boolean | number
  ) => {
    const updateItemInTree = (items: TopicItem[]): TopicItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        if (item.children) {
          return { ...item, children: updateItemInTree(item.children) };
        }
        return item;
      });
    };

    const previousItems = items;
    const updatedItems = updateItemInTree(items);
    setItems(updatedItems);

    const updateData: UpdateFileDto = {};
    if (field === "completed") {
      updateData.completed = value as boolean;
      if (value) {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = undefined; // Or null, depending on backend
      }
    } else if (field === "video_watched_seconds") {
      updateData.video_watched_seconds = value as number;
    } else {
      // title or content
      (updateData as Partial<UpdateFileDto>)[field] = value as string;
    }

    updateFileMutation.mutate(
      { fileId: id, data: updateData },
      {
        onError: (error) => {
          console.error("Error updating item:", error);
          setItems(previousItems);
          toast.error("Não foi possível salvar a edição. Tente novamente.");
        },
      }
    );
  };

  const handleAddItem = (itemData: {
    type: ItemType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => {
    optimisticIdRef.current += 1;
    const optimisticId = `temp-${optimisticIdRef.current}`;
    const optimisticItem: TopicItem = {
      id: optimisticId as string,
      type: itemData.type,
      title: itemData.title,
      content: itemData.content,
      youtube_id: undefined,
      parent_id: itemData.parent_id,
      children: [],
    };

    setItems((prev) => insertItem(prev, optimisticItem, itemData.parent_id));
    setAddItemPosition(null);

    createFileMutation.mutate(itemData, {
      onSuccess: (newItem: HierarchicalFile) => {
        const mappedItem: TopicItem = {
          id: newItem.id,
          type: newItem.type,
          title: newItem.title,
          content: newItem.content,
          youtube_id: newItem.youtube_id,
          parent_id: newItem.parent_id ?? undefined,
          children: [],
        };

        setItems((prev) => replaceItemById(prev, optimisticId, mappedItem));
      },
      onError: (error) => {
        console.error("Error creating item:", error);
        setItems((prev) => removeItemById(prev, optimisticId));
        toast.error("Não foi possível criar o item. Tente novamente.");
      },
    });
  };

  const openAddItem = (position: AddItemPosition) => {
    setAddItemPosition(position);
  };

  const closeAddItem = () => {
    setAddItemPosition(null);
  };

  const getParentId = (): string | undefined => {
    if (addItemPosition?.type === "child") {
      return addItemPosition.parentId;
    }
    return undefined;
  };

  // Helper functions
  const findItemById = (items: TopicItem[], id: string): TopicItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const isDescendant = (item: TopicItem, targetId: string): boolean => {
    if (item.children) {
      for (const child of item.children) {
        if (child.id === targetId) return true;
        if (isDescendant(child, targetId)) return true;
      }
    }
    return false;
  };

  function insertItem(
    items: TopicItem[],
    newItem: TopicItem,
    parentId?: string
  ): TopicItem[] {
    if (!parentId) {
      return [...items, newItem];
    }

    return items.map((item) => {
      if (item.id === parentId) {
        return {
          ...item,
          children: [...(item.children || []), newItem],
        };
      }
      if (item.children) {
        return {
          ...item,
          children: insertItem(item.children, newItem, parentId),
        };
      }
      return item;
    });
  }

  function replaceItemById(
    items: TopicItem[],
    targetId: string,
    newItem: TopicItem
  ): TopicItem[] {
    return items.map((item) => {
      if (item.id === targetId) {
        return {
          ...newItem,
          children: newItem.children?.length
            ? newItem.children
            : item.children || [],
        };
      }
      if (item.children) {
        return {
          ...item,
          children: replaceItemById(item.children, targetId, newItem),
        };
      }
      return item;
    });
  }

  function removeItemById(items: TopicItem[], id: string): TopicItem[] {
    return items
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.children) {
          return { ...item, children: removeItemById(item.children, id) };
        }
        return item;
      });
  }

  const moveItemToParent = (
    items: TopicItem[],
    itemId: string,
    parentId: string
  ): TopicItem[] => {
    const item = findItemById(items, itemId);
    if (!item) return items;

    // Remove item from current position
    const newItems = removeItemById(items, itemId);

    // Add item as child of parent
    const addToParent = (items: TopicItem[]): TopicItem[] => {
      return items.map((i) => {
        if (i.id === parentId) {
          return {
            ...i,
            children: [
              ...(i.children || []),
              { ...item, parent_id: parentId, children: [] },
            ],
          };
        }
        if (i.children) {
          return { ...i, children: addToParent(i.children) };
        }
        return i;
      });
    };

    return addToParent(newItems);
  };

  const updateItemOrder = async (items: TopicItem[]) => {
    const flatItems: Array<{
      id: string;
      order_index: number;
      parent_id?: string;
    }> = [];

    const flatten = (items: TopicItem[], parentId?: string, startIndex = 0) => {
      items.forEach((item, index) => {
        flatItems.push({
          id: item.id,
          order_index: startIndex + index,
          parent_id: parentId,
        });
        if (item.children && item.children.length > 0) {
          flatten(item.children, item.id, 0);
        }
      });
    };

    flatten(items);

    try {
      await Promise.all(
        flatItems.map((item) =>
          updateItemOrderMutation.mutateAsync({
            itemId: item.id,
            orderIndex: item.order_index,
            parentId: item.parent_id ?? null,
          })
        )
      );
    } catch (error) {
      console.error("Error updating item order:", error);
      toast.error("Não foi possível reordenar os itens. Tente novamente.");
      throw error;
    }
  };

  // Unified function to handle moving items (works for root and nested items)
  const handleMoveItem = async (
    draggedItemIdParam: string,
    targetItemId: string,
    position: "before" | "inside" | "after"
  ) => {
    const draggedItemId = draggedItemIdParam;
    const draggedItem = findItemById(items, draggedItemId);
    const targetItem = findItemById(items, targetItemId);

    if (!draggedItem || !targetItem || draggedItem.id === targetItem.id) {
      return;
    }

    // Don't allow dropping item into itself or its own children
    if (isDescendant(draggedItem, targetItem.id)) {
      return;
    }

    let newItems: TopicItem[];

    if (position === "inside" && targetItem.type === "folder") {
      // Move item inside section (as child)
      newItems = moveItemToParent(items, draggedItemId, targetItem.id);
    } else {
      // Find target position in the hierarchy BEFORE removing the dragged item
      const targetPath = findItemPath(items, targetItem.id);
      if (!targetPath) {
        return;
      }

      const { parentIds, targetIndex } = targetPath;

      // Find dragged item path to adjust target index if needed
      const draggedPath = findItemPath(items, draggedItemId);
      if (!draggedPath) {
        return;
      }

      let adjustedTargetIndex = targetIndex;

      // Check if dragged and target are at the same level
      const sameLevel =
        draggedPath.parentIds.length === parentIds.length &&
        JSON.stringify(draggedPath.parentIds) === JSON.stringify(parentIds);

      if (sameLevel) {
        const draggedIndex = draggedPath.targetIndex;
        if (position === "before") {
          if (draggedIndex < targetIndex) {
            // Moving item from before target to before target
            // After removing dragged item, target index decreases by 1
            adjustedTargetIndex = targetIndex - 1;
          } else {
            // Moving item from after target to before target
            // Target index stays the same
            adjustedTargetIndex = targetIndex;
          }
        } else if (position === "after") {
          if (draggedIndex < targetIndex) {
            // Moving item from before target to after target
            // After removing dragged item, target index decreases by 1
            adjustedTargetIndex = targetIndex - 1;
          } else if (draggedIndex > targetIndex) {
            // Moving item from after target to after target
            // Target index stays the same
            adjustedTargetIndex = targetIndex;
          } else {
            // Same index - shouldn't happen, but handle it
            adjustedTargetIndex = targetIndex;
          }
        }
      }

      // Use adjustedTargetIndex and pass position to moveItemInHierarchy
      // The function will handle the final index adjustment based on position
      // position is guaranteed to be "before" or "after" here (not "inside")
      newItems = moveItemInHierarchy(
        items,
        draggedItemId,
        parentIds,
        adjustedTargetIndex,
        position as "before" | "after"
      );
    }

    // Only update if items actually changed
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(newItems);
    if (itemsChanged) {
      setItems(newItems);

      // Update backend
      try {
        await updateItemOrder(newItems);
      } catch (error) {
        console.error("Error updating item order:", error);
      }
    }

    // Always clear drag states after move attempt (successful or not)
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  // Find the path to an item in the hierarchy (returns parent IDs and target index)
  const findItemPath = (
    items: TopicItem[],
    targetId: string,
    parentIds: string[] = []
  ): { parentIds: string[]; targetIndex: number } | null => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === targetId) {
        return { parentIds, targetIndex: i };
      }
      if (items[i].children) {
        const found = findItemPath(items[i].children!, targetId, [
          ...parentIds,
          items[i].id,
        ]);
        if (found) return found;
      }
    }
    return null;
  };

  // Move item within hierarchy (supports nested items)
  const moveItemInHierarchy = (
    items: TopicItem[],
    itemId: string,
    targetParentIds: string[],
    targetIndex: number,
    position: "before" | "after"
  ): TopicItem[] => {
    const item = findItemById(items, itemId);
    if (!item) return items;

    // Save the item to move before removing it
    const itemToMove = { ...item };

    // Remove item from current position
    const newItems = removeItemById(items, itemId);

    // Find target parent in the hierarchy and insert item
    const insertAt = (
      currentItems: TopicItem[],
      parentIds: string[],
      index: number,
      depth: number = 0
    ): TopicItem[] => {
      if (depth === parentIds.length) {
        // We're at the target level - insert the item here
        // index is already adjusted in handleMoveItem, so we just need to
        // add 1 if position is "after"
        const finalIndex = position === "after" ? index + 1 : index;
        const result = [...currentItems];

        // Ensure we don't go out of bounds
        const safeIndex = Math.max(0, Math.min(finalIndex, result.length));

        result.splice(safeIndex, 0, {
          ...itemToMove,
          parent_id: parentIds[parentIds.length - 1] || undefined,
          children: itemToMove.children || [],
        });
        return result;
      }

      // Navigate deeper into the hierarchy
      return currentItems.map((i) => {
        if (i.id === parentIds[depth]) {
          return {
            ...i,
            children: insertAt(i.children || [], parentIds, index, depth + 1),
          };
        }
        return i;
      });
    };

    if (targetParentIds.length === 0) {
      // Moving to root level
      // targetIndex is already adjusted in handleMoveItem, so we just need to
      // add 1 if position is "after"
      const finalIndex = position === "after" ? targetIndex + 1 : targetIndex;
      // Ensure we don't go out of bounds
      const safeIndex = Math.max(0, Math.min(finalIndex, newItems.length));
      newItems.splice(safeIndex, 0, {
        ...itemToMove,
        parent_id: undefined,
        children: itemToMove.children || [],
      });
      return newItems;
    }

    // For nested items, we need to find the parent in newItems (after removal)
    // and insert the item there
    return insertAt(newItems, targetParentIds, targetIndex);
  };

  // If no modules exist, show all items (backward compatibility)
  if (modules.length === 0) {
    return (
      <div className="space-y-8">
        {/* Add button at the top */}
        {addItemPosition?.type !== "top" && (
          <div className="flex justify-start">
            <AddItemButton
              onClick={() => openAddItem({ type: "top" })}
              label="Adicionar Item"
            />
          </div>
        )}
        {/* Inline Add Item Form at top */}
        {addItemPosition?.type === "top" && (
          <AddItemInline
            onAdd={handleAddItem}
            onCancel={closeAddItem}
            parentId={getParentId()}
            allowSections={false}
          />
        )}

        {items.length > 0 ? (
          <>
            {items.map((item) => (
              <div key={item.id} className="space-y-8">
                <EditableContentItem
                  item={item as HierarchicalFile}
                  onUpdate={handleUpdate}
                  onAddChild={(parentId) =>
                    openAddItem({ type: "child", parentId })
                  }
                  showAddFormForParentId={
                    addItemPosition?.type === "child"
                      ? addItemPosition.parentId
                      : undefined
                  }
                  AddItemFormComponent={
                    addItemPosition?.type === "child" ? (
                      <AddItemInline
                        onAdd={handleAddItem}
                        onCancel={closeAddItem}
                        parentId={getParentId()}
                        allowSections={true}
                      />
                    ) : undefined
                  }
                  onMoveItem={handleMoveItem}
                  allItems={items as HierarchicalFile[]}
                  setAllItems={setItems as (items: HierarchicalFile[]) => void}
                />
              </div>
            ))}
            <div className="flex justify-center pt-4 sticky bg-none pb-4">
              <AddItemButton
                onClick={() => openAddItem({ type: "end" })}
                label="Adicionar Item"
                variant="inline"
              />
            </div>
          </>
        ) : (
          addItemPosition?.type !== "top" && (
            <div
              className="text-center py-20 border rounded-lg"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="text-6xl mb-4">📄</div>
              <h2 className="text-2xl font-semibold mb-2">Tópico vazio</h2>
              <p className="text-sm opacity-60 mb-6">
                Adicione vídeos, textos, tarefas ou subtópicos
              </p>
              <AddItemButton
                onClick={() => openAddItem({ type: "top" })}
                label="Adicionar Conteúdo"
              />
            </div>
          )
        )}
      </div>
    );
  }

  // Show module content
  return (
    <div className="space-y-8">
      {/* Module Header - Card Style */}
      {selectedModule && (
        <div
          className="mb-8 p-6 rounded-lg border bg-background/20"
          style={{
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            {getIcon(selectedModule.type)}
            <h2 className="text-3xl font-bold">{selectedModule.title}</h2>
          </div>
          {selectedModule.content && (
            <div className="mb-0">
              <RichTextEditor
                content={selectedModule.content || ""}
                onSave={(value) =>
                  handleUpdate(selectedModule.id, "content", value)
                }
                placeholder="Descrição do módulo..."
              />
            </div>
          )}
        </div>
      )}

      {/* Inline Add Item Form at top */}
      {addItemPosition?.type === "top" && (
        <AddItemInline
          onAdd={handleAddItem}
          onCancel={closeAddItem}
          parentId={selectedModule?.id}
          allowSections={false}
        />
      )}

      {displayItems.length > 0 ? (
        <>
          {displayItems.map((item) => (
            <div key={item.id} className="space-y-8">
              <EditableContentItem
                item={item as HierarchicalFile}
                onUpdate={handleUpdate}
                onAddChild={(parentId) =>
                  openAddItem({ type: "child", parentId })
                }
                showAddFormForParentId={
                  addItemPosition?.type === "child"
                    ? addItemPosition.parentId
                    : undefined
                }
                AddItemFormComponent={
                  addItemPosition?.type === "child" ? (
                    <AddItemInline
                      onAdd={handleAddItem}
                      onCancel={closeAddItem}
                      parentId={getParentId()}
                      allowSections={true}
                    />
                  ) : undefined
                }
                onMoveItem={handleMoveItem}
                allItems={items as HierarchicalFile[]}
                setAllItems={(newItems) => {
                  setItems(newItems as TopicItem[]);
                  if (selectedModuleId) {
                    const updatedModule = newItems.find(
                      (m) => m.id === selectedModuleId && m.type === "folder"
                    );
                    if (updatedModule) {
                      // Module still exists, no need to change
                    }
                  }
                }}
                draggedItemId={draggedItemId}
                setDraggedItemId={setDraggedItemId}
                dragOverItemId={dragOverItemId}
                setDragOverItemId={setDragOverItemId}
              />
            </div>
          ))}
          {/* Add button at the end - always fixed at the bottom */}
          {addItemPosition?.type !== "end" ? (
            <div className="flex justify-center rounded-3xl pt-4 sticky bottom-0 pb-4">
              <AddItemButton
                onClick={() => openAddItem({ type: "end" })}
                label="Adicionar Item"
                variant="inline"
              />
            </div>
          ) : (
            /* Show form at the end */
            <div className="sticky bottom-0 bg-none pb-4">
              <AddItemInline
                onAdd={handleAddItem}
                onCancel={closeAddItem}
                parentId={selectedModule?.id}
                allowSections={false}
              />
            </div>
          )}
        </>
      ) : (
        addItemPosition?.type !== "top" && (
          <div
            className="text-center py-20 border rounded-lg"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-semibold mb-2">Módulo vazio</h2>
            <p className="text-sm opacity-60 mb-6">
              Adicione vídeos, textos, tarefas ou subtópicos
            </p>
            <AddItemButton
              onClick={() => openAddItem({ type: "top" })}
              label="Adicionar Conteúdo"
            />
          </div>
        )
      )}
    </div>
  );
}
