"use client";

import { Folder, Plus, X } from "lucide-react";
import { useItems } from "@/lib/contexts/ItemsContext";
import { type ItemType } from "@/lib/itemTypes";
import AddItemInline from "@/components/AddItemInline";
import FolderSkeleton from "@/components/files/FolderSkeleton";
import Breadcrumb from "@/components/Breadcrumb";
import FileCard from "@/components/files/FileCard";
import React, { useState, useEffect, useMemo } from "react";
import type { HierarchicalItem, CreateItemDto } from "@/lib/types";
import { findItemById } from "@/lib/utils/hierarchy";
import { useDragAndDrop } from "@/lib/hooks/useDragAndDrop";

interface ExplorerWorkspaceProps {
  currentFolderId?: string | null;
  onFolderClick: (folderId: string) => void;
  onItemClick: (item: HierarchicalItem) => void;
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
  pendingItems?: Map<string, { item: HierarchicalItem; data: CreateItemDto }>;
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
}: ExplorerWorkspaceProps) {
  const itemsContext = useItems();
  const items = useMemo(() => itemsContext?.items || [], [itemsContext?.items]);
  const [showAddItem, setShowAddItem] = useState(false);

  // Debug: Log items and pending items
  useEffect(() => {
    const itemsArray = itemsContext?.items || [];
    const currentFolder = currentFolderId
      ? findItemById(itemsArray, currentFolderId)
      : null;
    const displayItems = currentFolder
      ? currentFolder.children || []
      : itemsArray.filter((item) => {
          return !item.parent_id || item.id.startsWith("temp-");
        });
    console.log("📋 ExplorerWorkspace items:", {
      itemsCount: itemsArray.length,
      itemsIds: itemsArray.map((i) => i.id),
      displayItemsCount: displayItems.length,
      displayItemsIds: displayItems.map((i) => i.id),
      pendingItemsCount: pendingItems?.size || 0,
      pendingItemsIds: pendingItems ? Array.from(pendingItems.keys()) : [],
    });
  }, [itemsContext?.items, pendingItems, currentFolderId]);

  // Find current folder or use root
  const currentFolder = useMemo(
    () => (currentFolderId ? findItemById(items, currentFolderId) : null),
    [currentFolderId, items]
  );

  const displayItems = useMemo(() => {
    if (currentFolder) {
      return currentFolder.children || [];
    }
    return items.filter((item) => {
      // Show items without parent_id, or optimistic items (temp-*) even if they have parent_id
      // (optimistic items will be moved to correct location when parent is created)
      return !item.parent_id || item.id.startsWith("temp-");
    });
  }, [currentFolder, items]);

  // Sort ALL items together by order_index (folders and files mixed)
  const sortedItems = useMemo(
    () =>
      [...displayItems].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      ),
    [displayItems]
  );

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
      {!loading && (
        <Breadcrumb
          items={items}
          currentFolderId={currentFolderId || null}
          onNavigate={(folderId) => {
            if (folderId) {
              onFolderClick(folderId);
            } else if (onBack) {
              onBack();
            }
          }}
          actionButton={
            !showAddItem ? (
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
              <button
                onClick={() => setShowAddItem(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-hover/50"
                style={{
                  color: "var(--foreground)",
                }}
              >
                <X size={16} />
                Cancelar
              </button>
            )
          }
        />
      )}

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,2fr))] gap-6 w-full">
          {loading ? (
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
                    item.type === "section"
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
              {sortedItems.length === 0 && !showAddItem && !loading && (
                <div className="text-center py-10 text-foreground/40">
                  <Folder size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Esta pasta está vazia</p>
                </div>
              )}
            </>
          )}

          {/* Add Item Form */}
          {showAddItem && onAddItem && (
            <div className="col-span-full">
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
        </div>
      </div>
    </div>
  );
}
