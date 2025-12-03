"use client";

import { useState, useRef } from "react";
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Scissors,
  FolderPlus,
  Trash2,
} from "lucide-react";
import React from "react";
import ContextMenu from "../../editor/components/ContextMenu";
import {
  getFileTypeEmoji,
  getFileTypeIcon,
  type FileType,
} from "@/modules/files/types/filesTypes";

interface FileItem {
  id: string;
  type: FileType;
  title: string;
  parent_id?: string;
  children?: FileItem[];
  completed?: boolean;
}

interface SidebarItemProps {
  item: FileItem;
  level: number;
  activeId: string;
  onUpdate?: (id: string, field: "title", value: string) => void;
  onDelete?: (id: string) => void;
}

export default function SidebarItem({
  item,
  level,
  activeId,
  onUpdate,
  onDelete,
}: SidebarItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const hasChildren = item.children && item.children.length > 0;
  const paddingLeft = level * 12;
  const isActive = activeId === item.id;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const contextMenuOptions = [
    {
      label: "Copiar",
      icon: <Copy size={14} />,
      onClick: () => {},
    },
    {
      label: "Cortar",
      icon: <Scissors size={14} />,
      onClick: () => {},
    },
    { separator: true },
    {
      label: "Nova Pasta",
      icon: <FolderPlus size={14} />,
      onClick: () => {},
      disabled: item.type !== "folder",
    },
    { separator: true },
    {
      label: "Excluir",
      icon: <Trash2 size={14} />,
      onClick: () => {
        onDelete?.(item.id);
      },
    },
  ];

  const handleItemClick = () => {
    if (item.type === "folder") {
      // For sections, navigate to the module
      window.location.hash = item.id;
    } else {
      // For other items, scroll to them
      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
      window.location.hash = item.id;
    }
  };

  return (
    <div ref={itemRef}>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
          isActive
            ? "bg-blue-100 dark:bg-zinc-900/60 text-zinc-600 dark:text-blue-50 font-medium"
            : "hover:bg-hover"
        } ${item.completed ? "opacity-60" : ""}`}
        style={{ paddingLeft: `${paddingLeft + 12}px` }}
        onContextMenu={handleContextMenu}
        onClick={handleItemClick}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="shrink-0 hover:bg-black/5 dark:hover:bg-white/5 rounded p-0.5"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        )}
        <span className="shrink-0 flex items-center justify-center relative">
          {(() => {
            const IconComponent = getFileTypeIcon(item.type);
            if (!IconComponent) {
              return getFileTypeEmoji(item.type);
            }
            return (
              <div className="relative">
                {React.createElement(IconComponent, { size: 16 })}
                {item.completed && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-[1px] border border-sidebar">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-2 h-2 text-white"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })()}
        </span>
        <span
          className={`flex-1 min-w-0 truncate block ${
            item.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.title || "Sem título..."}
        </span>
      </div>

      {contextMenu && (
        <ContextMenu
          options={contextMenuOptions.filter(
            (option) => option.label !== undefined
          )}
          onClose={() => setContextMenu(null)}
        />
      )}

      {hasChildren && isExpanded && (
        <div className="ml-2">
          {item.children?.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              level={level + 1}
              activeId={activeId}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
