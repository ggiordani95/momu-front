"use client";

import { ChevronRight } from "lucide-react";
import type { HierarchicalItem } from "@/lib/types";

interface BreadcrumbProps {
  items: HierarchicalItem[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

export default function Breadcrumb({
  items,
  currentFolderId,
  onNavigate,
}: BreadcrumbProps) {
  // Build path to current folder
  const buildPath = (
    items: HierarchicalItem[],
    targetId: string | null,
    currentPath: HierarchicalItem[] = []
  ): HierarchicalItem[] | null => {
    if (targetId === null) {
      return currentPath;
    }

    for (const item of items) {
      if (item.id === targetId) {
        return [...currentPath, item];
      }
      if (item.children) {
        const found = buildPath(item.children, targetId, [
          ...currentPath,
          item,
        ]);
        if (found) return found;
      }
    }
    return null;
  };

  const path = currentFolderId ? buildPath(items, currentFolderId) : [];

  return (
    <div
      className="p-4 border-b flex items-center gap-2 overflow-x-auto"
      style={{ borderColor: "var(--border-color)" }}
    >
      {/* Workspace Root */}
      <button
        onClick={() => onNavigate(null)}
        className="text-sm opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap"
      >
        Meu explorador
      </button>
      {/* Path Items */}
      {path && path.length > 0 && (
        <>
          {path.map((folder) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight size={16} className="opacity-40" />
              <button
                onClick={() => onNavigate(folder.id)}
                className="text-sm opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap"
              >
                {folder.title}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
