"use client";

import { useState, useRef, useEffect } from "react";
import { FileEdit, Trash2, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import ContextMenu, {
  type ContextMenuAnchorRect,
} from "../editors/ContextMenu";
import { ExplorerIcon } from "@/components/views/explorer/ExplorerIcon";
import React from "react";
import type { HierarchicalFile } from "@/lib/types";

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

interface FileCardProps {
  file: HierarchicalFile;
  onClick: (e: React.MouseEvent) => void;
  onRename?: (id: string, field: "title" | "content", value: string) => void;
  onDelete?: (id: string) => void;
  appearanceOrder?: number;
  draggedItemId?: string | null;
  dragOverItemId?: string | null;
  onDragStart?: (itemId: string) => void;
  onDragOver?: (e: React.DragEvent, itemId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, itemId: string) => void;
  onDragEnd?: () => void;
  isTrashView?: boolean;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  startRenaming?: boolean; // If true, start in renaming mode
  isSelected?: boolean; // If true, file is selected in multi-select mode
}

export default function FileCard({
  file,
  onClick,
  onRename,
  onDelete,
  appearanceOrder = 0,
  draggedItemId,
  dragOverItemId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isTrashView = false,
  onRestore,
  onPermanentDelete,
  startRenaming = false,
  isSelected = false,
}: FileCardProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    anchorRect: ContextMenuAnchorRect;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(startRenaming);
  const [renameValue, setRenameValue] = useState(file.title);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const hasStartedRenamingRef = useRef(false);

  // If startRenaming prop changes to true, start renaming
  useEffect(() => {
    if (startRenaming && !isRenaming && !hasStartedRenamingRef.current) {
      hasStartedRenamingRef.current = true;
      const timeoutId = setTimeout(() => {
        setIsRenaming(true);
        setRenameValue(file.title);
        setTimeout(() => {
          renameInputRef.current?.focus();
          renameInputRef.current?.select();
        }, 10);
      }, 0);
      return () => clearTimeout(timeoutId);
    } else if (!startRenaming && isRenaming && hasStartedRenamingRef.current) {
      hasStartedRenamingRef.current = false;
      const timeoutId = setTimeout(() => {
        setIsRenaming(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [startRenaming, isRenaming, file.title]);

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
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 10);
  };

  const handleRenameSave = () => {
    const isOptimisticItem = file.id.startsWith("temp-");
    if (renameValue.trim() && onRename) {
      if (isOptimisticItem || renameValue.trim() !== file.title) {
        onRename(file.id, "title", renameValue.trim());
      } else {
        setRenameValue(file.title);
      }
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

  return (
    <div
      data-file-id={file.id}
      className="flex flex-col items-center gap-2 animate-item-entry w-full"
      style={{
        animationDelay: `${appearanceOrder * 50}ms`,
      }}
    >
      <button
        draggable={!!onDragStart && !isTrashView}
        onDragStart={(e) => {
          if (onDragStart && !isTrashView) {
            onDragStart(file.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", file.id);
          }
        }}
        onDragOver={(e) => {
          if (onDragOver && draggedItemId !== file.id && !isTrashView) {
            onDragOver(e, file.id);
          }
        }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          if (onDrop && !isTrashView) {
            onDrop(e, file.id);
          }
        }}
        onDragEnd={onDragEnd}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`flex flex-col h-full justify-center items-center gap-3 p-4 rounded-3xl transition-all bg-hover/50 hover:scale-105 group w-full min-h-[180px] ${
          draggedItemId === file.id ? "opacity-50" : ""
        } ${
          dragOverItemId === file.id
            ? "ring-2 ring-blue-500 border-2 border-blue-500"
            : ""
        } ${
          isSelected
            ? "ring-2 ring-blue-500 border-2 border-blue-500 bg-blue-500/20"
            : ""
        } ${isTrashView ? "opacity-75" : ""}`}
      >
        <div className="relative w-full flex flex-col items-center">
          {file.type === "video" && file.youtube_id ? (
            <div className="relative w-full aspect-video overflow-hidden rounded-lg">
              <Image
                src={`https://img.youtube.com/vi/${file.youtube_id}/hqdefault.jpg`}
                alt={file.title}
                width={640}
                height={360}
                className="w-full h-full object-cover rounded-lg"
                unoptimized
              />
              {/* Title overlay at the bottom */}
              {!isRenaming && (
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/60 to-transparent p-3">
                  <span className="text-sm font-medium text-white text-center block truncate w-full drop-shadow-lg">
                    {file.title}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center w-16 h-16">
                <ExplorerIcon
                  type={file.type}
                  title={file.title}
                  youtubeId={file.youtube_id}
                  size={48}
                />
              </div>
              {!isRenaming && (
                <span className="text-sm font-medium text-center truncate w-full group-hover:text-foreground mt-2">
                  {file.title}
                </span>
              )}
            </>
          )}
        </div>
      </button>
      {isRenaming && (
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => {
            console.log(`⌨️ [FileCard] Input changed: "${e.target.value}"`);
            setRenameValue(e.target.value);
          }}
          onBlur={() => {
            console.log(`👋 [FileCard] Input onBlur triggered`);
            handleRenameSave();
          }}
          onKeyDown={(e) => {
            console.log(`⌨️ [FileCard] Key pressed: ${e.key}`);
            if (e.key === "Enter") {
              e.preventDefault();
              console.log(
                `⌨️ [FileCard] Enter pressed, calling handleRenameSave`
              );
              handleRenameSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              console.log(
                `⌨️ [FileCard] Escape pressed, calling handleRenameCancel`
              );
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
          anchorRect={contextMenu.anchorRect}
          options={
            isTrashView
              ? [
                  {
                    label: "Restaurar",
                    icon: <RotateCcw size={16} />,
                    onClick: () => {
                      onRestore?.(file.id);
                      setContextMenu(null);
                    },
                  },
                  {
                    label: "Excluir permanentemente",
                    icon: <X size={16} />,
                    onClick: () => {
                      if (onPermanentDelete) {
                        onPermanentDelete(file.id);
                      }
                      setContextMenu(null);
                    },
                  },
                ]
              : [
                  {
                    label: "Renomear",
                    icon: <FileEdit size={16} />,
                    onClick: handleRename,
                  },
                  {
                    label: "Excluir",
                    icon: <Trash2 size={16} />,
                    onClick: () => {
                      if (onDelete) {
                        onDelete(file.id);
                      }
                      setContextMenu(null);
                    },
                  },
                ]
          }
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
