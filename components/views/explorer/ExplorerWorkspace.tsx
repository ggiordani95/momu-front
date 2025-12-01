"use client";

import { Folder as FolderIcon } from "lucide-react";
import { type ItemType } from "@/lib/itemTypes";
import AddItemModal from "@/components/AddItemModal";
import FolderSkeleton from "@/components/files/FolderSkeleton";
import Breadcrumb from "@/components/Breadcrumb";
import FileCard from "@/components/files/FileCard";
import React, { useState, useMemo, useEffect } from "react";
import type { HierarchicalFile, CreateFileDto } from "@/lib/types";
import { findItemById } from "@/lib/utils/hierarchy";
import { useDragAndDrop } from "@/lib/hooks/useDragAndDrop";
import { useMultiSelect } from "@/lib/hooks/useMultiSelect";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
interface ExplorerWorkspaceProps {
  currentFolderId?: string | null;
  onFolderClick: (folderId: string) => void;
  onItemClick: (item: HierarchicalFile) => void;
  onBack?: () => void;
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
  onAddItem,
  onItemUpdate,
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
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    draggedItemId,
    dragOverItemId,
  } = useDragAndDrop({
    workspaceId: currentWorkspace?.id || "",
    currentFolderId: currentFolderId ?? null,
  });

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
          } else if (onBack) {
            onBack();
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,2fr))] gap-6 w-full">
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
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  startRenaming={false}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
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
