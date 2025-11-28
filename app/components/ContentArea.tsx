"use client";

import { useState, useEffect } from "react";
import EditableContentItem from "./EditableContentItem";
import AddItemInline from "./AddItemInline";
import AddItemButton from "./AddItemButton";
import RichTextEditor from "./RichTextEditor";
import { type ItemType, getItemTypeIcon } from "@/lib/itemTypes";

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
  const [addItemPosition, setAddItemPosition] =
    useState<AddItemPosition | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Shared drag state - all EditableContentItem components need to know this
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Get modules (sections) from root items
  const modules = items.filter((item) => item.type === "section");

  // Get selected module or default to first module
  const selectedModule = selectedModuleId
    ? modules.find((m) => m.id === selectedModuleId)
    : modules.length > 0
    ? modules[0]
    : null;

  // Items to display: if a module is selected, show its children, otherwise show all non-section items
  const displayItems = selectedModule
    ? selectedModule.children || []
    : items.filter((item) => item.type !== "section");

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
        (m) => m.id === selectedModuleId && m.type === "section"
      );
      if (!updatedModule && modules.length > 0) {
        // If selected module was deleted, select first available
        setSelectedModuleId(modules[0].id);
        window.location.hash = modules[0].id;
      }
    }
  }, [items, selectedModuleId, modules]);

  const handleUpdate = (
    id: string,
    field: "title" | "content",
    value: string
  ) => {
    const updateItem = (items: TopicItem[]): TopicItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        if (item.children) {
          return { ...item, children: updateItem(item.children) };
        }
        return item;
      });
    };

    setItems(updateItem(items));
  };

  const handleAddItem = async (itemData: {
    type: ItemType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => {
    try {
      const response = await fetch(
        `http://localhost:3001/topics/${topicId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        }
      );

      if (!response.ok) throw new Error("Failed to create item");

      const newItem = await response.json();

      // Convert flat item to hierarchical structure
      const hierarchicalItem: TopicItem = {
        id: newItem.id,
        type: newItem.type,
        title: newItem.title,
        content: newItem.content,
        youtube_id: newItem.youtube_id,
        parent_id: newItem.parent_id,
        children: [],
      };

      // Add to items list
      if (itemData.parent_id) {
        // Add as child to parent
        const addToParent = (items: TopicItem[]): TopicItem[] => {
          return items.map((item) => {
            if (item.id === itemData.parent_id) {
              return {
                ...item,
                children: [...(item.children || []), hierarchicalItem],
              };
            }
            if (item.children) {
              return { ...item, children: addToParent(item.children) };
            }
            return item;
          });
        };
        setItems(addToParent(items));
      } else {
        // Add as root item
        setItems([...items, hierarchicalItem]);
      }

      // Close add item form
      setAddItemPosition(null);
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Erro ao criar item. Tente novamente.");
    }
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

  const removeItemById = (items: TopicItem[], id: string): TopicItem[] => {
    return items
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.children) {
          return { ...item, children: removeItemById(item.children, id) };
        }
        return item;
      });
  };

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

    await Promise.all(
      flatItems.map((item) =>
        fetch(`http://localhost:3001/topics/items/${item.id}/order`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_index: item.order_index,
            parent_id: item.parent_id,
          }),
        })
      )
    );
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
      console.log("Invalid move: same item or item not found", {
        draggedItem,
        targetItem,
      });
      return;
    }

    // Don't allow dropping item into itself or its own children
    if (isDescendant(draggedItem, targetItem.id)) {
      console.log("Invalid move: cannot drop into own children");
      return;
    }

    let newItems: TopicItem[];

    if (position === "inside" && targetItem.type === "section") {
      // Move item inside section (as child)
      newItems = moveItemToParent(items, draggedItemId, targetItem.id);
    } else {
      // Find target position in the hierarchy BEFORE removing the dragged item
      const targetPath = findItemPath(items, targetItem.id);
      if (!targetPath) {
        console.log("Invalid move: target path not found");
        return;
      }

      const { parentIds, targetIndex } = targetPath;

      // Find dragged item path to adjust target index if needed
      const draggedPath = findItemPath(items, draggedItemId);
      if (!draggedPath) {
        console.log("Invalid move: dragged path not found");
        return;
      }

      let adjustedTargetIndex = targetIndex;

      // Check if dragged and target are at the same level
      const sameLevel =
        draggedPath.parentIds.length === parentIds.length &&
        JSON.stringify(draggedPath.parentIds) === JSON.stringify(parentIds);

      console.log("Move item:", {
        draggedItemId,
        targetItemId,
        position,
        draggedPath,
        targetPath,
        sameLevel,
      });

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
      console.log("Items changed, updating...");
      setItems(newItems);

      // Update backend
      try {
        await updateItemOrder(newItems);
      } catch (error) {
        console.error("Error updating item order:", error);
      }
    } else {
      console.log("Items did not change, skipping update");
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
                  item={item}
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
                  allItems={items}
                  setAllItems={setItems}
                />
              </div>
            ))}
            <div className="flex justify-center pt-4 sticky bottom-0 bg-none pb-4">
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
          className="mb-8 p-6 rounded-lg border"
          style={{
            backgroundColor: "var(--sidebar-bg)",
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
                item={item}
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
                allItems={items}
                setAllItems={(newItems) => {
                  setItems(newItems);
                  if (selectedModuleId) {
                    const updatedModule = newItems.find(
                      (m) => m.id === selectedModuleId && m.type === "section"
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
            <div className="flex justify-center pt-4 sticky bottom-0 bg-background pb-4">
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
