"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import type { HierarchicalItem, Folder } from "@/lib/types";
import { ReactNode, useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

interface BreadcrumbProps {
  items: HierarchicalItem[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  actionButton?: ReactNode;
  workspaces?: Folder[];
  currentWorkspaceId?: string;
}

export default function Breadcrumb({
  items,
  currentFolderId,
  onNavigate,
  actionButton,
  workspaces = [],
  currentWorkspaceId,
}: BreadcrumbProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const handleToggleDropdown = () => {
    if (!isDropdownOpen && buttonRef.current) {
      // Calculate position before opening
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

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

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  const handleWorkspaceSelect = (workspaceId: string) => {
    setIsDropdownOpen(false);
    if (workspaceId !== currentWorkspaceId) {
      router.push(`/${workspaceId}`);
    }
  };

  // Build breadcrumb items array
  const breadcrumbItems = useMemo(() => {
    const path = currentFolderId ? buildPath(items, currentFolderId) : [];
    const breadcrumbItems: Array<{
      id: string;
      title: string;
      onClick: () => void;
    }> = [];

    // Add workspace as root (only show if we're inside a folder)
    if (currentWorkspace && currentFolderId) {
      breadcrumbItems.push({
        id: "workspace-root",
        title: currentWorkspace.title,
        onClick: () => onNavigate(null),
      });
    }

    // Add path folders
    if (path && path.length > 0) {
      path.forEach((folder) => {
        breadcrumbItems.push({
          id: folder.id,
          title: folder.title,
          onClick: () => onNavigate(folder.id),
        });
      });
    }

    return breadcrumbItems;
    // buildPath is a stable function, so we don't need to include it in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, currentFolderId, items, onNavigate]);

  return (
    <div
      className="px-6 py-3 border-b flex items-center gap-3 overflow-x-auto"
      style={{ borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Workspace Dropdown - Text + Chevron */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={handleToggleDropdown}
            className="flex items-center gap-1.5 text-sm font-medium transition-all whitespace-nowrap px-2 py-1 rounded-md hover:bg-hover/50 active:bg-hover/70"
            style={{
              color: "var(--foreground)",
            }}
          >
            {currentWorkspace?.title || "Selecionar workspace"}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {/* Dropdown Menu - Using Portal with fixed positioning */}
          {isDropdownOpen &&
            workspaces.length > 0 &&
            typeof window !== "undefined" &&
            createPortal(
              <div
                ref={dropdownRef}
                className="fixed bg-background border rounded-lg shadow-lg z-[99999] min-w-[200px] max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  borderColor: "var(--border-color)",
                  backgroundColor: "var(--background)",
                }}
              >
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleWorkspaceSelect(workspace.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      workspace.id === currentWorkspaceId
                        ? "bg-hover font-medium"
                        : "hover:bg-hover/50"
                    }`}
                  >
                    {workspace.title}
                  </button>
                ))}
              </div>,
              document.body
            )}
        </div>
        {/* Separator */}
        {breadcrumbItems.length > 0 && (
          <div className="h-4 w-px bg-border opacity-30" />
        )}

        {/* Breadcrumb Path */}
        {breadcrumbItems.length > 0 && (
          <div className="flex items-center gap-2">
            {breadcrumbItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <button
                  onClick={item.onClick}
                  className={`text-sm whitespace-nowrap transition-all px-2 py-1 rounded ${
                    index === breadcrumbItems.length - 1
                      ? "font-medium opacity-100"
                      : "opacity-70 hover:opacity-100 hover:bg-hover/30"
                  }`}
                  style={{
                    color: "var(--foreground)",
                  }}
                >
                  {item.title}
                </button>
                {index < breadcrumbItems.length - 1 && (
                  <ChevronRight size={12} className="opacity-30 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Action Button (e.g., Add Item) */}
      {actionButton && <div className="shrink-0 ml-auto">{actionButton}</div>}
    </div>
  );
}
