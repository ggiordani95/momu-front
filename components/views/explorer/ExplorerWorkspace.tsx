"use client";

import { Folder as FolderIcon, Plus, X } from "lucide-react";
import { type ItemType } from "@/lib/itemTypes";
import AddItemInline from "@/components/AddItemInline";
import FolderSkeleton from "@/components/files/FolderSkeleton";
import Breadcrumb from "@/components/Breadcrumb";
import FileCard from "@/components/files/FileCard";
import React, { useState, useMemo } from "react";
import type { HierarchicalFile, CreateFileDto, Workspace } from "@/lib/types";
import { findItemById } from "@/lib/utils/hierarchy";
import { useDragAndDrop } from "@/lib/hooks/useDragAndDrop";
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
  onItemDelete?: (id: string) => void;
  loading?: boolean;
  workspaceId?: string;
  pendingItems?: Map<string, { item: HierarchicalFile; data: CreateFileDto }>;
  workspaces?: Workspace[];
  files: HierarchicalFile[]; // Files from Zustand store
}

export function ExplorerWorkspace({
  currentFolderId,
  onFolderClick,
  onItemClick,
  onBack,
  onAddItem,
  onItemUpdate,
  onItemDelete,
  loading = false,
  workspaceId,
  pendingItems,
  workspaces = [],
  files, // Files from Zustand store (passed as prop)
}: ExplorerWorkspaceProps) {
  const isLoading = loading;
  const [showAddItem, setShowAddItem] = useState(false);

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
      : files.filter((file) => !file.parent_id);

    // Sort by order_index
    return [...folderFiles].sort(
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
    workspaceId: workspaceId || "",
    currentFolderId: currentFolderId ?? null,
  });

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
        workspaces={workspaces}
        currentWorkspaceId={workspaceId}
        actionButton={
          <div className="flex items-center gap-3">
            {!showAddItem ? (
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-hover/50"
                style={{
                  color: "var(--foreground)",
                }}
              >
                <Plus size={16} />
                Adicionar Item
              </button>
            ) : (
              <>
                {onAddItem && (
                  <div className="min-w-[400px]">
                    <AddItemInline
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
                  </div>
                )}
                <button
                  onClick={() => setShowAddItem(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-hover/50 shrink-0"
                  style={{
                    color: "var(--foreground)",
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>
              </>
            )}
          </div>
        }
      />

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto p-6">
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
                  onClick={() =>
                    item.type === "folder"
                      ? onFolderClick(item.id)
                      : onItemClick(item)
                  }
                  onRename={onItemUpdate}
                  onDelete={onItemDelete}
                  appearanceOrder={index}
                  draggedItemId={draggedItemId}
                  dragOverItemId={dragOverItemId}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  startRenaming={pendingItems?.has(item.id) || false}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}

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
