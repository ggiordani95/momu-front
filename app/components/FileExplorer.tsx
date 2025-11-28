"use client";

import { Folder, Play, ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
import { useItems } from "./ItemsContext";
import { getItemTypeIcon, type ItemType } from "@/lib/itemTypes";
import AddItemInline from "./AddItemInline";
import React, { useState } from "react";

interface TopicItem {
  id: string;
  type: ItemType;
  title: string;
  content?: string;
  youtube_id?: string;
  youtube_url?: string;
  parent_id?: string;
  children?: TopicItem[];
  order_index?: number;
}

interface FileExplorerProps {
  currentFolderId?: string | null;
  onFolderClick: (folderId: string) => void;
  onItemClick: (item: TopicItem) => void;
  onBack?: () => void;
  onAddItem?: (item: {
    type: ItemType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => void;
}

export default function FileExplorer({
  currentFolderId,
  onFolderClick,
  onItemClick,
  onBack,
  onAddItem,
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
  const folders = displayItems.filter((item) => item.type === "section");
  const files = displayItems.filter((item) => item.type !== "section");

  // Sort by order_index
  const sortedFolders = [...folders].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );
  const sortedFiles = [...files].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      {currentFolder && (
        <div
          className="p-4 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={16} className="rotate-180" />
            Voltar
          </button>
          <h2 className="mt-2 text-lg font-semibold">{currentFolder.title}</h2>
        </div>
      )}

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,2fr))] gap-6">
          {/* Folders */}
          {sortedFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={() => onFolderClick(folder.id)}
            />
          ))}

          {/* Files */}
          {sortedFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onClick={() => onItemClick(file)}
            />
          ))}

          {/* Empty State */}
          {displayItems.length === 0 && !showAddItem && (
            <div className="col-span-full text-center py-20 text-foreground/40">
              <Folder size={48} className="mx-auto mb-4 opacity-30" />
              <p>Esta pasta está vazia</p>
            </div>
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
}: {
  folder: TopicItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col justify-center items-center gap-3 p-4 rounded-3xl transition-all hover:bg-hover/50 hover:scale-105 group"
    >
      <div className="relative">
        <Image
          src="/Violet.png"
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
      <span className="text-sm font-medium text-center truncate w-full group-hover:text-foreground">
        {folder.title}
      </span>
    </button>
  );
}

function FileCard({ file, onClick }: { file: TopicItem; onClick: () => void }) {
  const IconComponent = getItemTypeIcon(file.type);
  const icon = IconComponent
    ? React.createElement(IconComponent, { size: 48 })
    : null;

  // YouTube thumbnail for videos - use higher quality
  const thumbnailUrl =
    file.type === "video" && file.youtube_id
      ? `https://img.youtube.com/vi/${file.youtube_id}/hqdefault.jpg`
      : null;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 max-w-[320px] hover:scale-105 group relative overflow-hidden"
    >
      {thumbnailUrl ? (
        <div className="relative w-full aspect-video rounded overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={file.title}
            width={480}
            height={360}
            className="w-full h-full object-cover rounded-2xl"
            unoptimized
          />
          <div className="absolute inset-0 rounded-2xl bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <Play
              size={32}
              className="text-white drop-shadow-lg"
              fill="white"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-24 h-24 ">
          {icon}
        </div>
      )}
      <span className="text-sm font-medium text-center truncate w-full group-hover:text-foreground">
        {file.title}
      </span>
    </button>
  );
}

// Helper function
function findItemById(items: TopicItem[], id: string): TopicItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}
