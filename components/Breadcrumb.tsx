"use client";

import { ChevronRight } from "lucide-react";
import type { HierarchicalFile } from "@/lib/types";
import { ReactNode, useMemo } from "react";
import { findItemById } from "@/modules/files";
import { WorkspaceSelector } from "./WorkspaceSelector";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";

interface BreadcrumbProps {
  items: HierarchicalFile[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  actionButton?: ReactNode;
  currentView?: "explorer" | "settings" | "trash" | "social" | "planner" | "ai";
}

// Build path from root to current folder
function buildBreadcrumbPath(
  items: HierarchicalFile[],
  currentFolderId: string | null
): HierarchicalFile[] {
  if (!currentFolderId) return [];

  const path: HierarchicalFile[] = [];
  let currentId: string | null = currentFolderId;

  // Build path by traversing up the hierarchy
  while (currentId) {
    const item = findItemById(items, currentId);
    if (!item) break;

    path.unshift(item); // Add to beginning
    currentId = item.parent_id || null;
  }

  return path;
}

export default function Breadcrumb({
  items,
  currentFolderId,
  onNavigate,
  actionButton,
}: BreadcrumbProps) {
  // Get currentWorkspace from Zustand store
  const { currentWorkspace } = useWorkspaceStore();

  // Build breadcrumb path
  const breadcrumbPath = useMemo(
    () => buildBreadcrumbPath(items, currentFolderId),
    [items, currentFolderId]
  );

  return (
    <div className="px-6 py-3 flex items-center gap-3 border-b border-border bg-background/50 backdrop-blur-sm relative z-10">
      {/* Breadcrumb Path */}
      <div className="flex-1 flex items-center overflow-x-auto min-w-0">
        {/* Workspace */}
        <button
          onClick={() => onNavigate(null)}
          className={`flex items-center p-2 rounded-lg text-sm font-medium transition-all hover:bg-hover/50 shrink-0 ${
            currentFolderId === null ? "bg-foreground/5" : ""
          }`}
          style={{
            color:
              currentFolderId === null
                ? "var(--foreground)"
                : "var(--foreground)/70",
            fontWeight: currentFolderId === null ? "600" : "500",
          }}
        >
          {currentWorkspace?.title && (
            <>
              <span className="rounded-lg text-md font-semibold shrink-0">
                {currentWorkspace?.title}
              </span>
            </>
          )}
        </button>
        {(currentFolderId !== null || breadcrumbPath.length > 0) && (
          <ChevronRight size={16} className="text-foreground/40 shrink-0" />
        )}
        {/* Folder Path */}
        {breadcrumbPath.length > 0 && (
          <>
            {breadcrumbPath.map((folder, index) => {
              const isSelected = index === breadcrumbPath.length - 1;
              return (
                <div
                  key={folder.id}
                  className="flex items-center gap-2 shrink-0"
                >
                  <button
                    onClick={() => onNavigate(folder.id)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all hover:bg-hover/50 truncate max-w-[200px] ${
                      isSelected ? "bg-foreground/5" : ""
                    }`}
                    style={{
                      color: isSelected
                        ? "var(--foreground)"
                        : "var(--foreground)/70",
                      fontWeight: isSelected ? "600" : "500",
                    }}
                    title={folder.title}
                  >
                    {folder.title}
                  </button>
                  {index < breadcrumbPath.length - 1 && (
                    <ChevronRight size={16} className="text-foreground/40" />
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Action Button */}
      {actionButton && <div className="shrink-0 ml-auto">{actionButton}</div>}
    </div>
  );
}
