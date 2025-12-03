"use client";

import { ChevronRight } from "lucide-react";
import type { HierarchicalFile } from "@/lib/types";
import { ReactNode, useMemo } from "react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";

interface BreadcrumbProps {
  files: HierarchicalFile[];
  currentFileId: string | null;
  onNavigate: (folderId: string | null) => void;
  actionButton?: ReactNode;
  currentView?: "explorer" | "settings" | "trash" | "social" | "planner" | "ai";
}

// Build path from root to current folder
function buildBreadcrumbPath(
  files: HierarchicalFile[],
  currentFileId: string | null
): HierarchicalFile[] {
  if (!currentFileId) return [];

  const path: HierarchicalFile[] = [];
  let currentId: string | null = currentFileId;

  // Build path a partir da lista plana usando parent_id
  while (currentId) {
    const file = files.find((f) => f.id === currentId);
    if (!file) break;

    path.unshift(file); // Add to beginning
    currentId = file.parent_id || null;
  }

  return path;
}

export default function Breadcrumb({
  files,
  currentFileId,
  onNavigate,
  actionButton,
}: BreadcrumbProps) {
  // Get currentWorkspace from Zustand store
  const { currentWorkspace } = useWorkspaceStore();

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    const path = buildBreadcrumbPath(files, currentFileId);
    console.log("[Breadcrumb] compute path", {
      currentFileId,
      filesCount: files?.length || 0,
      pathIds: path.map((f) => f.id),
      pathTitles: path.map((f) => f.title),
    });
    return path;
  }, [files, currentFileId]);

  return (
    <div className="px-6 py-3 flex items-center gap-3 border-b border-border bg-background/50 backdrop-blur-sm relative z-10">
      {/* Breadcrumb Path */}
      <div className="flex-1 flex items-center overflow-x-auto min-w-0">
        {/* Workspace */}
        <button
          onClick={() => onNavigate(null)}
          className={`flex items-center p-2 rounded-lg text-sm font-medium transition-all hover:bg-hover/50 shrink-0 ${
            currentFileId === null ? "bg-foreground/5" : ""
          }`}
          style={{
            color:
              currentFileId === null
                ? "var(--foreground)"
                : "var(--foreground)/70",
            fontWeight: currentFileId === null ? "600" : "500",
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
        {(currentFileId !== null || breadcrumbPath.length > 0) && (
          <ChevronRight size={16} className="text-foreground/40 shrink-0" />
        )}
        {/* Folder Path */}
        {breadcrumbPath.length > 0 && (
          <>
            {breadcrumbPath.map((file, index) => {
              const isSelected = index === breadcrumbPath.length - 1;
              return (
                <div key={file.id} className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigate(file.id)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all hover:bg-hover/50 truncate max-w-[200px] ${
                      isSelected ? "bg-foreground/5" : ""
                    }`}
                    style={{
                      color: isSelected
                        ? "var(--foreground)"
                        : "var(--foreground)/70",
                      fontWeight: isSelected ? "600" : "500",
                    }}
                    title={file.title}
                  >
                    {file.title}
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
