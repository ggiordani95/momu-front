"use client";

import { useState } from "react";
import { Trash2, RotateCcw, X, Play } from "lucide-react";
import Image from "next/image";
import { getItemTypeIcon, type ItemType } from "@/lib/itemTypes";
import React from "react";
import ContextMenu from "./ContextMenu";
import { useTrashItems } from "@/lib/hooks/useTrash";
import { useRestoreItem, usePermanentDeleteItem } from "@/lib/hooks/useItems";

import type { TrashItem } from "@/lib/types";

interface TrashViewProps {
  topicId: string;
  onRestore?: () => void;
  onPermanentDelete?: (id: string) => void;
}

export default function TrashView({
  topicId,
  onRestore,
  onPermanentDelete,
}: TrashViewProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: TrashItem;
  } | null>(null);

  // React Query hooks
  const { data: trashItems = [], isLoading: loading } = useTrashItems(topicId);
  const restoreItemMutation = useRestoreItem(topicId);
  const permanentDeleteMutation = usePermanentDeleteItem(topicId);

  const handleRestore = async (id: string) => {
    try {
      await restoreItemMutation.mutateAsync(id);
      // Call onRestore callback if provided
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error("Error restoring item:", error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este item?")) {
      return;
    }

    try {
      await permanentDeleteMutation.mutateAsync(id);
      if (onPermanentDelete) {
        onPermanentDelete(id);
      }
    } catch (error) {
      console.error("Error permanently deleting item:", error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: TrashItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-foreground/60">Carregando lixeira...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-3">
          <Trash2 size={24} className="text-foreground/60" />
          <h2 className="text-xl font-semibold">Lixeira</h2>
          {trashItems.length > 0 && (
            <span className="text-sm text-foreground/40">
              ({trashItems.length} {trashItems.length === 1 ? "item" : "itens"})
            </span>
          )}
        </div>
      </div>

      {/* Trash Items */}
      <div className="flex-1 overflow-y-auto p-6">
        {trashItems.length === 0 ? (
          <div className="text-center py-10 text-foreground/40">
            <Trash2 size={48} className="mx-auto mb-4 opacity-30" />
            <p>A lixeira está vazia</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,2fr))] gap-6">
            {trashItems.map((item) => (
              <TrashItemCard
                key={item.id}
                item={item}
                onContextMenu={(e) => handleContextMenu(e, item)}
                onRestore={() => handleRestore(item.id)}
                onPermanentDelete={() => handlePermanentDelete(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={[
            {
              label: "Restaurar",
              icon: <RotateCcw size={16} />,
              onClick: () => {
                handleRestore(contextMenu.item.id);
                setContextMenu(null);
              },
            },
            { label: "", onClick: () => {}, separator: true },
            {
              label: "Excluir permanentemente",
              icon: <X size={16} />,
              onClick: () => {
                handlePermanentDelete(contextMenu.item.id);
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

function TrashItemCard({
  item,
  onContextMenu,
  onRestore,
  onPermanentDelete,
}: {
  item: TrashItem;
  onContextMenu: (e: React.MouseEvent) => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const IconComponent = getItemTypeIcon(item.type);
  const icon = IconComponent
    ? React.createElement(IconComponent, { size: 48 })
    : null;

  const thumbnailUrl =
    item.type === "video" && item.youtube_id
      ? `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`
      : null;

  const deletedDate = item.deleted_at
    ? new Date(item.deleted_at).toLocaleDateString("pt-BR")
    : null;

  return (
    <div
      onContextMenu={onContextMenu}
      className="flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all hover:bg-hover/30 group relative opacity-60"
      style={{ borderColor: "var(--border-color)" }}
    >
      {item.type === "section" ? (
        <div className="relative">
          <Image
            src="/Violet.png"
            alt="Folder"
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
            unoptimized
          />
        </div>
      ) : thumbnailUrl ? (
        <div className="relative w-full aspect-video rounded overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={item.title}
            width={480}
            height={360}
            className="w-full h-full object-cover rounded-2xl"
            unoptimized
          />
          <div className="absolute inset-0 rounded-2xl bg-black/20 flex items-center justify-center">
            <Play
              size={32}
              className="text-white drop-shadow-lg"
              fill="white"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-24 h-24">{icon}</div>
      )}
      <div className="flex flex-col items-center gap-1 w-full">
        <span className="text-sm font-medium text-center truncate w-full">
          {item.title}
        </span>
        {deletedDate && (
          <span className="text-xs text-foreground/40">
            Excluído em {deletedDate}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          className="p-2 rounded-lg hover:bg-hover/50 transition-colors"
          title="Restaurar"
        >
          <RotateCcw size={16} className="text-foreground/60" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPermanentDelete();
          }}
          className="p-2 rounded-lg hover:bg-hover/50 transition-colors"
          title="Excluir permanentemente"
        >
          <X size={16} className="text-red-500/60" />
        </button>
      </div>
    </div>
  );
}
