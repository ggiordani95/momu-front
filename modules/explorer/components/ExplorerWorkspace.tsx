"use client";

import { Folder as FolderIcon } from "lucide-react";
import { type FileType } from "@/modules/files/types/filesTypes";
import AddItemModal from "@/modules/editor/components/AddItemModal";
import Breadcrumb from "@/components/Breadcrumb";
import React, { useState, useMemo, useEffect } from "react";
import type { HierarchicalFile, CreateFileDto } from "@/lib/types";
import {
  FileCard,
  FolderSkeleton,
  useDragAndDrop,
  findFileById,
} from "@/modules/files";
import { useMultiSelect } from "@/lib/hooks/useMultiSelect";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
interface ExplorerWorkspaceProps {
  currentFileId?: string | null;
  onFileClick: (fileId: string) => void;
  onBack?: () => void;
  onNavigateToWorkspaceRoot?: () => void;
  onAddFile?: (file: CreateFileDto) => void;
  onFileUpdate?: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  onFileMove?: (id: string, parentId: string | null) => void;
  onFileComplete?: (id: string, completed: boolean) => void;
  onFileDelete?: (id: string) => void;
  onFileDeleteBatch?: (ids: string[]) => void;
  loading?: boolean;
  pendingFiles?: Map<string, { file: HierarchicalFile; data: CreateFileDto }>;
  files: HierarchicalFile[]; // Files from Zustand store
}

export function ExplorerWorkspace({
  currentFileId,
  onFileClick,
  onBack,
  onNavigateToWorkspaceRoot,
  onAddFile,
  onFileUpdate,
  onFileMove,
  onFileComplete,
  onFileDelete,
  onFileDeleteBatch,
  loading = false,
  pendingFiles,
  files,
}: ExplorerWorkspaceProps) {
  const isLoading = loading;
  const [showAddFile, setShowAddFile] = useState(false);

  // Listen for custom event to open add item modal
  useEffect(() => {
    const handleOpenAddFile = () => {
      setShowAddFile(true);
    };
    window.addEventListener(
      "openAddFileModal",
      handleOpenAddFile as EventListener
    );
    return () => {
      window.removeEventListener(
        "openAddFileModal",
        handleOpenAddFile as EventListener
      );
    };
  }, []);

  const { currentWorkspace } = useWorkspaceStore();

  // Find current folder or use root - memoize with stable reference
  const currentFolder = useMemo(() => {
    if (!currentFileId) return null;
    const file = findFileById(files, currentFileId);
    // If folder not found but currentFolderId is set, it might be an empty folder
    // Return a placeholder object to allow navigation
    if (!file && currentFileId) {
      return {
        id: currentFileId,
        type: "folder" as const,
        title: "",
        children: [],
        workspace_id: "",
        created_at: "",
        updated_at: "",
      } as HierarchicalFile;
    }
    return file;
  }, [currentFileId, files]);

  // Filter and sort files for current folder
  const sortedFiles = useMemo(() => {
    return files.filter((file) => file.parent_id === currentFileId);
  }, [currentFileId, files]);

  const {
    handleDragStart: baseHandleDragStart,
    handleDragOver: baseHandleDragOver,
    handleDragLeave: baseHandleDragLeave,
    handleDrop: baseHandleDrop,
    handleDragEnd: baseHandleDragEnd,
    draggedFileId,
    dragOverFileId,
  } = useDragAndDrop({
    workspaceId: currentWorkspace?.id || "",
    currentFileId: currentFileId ?? null,
  });

  // Custom handleDrop that supports moving files into folders
  const handleDrop = (e: React.DragEvent, targetFileId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedFileId || !onFileMove) {
      // Fallback to default reorder behavior
      baseHandleDrop(e, targetFileId);
      return;
    }

    // Find the dragged item and target item
    const draggedFile = findFileById(files, draggedFileId);
    const targetFile = findFileById(files, targetFileId);

    if (!draggedFile || !targetFile) {
      baseHandleDrop(e, targetFileId);
      return;
    }

    // If target is a folder and dragged item is not a folder, move it into the folder
    if (targetFile.type === "folder" && draggedFile.type !== "folder") {
      // Check if the item is already in this folder
      if (draggedFile.parent_id === targetFile.id) {
        // Already in this folder, just reorder
        baseHandleDrop(e, targetFileId);
        return;
      }

      // Move the file into the folder
      console.log("[ExplorerWorkspace] Moving file into folder:", {
        fileId: draggedFile.id,
        folderId: targetFile.id,
      });
      onFileMove(draggedFile.id, targetFile.id);
      baseHandleDragEnd();
      return;
    }

    // If dragging a folder onto another folder, don't allow (prevent nesting issues)
    if (targetFile.type === "folder" && draggedFile.type === "folder") {
      console.log("[ExplorerWorkspace] Cannot move folder into folder");
      baseHandleDragEnd();
      return;
    }

    // For all other cases (reordering within same parent), use default reorder behavior
    baseHandleDrop(e, targetFileId);
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
        if (onFileDeleteBatch && fileIdsArray.length > 1) {
          onFileDeleteBatch(fileIdsArray);
        } else if (onFileDelete) {
          // Fallback to individual deletes
          fileIdsArray.forEach((fileId) => {
            onFileDelete(fileId);
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
  }, [selectedIds, onFileDelete, onFileDeleteBatch, clearSelection]);

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb Timeline */}
      <Breadcrumb
        items={files}
        currentFolderId={currentFileId || null}
        onNavigate={(folderId) => {
          if (folderId) {
            onFileClick(folderId);
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
          if (draggedFileId && onFileMove) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(e) => {
          // Handle drop on empty area to move file to root
          if (draggedFileId && onFileMove) {
            e.preventDefault();
            e.stopPropagation();

            const draggedFile = findFileById(files, draggedFileId);
            if (draggedFile && draggedFile.parent_id !== null) {
              console.log("[ExplorerWorkspace] Moving file to root:", {
                fileId: draggedFile.id,
              });
              onFileMove(draggedFile.id, null);
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
              {sortedFiles.map((file, index) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onClick={(e) => {
                    // Don't handle click if it's part of a drag selection
                    if (isSelecting) {
                      return;
                    }

                    // Don't handle left click for selection - only right button drag selects
                    // But still allow Ctrl/Cmd/Shift for multi-select
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                      handleFileClick(file.id, e);
                      e.stopPropagation();
                      return;
                    }

                    // For single click without modifiers: just trigger normal click action
                    // Don't select with left click
                    if (file.type === "folder") {
                      onFileClick(file.id);
                    } else {
                      onFileClick(file.id);
                    }
                  }}
                  onRename={onFileUpdate}
                  onComplete={onFileComplete}
                  onDelete={onFileDelete}
                  appearanceOrder={index}
                  draggedFileId={draggedFileId}
                  dragOverFileId={dragOverFileId}
                  onDragStart={baseHandleDragStart}
                  onDragOver={baseHandleDragOver}
                  startRenaming={false}
                  onDragLeave={baseHandleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={baseHandleDragEnd}
                  isSelected={selectedIds.has(file.id)}
                />
              ))}

              {/* Add Item Modal */}
              {showAddFile && onAddFile && (
                <AddItemModal
                  onAdd={(file: CreateFileDto) => {
                    onAddFile({
                      ...file,
                      parent_id: currentFileId || undefined,
                    });
                    setShowAddFile(false);
                  }}
                  onCancel={() => setShowAddFile(false)}
                  parentId={currentFileId || undefined}
                  allowSections={true}
                />
              )}

              {/* Empty State */}
              {sortedFiles.length === 0 && !showAddFile && !isLoading && (
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
