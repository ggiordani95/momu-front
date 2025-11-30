"use client";

import { useState } from "react";
import {
  Folder,
  File as FileIcon,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { HierarchicalFile } from "@/lib/types";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { buildHierarchy } from "@/lib/utils/hierarchy";
import { useMemo } from "react";

interface ItemPickerProps {
  onSelect: (item: HierarchicalFile) => void;
  onCancel: () => void;
  excludeId?: string;
  workspaceId: string;
}

export function ItemPicker({
  onSelect,
  onCancel,
  excludeId,
  workspaceId,
}: ItemPickerProps) {
  // Get files from Zustand store
  const { getFilesByWorkspace } = useWorkspaceStore();
  const workspaceFiles = getFilesByWorkspace(workspaceId);
  const items = useMemo(() => buildHierarchy(workspaceFiles), [workspaceFiles]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = (item: HierarchicalFile, depth: number = 0) => {
    if (item.id === excludeId) return null;

    const isExpanded = expandedFolders.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 cursor-pointer rounded-xl transition-all duration-150 group"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => onSelect(item)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => toggleFolder(item.id, e)}
              className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all duration-150"
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {item.type === "folder" ? (
            <Folder
              size={16}
              className="text-sky-400 shrink-0 group-hover:text-sky-300 transition-colors"
            />
          ) : (
            <FileIcon
              size={16}
              className="text-blue-400 shrink-0 group-hover:text-blue-300 transition-colors"
            />
          )}

          <span className="text-sm text-white/80 truncate font-medium group-hover:text-white transition-colors">
            {item.title}
          </span>
          <Check
            size={14}
            className="ml-auto text-white/0 group-hover:text-white/40 transition-colors shrink-0"
          />
        </div>

        {isExpanded && hasChildren && (
          <div>
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white/90 text-sm">
            Linkar pasta ou arquivo
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {items.map((item) => renderItem(item))}
          {items.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">
              Nenhum item encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
