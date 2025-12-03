"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Folder } from "lucide-react";
import type { HierarchicalFile } from "@/lib/types";
import { findFileById } from "../utils/hierarchy";

interface MoveToFolderModalProps {
  file: HierarchicalFile;
  files: HierarchicalFile[];
  onConfirm: (parentId: string | null) => void;
  onCancel: () => void;
}

export default function MoveToFolderModal({
  file,
  files,
  onConfirm,
  onCancel,
}: MoveToFolderModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    file.parent_id || null
  );
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleCancel = useCallback(() => {
    setIsMounted(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleCancel]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log(
      "[MoveToFolderModal] handleSubmit called with parentId:",
      selectedFolderId
    );
    console.log(
      "[MoveToFolderModal] Calling onConfirm with:",
      selectedFolderId
    );
    onConfirm(selectedFolderId);
    console.log(
      "[MoveToFolderModal] onConfirm called, now calling handleCancel"
    );
    // Don't call handleCancel here - let the parent component handle closing
    setIsMounted(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Get all folders from the files hierarchy, excluding the current file and its children
  const getAllFolders = (
    files: HierarchicalFile[],
    excludeId?: string
  ): HierarchicalFile[] => {
    const folders: HierarchicalFile[] = [];
    const excludeIds = new Set<string>();

    // Build set of IDs to exclude (file itself and all its children)
    if (excludeId) {
      excludeIds.add(excludeId);
      const fileFile = findFileById(files, excludeId);
      if (fileFile) {
        const collectChildren = (file: HierarchicalFile) => {
          if (file.children) {
            file.children.forEach((child) => {
              excludeIds.add(child.id);
              collectChildren(file);
            });
          }
        };
        collectChildren(fileFile);
      }
    }

    const collectFolders = (
      items: HierarchicalFile[],
      parentPath: string = ""
    ) => {
      items.forEach((item) => {
        if (item.type === "folder" && !excludeIds.has(item.id)) {
          folders.push({
            ...item,
            title: parentPath ? `${parentPath} / ${item.title}` : item.title,
          });
          if (item.children) {
            collectFolders(
              item.children,
              parentPath ? `${parentPath} / ${item.title}` : item.title
            );
          }
        } else if (item.children) {
          collectFolders(item.children, parentPath);
        }
      });
    };

    collectFolders(files);
    return folders;
  };

  const availableFolders = getAllFolders(files, file.id);

  if (typeof window === "undefined") return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        opacity: isMounted ? 1 : 0,
        transition: "opacity 0.2s ease-out",
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        style={{
          transform: isMounted ? "scale(1)" : "scale(0.95)",
          opacity: isMounted ? 1 : 0,
          transition: "all 0.2s ease-out",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Mover para pasta
          </h3>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground/60 hover:text-foreground"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-1">
            {/* Option to move to root (no parent) */}
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                selectedFolderId === null
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <Folder size={16} className="shrink-0" />
              <span className="flex-1">Raiz do workspace</span>
              {selectedFolderId === null && (
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              )}
            </button>

            {/* List of available folders */}
            {availableFolders.length === 0 ? (
              <div className="text-sm text-foreground/50 px-3 py-4 text-center">
                Nenhuma pasta disponível
              </div>
            ) : (
              availableFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    selectedFolderId === folder.id
                      ? "bg-foreground/10 text-foreground"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <Folder size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{folder.title}</span>
                  {selectedFolderId === folder.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
