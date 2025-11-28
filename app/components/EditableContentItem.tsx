"use client";

import React, { useState, useRef, useMemo } from "react";
import VideoPlayer from "./VideoPlayer";
import EditableText from "./EditableText";
import RichTextEditor from "./RichTextEditor";
import { GripVertical, Check } from "lucide-react";
import {
  getItemTypeEmoji,
  getItemTypeIcon,
  type ItemType,
} from "@/lib/itemTypes";
import type { HierarchicalItem } from "@/lib/types";

interface EditableContentItemProps {
  item: HierarchicalItem;
  onUpdate: (id: string, field: "title" | "content", value: string) => void;
  onAddChild?: (parentId: string) => void;
  showAddFormForParentId?: string;
  AddItemFormComponent?: React.ReactNode;
  onMoveItem?: (
    draggedItemId: string,
    targetItemId: string,
    position: "before" | "inside" | "after"
  ) => void;
  allItems?: HierarchicalItem[];
  setAllItems?: (items: HierarchicalItem[]) => void;
  isNested?: boolean;
  // Shared drag state from parent
  draggedItemId?: string | null;
  setDraggedItemId?: (id: string | null) => void;
  dragOverItemId?: string | null;
  setDragOverItemId?: (id: string | null) => void;
}

export default function EditableContentItem({
  item,
  onUpdate,
  onAddChild,
  showAddFormForParentId,
  AddItemFormComponent,
  onMoveItem,
  allItems,
  setAllItems,
  isNested = false,
  draggedItemId: parentDraggedItemId = null,
  setDraggedItemId: setParentDraggedItemId,
  dragOverItemId: parentDragOverItemId = null,
  setDragOverItemId: setParentDragOverItemId,
}: EditableContentItemProps) {
  // Use parent state if provided, otherwise use local state (for backward compatibility)
  const [localDraggedItemId, setLocalDraggedItemId] = useState<string | null>(
    null
  );
  const [localDragOverItemId, setLocalDragOverItemId] = useState<string | null>(
    null
  );

  const draggedItemId = parentDraggedItemId ?? localDraggedItemId;
  const dragOverItemId = parentDragOverItemId ?? localDragOverItemId;
  const setDraggedItemId = setParentDraggedItemId ?? setLocalDraggedItemId;
  const setDragOverItemId = setParentDragOverItemId ?? setLocalDragOverItemId;

  const [dropPosition, setDropPosition] = useState<
    "before" | "inside" | "after" | null
  >(null);
  const draggedItemIdRef = useRef<string | null>(null);
  const checklistPreview = useMemo(
    () => parseChecklistPreview(item.content, item.children),
    [item.content, item.children]
  );
  const getIcon = (type: ItemType, size: number = 24) => {
    const IconComponent = getItemTypeIcon(type);
    if (IconComponent) {
      return React.createElement(IconComponent, { size });
    }
    return getItemTypeEmoji(type);
  };

  const handleUpdate = (field: "title" | "content", value: string) => {
    onUpdate(item.id, field, value);
  };

  const handleDragStart = (e: React.DragEvent) => {
    console.log("handleDragStart:", item.id, item.title);
    setDraggedItemId(item.id);
    draggedItemIdRef.current = item.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.setData("text/html", item.id);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    console.log("handleDragOver called on:", item.id, item.title);
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverItemId(item.id);

    // Use ref to get dragged item ID (dataTransfer.getData doesn't work in dragOver)
    const actualDraggedId = draggedItemIdRef.current || draggedItemId;

    console.log(
      "handleDragOver - actualDraggedId:",
      actualDraggedId,
      "item.id:",
      item.id
    );

    if (!actualDraggedId || actualDraggedId === item.id) {
      console.log("handleDragOver - skipping (same item or no dragged ID)");
      setDropPosition(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const threshold = height / 3;

    // Determine drop position based on mouse Y position
    let newDropPosition: "before" | "inside" | "after" | null = null;

    if (item.type === "section" && y > threshold && y < height - threshold) {
      // Middle third = inside section
      newDropPosition = "inside";
    } else if (y < threshold) {
      // Top third = before
      newDropPosition = "before";
    } else {
      // Bottom third = after
      newDropPosition = "after";
    }

    setDropPosition(newDropPosition);

    console.log("handleDragOver:", {
      draggedItemId,
      draggedItemIdRef: draggedItemIdRef.current,
      actualDraggedId,
      targetItemId: item.id,
      y,
      height,
      threshold,
      dropPosition: newDropPosition,
    });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the element (not just moving to a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;

    // Check if we're moving to a child element
    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      // Moving to a child element, don't clear
      return;
    }

    // Only clear dragOverItemId if we're actually leaving
    // Keep dropPosition for the drop event - it will be used in handleDrop
    // Use a small delay to avoid race conditions
    setTimeout(() => {
      // Double-check that we're still not dragging over this item
      // This prevents clearing if dragOver was called again quickly
      if (dragOverItemId === item.id) {
        setDragOverItemId(null);
      }
    }, 100);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItemId(null);

    // Get dragged item ID from dataTransfer (more reliable than state)
    const draggedIdFromData =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text/html");
    const actualDraggedId =
      draggedIdFromData || draggedItemIdRef.current || draggedItemId;

    // Calculate drop position if not set (fallback)
    let finalDropPosition = dropPosition;
    if (!finalDropPosition) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const threshold = height / 3;

      if (item.type === "section" && y > threshold && y < height - threshold) {
        finalDropPosition = "inside";
      } else if (y < threshold) {
        finalDropPosition = "before";
      } else {
        finalDropPosition = "after";
      }
    }

    console.log("handleDrop called:", {
      draggedItemId,
      draggedIdFromData,
      actualDraggedId,
      targetItemId: item.id,
      dropPosition,
      finalDropPosition,
      hasOnMoveItem: !!onMoveItem,
    });

    if (!actualDraggedId || !onMoveItem) {
      console.log("Cannot drop: missing draggedItemId or onMoveItem", {
        actualDraggedId,
        hasOnMoveItem: !!onMoveItem,
      });
      setDropPosition(null);
      draggedItemIdRef.current = null;
      setDraggedItemId(null);
      return;
    }

    if (finalDropPosition) {
      console.log("Calling onMoveItem with:", {
        draggedItemId: actualDraggedId,
        targetItemId: item.id,
        dropPosition: finalDropPosition,
      });

      // Clear local drop position, but keep drag states for parent to clear
      setDropPosition(null);

      // Call onMoveItem which will update the items and clear drag states
      onMoveItem(actualDraggedId, item.id, finalDropPosition);

      // Clear local ref after a brief delay to ensure parent state is updated
      setTimeout(() => {
        draggedItemIdRef.current = null;
      }, 100);
    } else {
      console.log("No dropPosition set, cannot move");
      setDropPosition(null);
      draggedItemIdRef.current = null;
      setDraggedItemId(null);
      setDragOverItemId(null);
    }
  };

  const handleDragEnd = () => {
    // Clear all drag states when drag ends (even if drop didn't happen)
    // Use a small timeout to ensure this happens after any drop events
    setTimeout(() => {
      setDraggedItemId(null);
      draggedItemIdRef.current = null;
      setDragOverItemId(null);
      setDropPosition(null);
    }, 0);
  };

  return (
    <div
      id={item.id}
      className="mb-8 scroll-mt-8 relative group transition-all duration-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        opacity: draggedItemId === item.id ? 1 : 1,
        backgroundColor:
          draggedItemId === item.id ? "rgba(59, 130, 246, 0.1)" : "transparent",
        borderRadius: draggedItemId === item.id ? "8px" : "0",
        paddingTop: draggedItemId === item.id ? "8px" : "0",
        paddingBottom: draggedItemId === item.id ? "8px" : "0",
        paddingLeft: draggedItemId === item.id ? "8px" : "0",
        paddingRight:
          dragOverItemId === item.id && draggedItemId !== item.id
            ? "12px"
            : draggedItemId === item.id
            ? "8px"
            : "0",
        marginLeft: draggedItemId === item.id ? "-8px" : "0",
        marginRight: draggedItemId === item.id ? "-8px" : "0",
      }}
    >
      {/* Drag handle - left for root items, right for nested items */}
      <div
        className={`absolute top-2 flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity z-10 ${
          isNested ? "-right-8" : "-left-8"
        }`}
        style={{
          color: "var(--foreground)",
          opacity: 0.2,
          padding: "8px 4px",
          minWidth: "24px",
          minHeight: "24px",
        }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.2";
        }}
      >
        <GripVertical size={16} />
      </div>

      {/* Drop indicators */}
      {dragOverItemId === item.id &&
        draggedItemId !== item.id &&
        dropPosition && (
          <>
            {dropPosition === "before" && (
              <div
                className="absolute left-0 top-0 w-full h-1.5 bg-blue-500 rounded-full shadow-lg"
                style={{
                  zIndex: 10,
                  top: "-6px",
                  boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
                }}
              />
            )}
            {dropPosition === "inside" && item.type === "section" && (
              <div
                className="absolute left-0 top-0 w-full h-full border-2 border-blue-500 border-dashed rounded-lg"
                style={{
                  zIndex: 10,
                  pointerEvents: "none",
                  boxShadow: "0 0 12px rgba(59, 130, 246, 0.4)",
                }}
              />
            )}
            {dropPosition === "after" && (
              <div
                className="absolute left-0 bottom-0 w-full h-1.5 bg-blue-500 rounded-full shadow-lg"
                style={{
                  zIndex: 10,
                  bottom: "-6px",
                  boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
                }}
              />
            )}
          </>
        )}
      {item.type === "section" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{getIcon(item.type)}</span>
            <EditableText
              value={item.title}
              onSave={(value) => handleUpdate("title", value)}
              className="text-3xl font-bold flex-1"
              as="h2"
              placeholder="Título da seção..."
            />
          </div>
          <div className="mb-6">
            <RichTextEditor
              content={item.content || ""}
              onSave={(value) => handleUpdate("content", value)}
              placeholder="Descrição da seção..."
            />
          </div>

          {/* Render children */}
          {item.children && item.children.length > 0 && (
            <div
              className="ml-6 space-y-6 border-l-2 pl-6"
              style={{ borderColor: "var(--border-color)" }}
            >
              {item.children.map((child: HierarchicalItem) => (
                <EditableContentItem
                  key={child.id}
                  item={child}
                  onUpdate={onUpdate}
                  onAddChild={onAddChild}
                  showAddFormForParentId={showAddFormForParentId}
                  AddItemFormComponent={AddItemFormComponent}
                  onMoveItem={onMoveItem}
                  allItems={allItems}
                  setAllItems={setAllItems}
                  isNested={true}
                  draggedItemId={draggedItemId}
                  setDraggedItemId={setDraggedItemId}
                  dragOverItemId={dragOverItemId}
                  setDragOverItemId={setDragOverItemId}
                />
              ))}
            </div>
          )}

          {/* Add child button for sections */}
          {item.type === "section" && onAddChild && (
            <div className="ml-6 mt-4">
              {showAddFormForParentId === item.id && AddItemFormComponent ? (
                AddItemFormComponent
              ) : (
                <button
                  onClick={() => onAddChild(item.id)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed rounded-md transition-colors"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--foreground)",
                    opacity: 0.7,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.backgroundColor =
                      "rgba(59, 130, 246, 0.05)";
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.opacity = "0.7";
                  }}
                >
                  <span>+</span>
                  <span>Adicionar item nesta seção</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {item.type === "video" && item.youtube_id && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6">
              {getIcon(item.type, 20)}
            </div>
            <EditableText
              value={item.title}
              onSave={(value) => handleUpdate("title", value)}
              className="text-xl font-semibold flex-1"
              as="h3"
              placeholder="Título do vídeo..."
            />
          </div>
          <VideoPlayer videoId={item.youtube_id} />
          <EditableText
            value={item.content || ""}
            onSave={(value) => handleUpdate("content", value)}
            className="mt-3 text-sm opacity-70"
            placeholder="Descrição do vídeo..."
            multiline
          />
        </div>
      )}

      {item.type === "task" && (
        <div
          className="flex items-start gap-3 p-4 border rounded-lg mb-3"
          style={{ borderColor: "var(--border-color)" }}
        >
          <input type="checkbox" className="mt-1 w-4 h-4" />
          <div className="flex-1 space-y-2">
            <EditableText
              value={item.title}
              onSave={(value) => handleUpdate("title", value)}
              className="font-medium"
              as="h4"
              placeholder="Nome da tarefa..."
            />
            {checklistPreview.length > 0 ? (
              <div className="space-y-1.5">
                {checklistPreview.slice(0, 5).map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 text-sm text-foreground/80"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        todo.completed
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-foreground/30"
                      }`}
                    >
                      {todo.completed && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span
                      className={
                        todo.completed
                          ? "line-through text-foreground/50"
                          : "text-foreground"
                      }
                    >
                      {todo.text}
                    </span>
                  </div>
                ))}
                {checklistPreview.length > 5 && (
                  <p className="text-xs text-foreground/50">
                    +{checklistPreview.length - 5} itens
                  </p>
                )}
              </div>
            ) : (
              <EditableText
                value={item.content || ""}
                onSave={(value) => handleUpdate("content", value)}
                className="text-sm opacity-70 mt-1"
                placeholder="Descrição da tarefa..."
                multiline
              />
            )}
          </div>
        </div>
      )}

      {item.type === "note" && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center w-5 h-5">
              {getIcon(item.type, 18)}
            </div>
            <EditableText
              value={item.title}
              onSave={(value) => handleUpdate("title", value)}
              className="font-medium flex-1"
              as="h4"
              placeholder="Título da nota..."
            />
          </div>
          <RichTextEditor
            content={item.content || ""}
            onSave={(value) => handleUpdate("content", value)}
            placeholder="Conteúdo da nota..."
          />
        </div>
      )}
    </div>
  );
}

function parseChecklistPreview(raw?: string, children?: HierarchicalItem[]) {
  if (!raw || !raw.trim()) {
    if (children && children.length > 0) {
      return children.map((child, index) => ({
        id: child.id || `child-${index}`,
        text: child.title || "Item",
        completed: false,
      }));
    }
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => {
        if (typeof item === "string") {
          return {
            id: `preview-${index}`,
            text: item,
            completed: false,
          };
        }

        if (typeof item === "object" && item !== null) {
          return {
            id: item.id || `preview-${index}`,
            text: item.text || String(item.text ?? ""),
            completed: Boolean(item.completed),
          };
        }

        return {
          id: `preview-${index}`,
          text: String(item),
          completed: false,
        };
      });
    }
  } catch {
    // Not JSON, treat as plain text list split by newline
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 0) {
      return lines.map((text, index) => ({
        id: `preview-${index}`,
        text,
        completed: false,
      }));
    }
  }

  if (children && children.length > 0) {
    return children.map((child, index) => ({
      id: child.id || `child-${index}`,
      text: child.title || "Item",
      completed: false,
    }));
  }

  return [];
}
