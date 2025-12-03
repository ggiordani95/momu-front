"use client";

import { useState, useRef, useEffect } from "react";
import { X, Search, FileText, Folder, Video } from "lucide-react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import type { File } from "@/lib/types";

interface FileLinkPickerProps {
  workspaceId: string;
  currentFileId?: string;
  onSelect: (file: File) => void;
  onClose: () => void;
}

export function FileLinkPicker({
  workspaceId,
  currentFileId,
  onSelect,
  onClose,
}: FileLinkPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { getFilesByWorkspace } = useWorkspaceStore();
  const allFiles = getFilesByWorkspace(workspaceId);

  // Filter out current file and filter by search
  const filteredFiles = allFiles.filter((file) => {
    if (file.id === currentFileId) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.title.toLowerCase().includes(query) ||
      file.content?.toLowerCase().includes(query)
    );
  });

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredFiles.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && filteredFiles[selectedIndex]) {
        e.preventDefault();
        onSelect(filteredFiles[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredFiles, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  const getFileIcon = (file: File) => {
    if (file.type === "folder") {
      return <Folder className="w-4 h-4 text-purple-500" />;
    } else if (file.type === "video") {
      return <Video className="w-4 h-4 text-red-500" />;
    } else {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Linkar Arquivo
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-hover/50 rounded transition-colors"
          >
            <X className="w-5 h-5 text-foreground/60" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0); // Reset selection when search changes
              }}
              placeholder="Buscar arquivos..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* File List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-foreground/60">
              {searchQuery
                ? "Nenhum arquivo encontrado"
                : "Nenhum arquivo disponível"}
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <button
                key={file.id}
                onClick={() => onSelect(file)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                  index === selectedIndex ? "bg-hover" : "hover:bg-hover/50"
                }`}
              >
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {file.title}
                  </div>
                  {file.type && (
                    <div className="text-xs text-foreground/50 capitalize">
                      {file.type}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border text-xs text-foreground/50">
          Use ↑↓ para navegar • Enter para selecionar • Esc para fechar
        </div>
      </div>
    </div>
  );
}
