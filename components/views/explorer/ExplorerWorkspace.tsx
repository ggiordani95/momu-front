"use client";

import { Folder as FolderIcon } from "lucide-react";
import { type ItemType } from "@/lib/itemTypes";
import AddItemModal from "@/components/AddItemModal";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useState, useMemo, useEffect } from "react";
import type { HierarchicalFile, CreateFileDto } from "@/lib/types";
import {
  FileCard,
  FolderSkeleton,
  useDragAndDrop,
  findItemById,
} from "@/modules/files";
import { useMultiSelect } from "@/lib/hooks/useMultiSelect";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
interface ExplorerWorkspaceProps {
  currentFolderId?: string | null;
  onFolderClick: (folderId: string) => void;
  onItemClick: (item: HierarchicalFile) => void;
  onBack?: () => void;
  onNavigateToWorkspaceRoot?: () => void;
  onAddItem?: (item: {
    type: ItemType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => void;
  onItemUpdate?: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  onItemMove?: (id: string, parentId: string | null) => void;
  onItemComplete?: (id: string, completed: boolean) => void;
  onItemDelete?: (id: string) => void;
  onItemDeleteBatch?: (ids: string[]) => void;
  loading?: boolean;
  pendingItems?: Map<string, { item: HierarchicalFile; data: CreateFileDto }>;
  files: HierarchicalFile[]; // Files from Zustand store
}

export function ExplorerWorkspace({
  currentFolderId,
  onFolderClick,
  onItemClick,
  onBack,
  onNavigateToWorkspaceRoot,
  onAddItem,
  onItemUpdate,
  onItemMove,
  onItemComplete,
  onItemDelete,
  onItemDeleteBatch,
  loading = false,
  pendingItems,
  files, // Files from Zustand store (passed as prop)
}: ExplorerWorkspaceProps) {
  const isLoading = loading;
  const [showAddItem, setShowAddItem] = useState(false);

  // Listen for custom event to open add item modal
  useEffect(() => {
    const handleOpenAddItem = () => {
      setShowAddItem(true);
    };
    window.addEventListener(
      "openAddItemModal",
      handleOpenAddItem as EventListener
    );
    return () => {
      window.removeEventListener(
        "openAddItemModal",
        handleOpenAddItem as EventListener
      );
    };
  }, []);

  const { currentWorkspace } = useWorkspaceStore();

  // Find current folder or use root - memoize with stable reference
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    const folder = findItemById(files, currentFolderId);
    // If folder not found but currentFolderId is set, it might be an empty folder
    // Return a placeholder object to allow navigation
    if (!folder && currentFolderId) {
      return {
        id: currentFolderId,
        type: "folder" as const,
        title: "",
        children: [],
        workspace_id: "",
        created_at: "",
        updated_at: "",
      } as HierarchicalFile;
    }
    return folder;
  }, [currentFolderId, files]);

  // Filter and sort files for current folder
  const sortedItems = useMemo(() => {
    const folderFiles = currentFolderId
      ? currentFolder?.children || []
      : files.filter((file) => !file.parent_id && file.active !== false);

    // Filter out deleted files (active === false) - they should only appear in trash
    const activeFiles = folderFiles.filter(
      (file: HierarchicalFile) => file.active !== false
    );

    // Sort by order_index
    return [...activeFiles].sort(
      (a, b) => (a.order_index || 0) - (b.order_index || 0)
    );
  }, [currentFolderId, currentFolder, files]);

  const {
    handleDragStart: baseHandleDragStart,
    handleDragOver: baseHandleDragOver,
    handleDragLeave: baseHandleDragLeave,
    handleDrop: baseHandleDrop,
    handleDragEnd: baseHandleDragEnd,
    draggedItemId,
    dragOverItemId,
  } = useDragAndDrop({
    workspaceId: currentWorkspace?.id || "",
    currentFolderId: currentFolderId ?? null,
  });

  // Custom handleDrop that supports moving files into folders
  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItemId || !onItemMove) {
      // Fallback to default reorder behavior
      baseHandleDrop(e, targetItemId);
      return;
    }

    // Find the dragged item and target item
    const draggedItem = findItemById(files, draggedItemId);
    const targetItem = findItemById(files, targetItemId);

    if (!draggedItem || !targetItem) {
      baseHandleDrop(e, targetItemId);
      return;
    }

    // If target is a folder and dragged item is not a folder, move it into the folder
    if (targetItem.type === "folder" && draggedItem.type !== "folder") {
      // Check if the item is already in this folder
      if (draggedItem.parent_id === targetItem.id) {
        // Already in this folder, just reorder
        baseHandleDrop(e, targetItemId);
        return;
      }

      // Move the file into the folder
      console.log("[ExplorerWorkspace] Moving file into folder:", {
        fileId: draggedItem.id,
        folderId: targetItem.id,
      });
      onItemMove(draggedItem.id, targetItem.id);
      baseHandleDragEnd();
      return;
    }

    // If dragging a folder onto another folder, don't allow (prevent nesting issues)
    if (targetItem.type === "folder" && draggedItem.type === "folder") {
      console.log("[ExplorerWorkspace] Cannot move folder into folder");
      baseHandleDragEnd();
      return;
    }

    // For all other cases (reordering within same parent), use default reorder behavior
    baseHandleDrop(e, targetItemId);
  };

  // Multi-select functionality
  const {
    selectedIds,
    isSelecting,
    selectionBox,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleFileClick,
    clearSelection,
  } = useMultiSelect();

  // Handle Delete key to delete selected files
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Delete if there are selected files and not typing in an input
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.size > 0 &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Delete all selected files in batch
        // Convert Set to Array to ensure we process all items
        const fileIdsArray = Array.from(selectedIds);

        // Use batch delete if available (more efficient), otherwise delete one by one
        if (onItemDeleteBatch && fileIdsArray.length > 1) {
          onItemDeleteBatch(fileIdsArray);
        } else if (onItemDelete) {
          // Fallback to individual deletes
          fileIdsArray.forEach((fileId) => {
            onItemDelete(fileId);
          });
        }

        // Clear selection after deleting
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIds, onItemDelete, onItemDeleteBatch, clearSelection]);

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb Timeline */}
      <Breadcrumb
        items={files}
        currentFolderId={currentFolderId || null}
        onNavigate={(folderId) => {
          if (folderId) {
            onFolderClick(folderId);
          } else {
            // When clicking workspace name (folderId is null), navigate to workspace root
            if (onNavigateToWorkspaceRoot) {
              onNavigateToWorkspaceRoot();
            } else if (onBack) {
              onBack();
            }
          }
        }}
      />

      {/* File Grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={(e) => {
          // Allow dropping on empty area to move to root
          if (draggedItemId && onItemMove) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(e) => {
          // Handle drop on empty area to move file to root
          if (draggedItemId && onItemMove) {
            e.preventDefault();
            e.stopPropagation();

            const draggedItem = findItemById(files, draggedItemId);
            if (draggedItem && draggedItem.parent_id !== null) {
              console.log("[ExplorerWorkspace] Moving file to root:", {
                fileId: draggedItem.id,
              });
              onItemMove(draggedItem.id, null);
              baseHandleDragEnd();
            }
          }
        }}
      >
        {/* Selection Box */}
        {isSelecting && selectionBox && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-50"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
            }}
          />
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,2fr))] gap-6 w-full">
          {isLoading ? (
            <>
              {/* Loading Skeletons */}
              {[...Array(3)].map((_, i) => (
                <FolderSkeleton key={`folder-skeleton-${i}`} />
              ))}
            </>
          ) : (
            <>
              {/* All items (folders and files together, sorted by order_index) */}
              {sortedItems.map((item, index) => (
                <FileCard
                  key={item.id}
                  file={item}
                  onClick={(e) => {
                    // Don't handle click if it's part of a drag selection
                    if (isSelecting) {
                      return;
                    }

                    // Don't handle left click for selection - only right button drag selects
                    // But still allow Ctrl/Cmd/Shift for multi-select
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                      handleFileClick(item.id, e);
                      e.stopPropagation();
                      return;
                    }

                    // For single click without modifiers: just trigger normal click action
                    // Don't select with left click
                    if (item.type === "folder") {
                      onFolderClick(item.id);
                    } else {
                      onItemClick(item);
                    }
                  }}
                  onRename={onItemUpdate}
                  onComplete={onItemComplete}
                  onDelete={onItemDelete}
                  appearanceOrder={index}
                  draggedItemId={draggedItemId}
                  dragOverItemId={dragOverItemId}
                  onDragStart={baseHandleDragStart}
                  onDragOver={baseHandleDragOver}
                  startRenaming={false}
                  onDragLeave={baseHandleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={baseHandleDragEnd}
                  isSelected={selectedIds.has(item.id)}
                />
              ))}

              {/* Add Item Modal */}
              {showAddItem && onAddItem && (
                <AddItemModal
                  onAdd={(item) => {
                    onAddItem({
                      ...item,
                      parent_id: currentFolderId || undefined,
                    });
                    setShowAddItem(false);
                  }}
                  onCancel={() => setShowAddItem(false)}
                  parentId={currentFolderId || undefined}
                  allowSections={true}
                />
              )}

              {/* Empty State */}
              {sortedItems.length === 0 && !showAddItem && !isLoading && (
                <div className="text-center py-10 text-foreground/40">
                  <FolderIcon size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Esta pasta está vazia</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
