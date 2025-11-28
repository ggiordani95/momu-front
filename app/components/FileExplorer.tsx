"use client";

import { Folder, Play, Plus, FileEdit, Trash2 } from "lucide-react";
import Image from "next/image";
import { useItems } from "./ItemsContext";
import { getItemTypeIcon, type ItemType } from "@/lib/itemTypes";
import AddItemInline from "./AddItemInline";
import ContextMenu, { type ContextMenuAnchorRect } from "./ContextMenu";
import FolderSkeleton from "./FolderSkeleton";
import Breadcrumb from "./Breadcrumb";
import React, { useState, useRef, useEffect } from "react";
import type { HierarchicalItem } from "@/lib/types";

const getAnchorRect = (element: HTMLElement): ContextMenuAnchorRect => {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

interface FileExplorerProps {
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
}

export default function FileExplorer({
  currentFolderId,
  onFolderClick,
  onItemClick,
  onBack,
  onAddItem,
  onItemUpdate,
  onItemDelete,
  loading = false,
}: FileExplorerProps) {
  const itemsContext = useItems();
  const items = itemsContext?.items || [];
  const [showAddItem, setShowAddItem] = useState(false);

  // Find current folder or use root
  const currentFolder = currentFolderId
    ? findItemById(items, currentFolderId)
    : null;

  const displayItems = currentFolder
    ? currentFolder.children || []
    : items.filter((item) => !item.parent_id);

  // Separate folders and files
  const folders = displayItems.filter(
    (item: HierarchicalItem) => item.type === "section"
  );
  const files = displayItems.filter(
    (item: HierarchicalItem) => item.type !== "section"
  );

  // Sort by order_index
  const sortedFolders = [...folders].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );
  const sortedFiles = [...files].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

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
        />
      )}

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,2fr))] gap-6">
          {loading ? (
            <>
              {/* Loading Skeletons */}
              {[...Array(3)].map((_, i) => (
                <FolderSkeleton key={`folder-skeleton-${i}`} />
              ))}
            </>
          ) : (
            <>
              {/* Folders */}
              {sortedFolders.map((folder, index) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => onFolderClick(folder.id)}
                  onRename={onItemUpdate}
                  onDelete={onItemDelete}
                  appearanceOrder={index}
                />
              ))}

              {/* Files */}
              {sortedFiles.map((file, index) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onClick={() => onItemClick(file)}
                  onRename={onItemUpdate}
                  onDelete={onItemDelete}
                  appearanceOrder={sortedFolders.length + index}
                />
              ))}

              {/* Empty State */}
              {displayItems.length === 0 && !showAddItem && (
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

          {/* Add Item Button */}
          {!showAddItem && onAddItem && (
            <button
              onClick={() => setShowAddItem(true)}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed transition-all hover:bg-hover/30 hover:border-solid group min-h-[180px]"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="p-3 rounded-full bg-hover/50 group-hover:bg-hover transition-colors">
                <Plus size={24} className="text-foreground/60" />
              </div>
              <span className="text-sm font-medium text-foreground/60 group-hover:text-foreground">
                Adicionar Item
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderCard({
  folder,
  onClick,
  onRename,
  onDelete,
  appearanceOrder = 0,
}: {
  folder: HierarchicalItem;
  onClick: () => void;
  onRename?: (id: string, field: "title" | "content", value: string) => void;
  onDelete?: (id: string) => void;
  appearanceOrder?: number;
}) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    anchorRect: ContextMenuAnchorRect;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const anchorRect = getAnchorRect(target);

    setContextMenu({
      x: anchorRect.right + 8,
      y: anchorRect.top,
      anchorRect,
    });
  };

  const handleRename = () => {
    setIsRenaming(true);
    setRenameValue(folder.title);
    setContextMenu(null);
    // Focus input after a short delay
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 10);
  };

  const handleRenameSave = () => {
    if (renameValue.trim() && renameValue.trim() !== folder.title && onRename) {
      onRename(folder.id, "title", renameValue.trim());
    } else {
      setRenameValue(folder.title);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(folder.title);
    setIsRenaming(false);
  };

  useEffect(() => {
    if (!isRenaming) {
      const timer = setTimeout(() => {
        setRenameValue(folder.title);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [folder.title, isRenaming]);

  return (
    <div
      className="flex flex-col items-center gap-2 animate-item-entry"
      style={{
        animationDelay: `${appearanceOrder * 50}ms`,
      }}
    >
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className="flex flex-col h-full justify-center items-center gap-3 p-4 rounded-3xl transition-all hover:bg-hover/50 hover:scale-105 group w-full"
      >
        <div className="relative">
          <Image
            src="/icons/folder.png"
            alt="Folder"
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
            unoptimized
          />
          {folder.children && folder.children.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
              {folder.children.length}
            </span>
          )}
        </div>
        {!isRenaming && (
          <span className="text-sm font-medium text-center truncate w-full group-hover:text-foreground">
            {folder.title}
          </span>
        )}
      </button>
      {isRenaming && (
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleRenameSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleRenameCancel();
            }
          }}
          className="w-full px-2 py-1 text-sm text-center rounded border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          anchorRect={contextMenu.anchorRect}
          options={[
            {
              label: "Renomear",
              icon: <FileEdit size={16} />,
              onClick: handleRename,
            },
            {
              label: "Excluir",
              icon: <Trash2 size={16} />,
              onClick: () => {
                onDelete?.(folder.id);
                setContextMenu(null);
              },
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function FileCard({
  file,
  onClick,
  onRename,
  onDelete,
  appearanceOrder = 0,
}: {
  file: HierarchicalItem;
  onClick: () => void;
  onRename?: (id: string, field: "title" | "content", value: string) => void;
  onDelete?: (id: string) => void;
  appearanceOrder?: number;
}) {
  const IconComponent = getItemTypeIcon(file.type);
  const icon = IconComponent
    ? React.createElement(IconComponent, { size: 48 })
    : null;

  // YouTube thumbnail for videos - use higher quality
  const thumbnailUrl =
    file.type === "video" && file.youtube_id
      ? `https://img.youtube.com/vi/${file.youtube_id}/hqdefault.jpg`
      : null;

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    anchorRect: ContextMenuAnchorRect;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const anchorRect = getAnchorRect(target);

    setContextMenu({
      x: anchorRect.right + 8,
      y: anchorRect.top,
      anchorRect,
    });
  };

  const handleRename = () => {
    setIsRenaming(true);
    setRenameValue(file.title);
    setContextMenu(null);
    // Focus input after a short delay
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 10);
  };

  const handleRenameSave = () => {
    if (renameValue.trim() && renameValue.trim() !== file.title && onRename) {
      onRename(file.id, "title", renameValue.trim());
    } else {
      setRenameValue(file.title);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(file.title);
    setIsRenaming(false);
  };

  useEffect(() => {
    if (!isRenaming) {
      const timer = setTimeout(() => {
        setRenameValue(file.title);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [file.title, isRenaming]);

  // Parse checklist items for tasks to show count
  const taskItemCount = React.useMemo(() => {
    if (file.type === "task" && file.content) {
      try {
        const parsed = JSON.parse(file.content);
        if (Array.isArray(parsed)) {
          const completed = parsed.filter(
            (item: { completed?: boolean }) => item.completed
          ).length;
          return { total: parsed.length, completed };
        }
      } catch {
        // Not JSON, ignore
      }
    }
    return null;
  }, [file.type, file.content]);

  return (
    <div
      className="flex flex-col items-center gap-2 animate-item-entry"
      style={{
        animationDelay: `${appearanceOrder * 50}ms`,
      }}
    >
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className="flex flex-col h-full justify-center items-center gap-3 p-4 rounded-3xl transition-all hover:bg-hover/50 hover:scale-105 group w-full"
      >
        <div className="relative">
          {thumbnailUrl ? (
            <div className="relative w-16 h-16 rounded overflow-hidden">
              <Image
                src={thumbnailUrl}
                alt={file.title}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Play
                  size={20}
                  className="text-white drop-shadow-lg"
                  fill="white"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-16 h-16">
              {icon}
            </div>
          )}
          {/* Badge for task items showing completed/total */}
          {taskItemCount && (
            <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
              {taskItemCount.completed}/{taskItemCount.total}
            </span>
          )}
        </div>
        {!isRenaming && (
          <span className="text-sm font-medium text-center truncate w-full group-hover:text-foreground">
            {file.title}
          </span>
        )}
      </button>
      {isRenaming && (
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleRenameSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleRenameCancel();
            }
          }}
          className="w-full px-2 py-1 text-sm text-center rounded border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          anchorRect={contextMenu.anchorRect}
          options={[
            {
              label: "Renomear",
              icon: <FileEdit size={16} />,
              onClick: handleRename,
            },
            {
              label: "Excluir",
              icon: <Trash2 size={16} />,
              onClick: () => {
                if (
                  onDelete &&
                  confirm(`Tem certeza que deseja excluir "${file.title}"?`)
                ) {
                  onDelete(file.id);
                }
                setContextMenu(null);
              },
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// Helper function
function findItemById(
  items: HierarchicalItem[],
  id: string
): HierarchicalItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}
