"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  File as FileIcon,
  Folder,
  CornerDownLeft,
  X,
} from "lucide-react";
import { HierarchicalFile } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { buildHierarchy } from "@/lib/utils/hierarchy";

interface SearchFile extends HierarchicalFile {
  workspaceName?: string;
  workspaceId?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Get files from all workspaces
  const { files: allFilesFromStore, getWorkspaceById } = useWorkspaceStore();

  // Filter active files from all workspaces - search directly in flat array
  const activeFiles = useMemo(() => {
    console.log("[GlobalSearch] All files from store:", {
      total: allFilesFromStore.length,
      byWorkspace: allFilesFromStore.reduce((acc, f) => {
        const wsId = f.workspace_id || "no-workspace";
        acc[wsId] = (acc[wsId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sample: allFilesFromStore.slice(0, 10).map((f) => ({
        id: f.id,
        title: f.title,
        type: f.type,
        active: f.active,
        workspace_id: f.workspace_id,
        isTemp: f.id.startsWith("temp-"),
      })),
    });

    const filtered = allFilesFromStore.filter((file) => {
      // Filter out temporary/optimistic files that haven't been created yet
      const isTemporary = file.id.startsWith("temp-");
      const isActive = file.active !== false;
      const hasWorkspace = !!file.workspace_id;

      // Additional check: ensure file has a valid created_at timestamp
      // Optimistic files might not have this or might have a very recent timestamp
      const hasValidTimestamp = !!file.created_at;

      const shouldInclude =
        !isTemporary && isActive && hasWorkspace && hasValidTimestamp;

      return shouldInclude;
    });

    console.log("[GlobalSearch] Filtered active files:", {
      count: filtered.length,
      byWorkspace: filtered.reduce((acc, f) => {
        const wsId = f.workspace_id || "no-workspace";
        acc[wsId] = (acc[wsId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sample: filtered.slice(0, 10).map((f) => ({
        id: f.id,
        title: f.title,
        type: f.type,
        workspace_id: f.workspace_id,
      })),
    });

    return filtered;
  }, [allFilesFromStore]);

  // Build hierarchy for navigation purposes (only when needed for path building)
  const files = useMemo(() => {
    try {
      return buildHierarchy(activeFiles as HierarchicalFile[]);
    } catch (error) {
      console.error("[GlobalSearch] Error building hierarchy:", error);
      return [];
    }
  }, [activeFiles]);

  // Search directly in the flat array of active files (no need to flatten hierarchy)
  const filteredItems: SearchFile[] = useMemo(() => {
    if (!query) return [];

    const filtered = activeFiles
      .filter((file) => {
        const matches =
          file.title.toLowerCase().includes(query.toLowerCase()) &&
          !file.id.startsWith("temp-") &&
          file.active !== false &&
          !!file.workspace_id; // Ensure file has a workspace
        return matches;
      })
      .slice(0, 10)
      .map((file) => {
        // Get workspace info for this file
        const workspace = getWorkspaceById(file.workspace_id || "");
        return {
          ...file,
          workspaceName: workspace?.title || "Unknown",
          workspaceId: file.workspace_id,
        } as SearchFile;
      });

    console.log("[GlobalSearch] Query:", query);
    console.log("[GlobalSearch] Filtered items count:", filtered.length);
    console.log(
      "[GlobalSearch] Filtered items:",
      filtered.map((f) => ({ id: f.id, title: f.title, type: f.type }))
    );

    return filtered;
  }, [activeFiles, query, getWorkspaceById]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setTimeout(() => setQuery(""), 100);
      setTimeout(() => setSelectedIndex(0), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setTimeout(() => setSelectedIndex(0), 100);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSelect = (file: SearchFile) => {
    // Switch workspace if needed
    const { setSelectedWorkspaceId } = useWorkspaceStore.getState();
    if (file.workspaceId) {
      setSelectedWorkspaceId(file.workspaceId);
    }

    const path = buildPath(files, file.id);
    // Always navigate to explorer view (workspace managed by Zustand)
    if (path) {
      router.push(`/explorer/${path.join("/")}`);
    } else {
      router.push(`/explorer/${file.id}`);
    }
    onClose();
  };

  const buildPath = (
    files: HierarchicalFile[],
    targetId: string,
    currentPath: string[] = []
  ): string[] | null => {
    for (const file of files) {
      if (file.id === targetId) {
        return [...currentPath, file.id];
      }
      if (file.children) {
        const found = buildPath(file.children, targetId, [
          ...currentPath,
          file.id,
        ]);
        if (found) return found;
      }
    }
    return null;
  };

  if (!isOpen) return null;

  // Detect dark mode
  const isDarkMode =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const darkModeBackground = isDarkMode
    ? "rgba(0, 0, 0, 0.2)"
    : "rgba(0, 0, 0, 0.25)";
  const darkModeText = isDarkMode
    ? "rgba(255, 255, 255, 0.9)"
    : "rgba(0, 0, 0, 0.9)";

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop with blur - Glass effect */}
      <div
        className="fixed inset-0 transition-opacity duration-200"
        onClick={onClose}
        style={{
          backgroundColor: isDarkMode
            ? "rgba(0, 0, 0, 0.4)"
            : "rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(30px) saturate(200%)",
          WebkitBackdropFilter: "blur(30px) saturate(200%)",
        }}
      />

      {/* Search Container - Glass effect Style */}
      <div
        className="w-full max-w-[700px] relative z-10 animate-in fade-in zoom-in-95 duration-200"
        style={{
          animation: "spotlight-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="rounded-3xl overflow-hidden shadow-2xl border"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(0, 0, 0, 0.4)"
              : "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(50px) saturate(200%)",
            WebkitBackdropFilter: "blur(50px) saturate(200%)",
            border: isDarkMode
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(255, 255, 255, 0.4)",
            boxShadow: isDarkMode
              ? "0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              : "0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
          }}
        >
          {/* Search Input */}
          <div
            className="flex items-center px-6 py-5 border-b"
            style={{
              borderColor: isDarkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(255, 255, 255, 0.2)",
              backgroundColor: isDarkMode
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Search
              size={20}
              className="mr-4 shrink-0"
              style={{
                color: isDarkMode
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(0, 0, 0, 0.7)",
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search files and folders..."
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:opacity-50 font-normal"
              style={{
                color: isDarkMode
                  ? "rgba(255, 255, 255, 0.9)"
                  : "rgba(0, 0, 0, 0.9)",
                caretColor: "#007AFF",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="ml-3 p-2 rounded-lg transition-colors"
                style={{
                  color: isDarkMode
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(0, 0, 0, 0.5)",
                  backgroundColor: isDarkMode
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.05)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.05)";
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Results List */}
          <div
            className="max-h-[500px] overflow-y-auto bg-background/60"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: isDarkMode
                ? "rgba(255, 255, 255, 0.2) transparent"
                : "rgba(0, 0, 0, 0.2) transparent",
            }}
          >
            {query && filteredItems.length === 0 ? (
              <div className="py-16 text-center bg-background/60">
                <div
                  className="text-sm"
                  style={{
                    color: isDarkMode
                      ? "rgba(255, 255, 255, 0.5)"
                      : "rgba(0, 0, 0, 0.5)",
                  }}
                >
                  No results found
                </div>
              </div>
            ) : query ? (
              <div className="py-2 ">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="flex items-center bg-background/60 gap-4 px-6 py-4 cursor-pointer transition-all duration-150"
                  >
                    {/* Icon */}
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: "40px",
                        height: "40px",
                      }}
                    >
                      {item.type === "folder" ? (
                        <Folder size={24} style={{ color: "#3b82f6" }} />
                      ) : item.type === "video" ? (
                        <FileIcon size={24} style={{ color: "#ef4444" }} />
                      ) : (
                        <FileIcon size={24} style={{ color: "#8b5cf6" }} />
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 overflow-hidden min-w-0">
                      <div
                        className="text-base font-medium truncate mb-1"
                        style={{
                          color: isDarkMode
                            ? "rgba(255, 255, 255, 0.9)"
                            : "rgba(0, 0, 0, 0.9)",
                        }}
                      >
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="text-sm truncate"
                          style={{
                            color: isDarkMode
                              ? "rgba(255, 255, 255, 0.6)"
                              : "rgba(0, 0, 0, 0.6)",
                          }}
                        >
                          {item.type === "folder"
                            ? "Folder"
                            : item.type === "video"
                            ? "Video"
                            : item.type === "note"
                            ? "Note"
                            : "File"}
                        </div>
                        {item.workspaceName && (
                          <>
                            <span
                              style={{
                                color: isDarkMode
                                  ? "rgba(255, 255, 255, 0.3)"
                                  : "rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              •
                            </span>
                            <div
                              className="text-sm truncate"
                              style={{
                                color: isDarkMode
                                  ? "rgba(255, 255, 255, 0.5)"
                                  : "rgba(0, 0, 0, 0.5)",
                              }}
                            >
                              {item.workspaceName}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Enter indicator */}
                    {index === selectedIndex && (
                      <div
                        className="flex items-center gap-1 text-xs font-medium shrink-0"
                        style={{
                          color: isDarkMode
                            ? darkModeText
                            : "rgba(0, 0, 0, 0.4)",
                        }}
                      >
                        <CornerDownLeft size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="py-16 text-center bg-background/60"
                style={{
                  backdropFilter: "blur(50px) saturate(200%)",
                  WebkitBackdropFilter: "blur(50px) saturate(200%)",
                }}
              >
                <Search
                  size={36}
                  className="mx-auto mb-4"
                  style={{
                    color: isDarkMode
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(0, 0, 0, 0.2)",
                  }}
                />
                <div
                  className="text-base mb-2"
                  style={{
                    color: isDarkMode
                      ? "rgba(255, 255, 255, 0.6)"
                      : "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  Start typing to search
                </div>
                <div
                  className="text-sm"
                  style={{
                    color: isDarkMode
                      ? "rgba(255, 255, 255, 0.4)"
                      : "rgba(0, 0, 0, 0.4)",
                  }}
                >
                  Files, folders, and more
                </div>
              </div>
            )}
          </div>

          {/* Footer with keyboard shortcuts */}
          {query && filteredItems.length > 0 && (
            <div
              className="px-6 py-4 border-t flex items-center justify-between"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDarkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.2)",
              }}
            >
              <div
                className="flex gap-6 text-xs"
                style={{
                  color: isDarkMode
                    ? "rgba(255, 255, 255, 0.6)"
                    : "rgba(0, 0, 0, 0.6)",
                }}
              >
                <span className="flex items-center gap-2">
                  <kbd
                    className="px-2 py-1 rounded-md border font-mono text-xs"
                    style={{
                      backgroundColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(255, 255, 255, 0.5)",
                      borderColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.1)",
                      color: isDarkMode
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-2">
                  <kbd
                    className="px-2 py-1 rounded-md border font-mono text-xs"
                    style={{
                      backgroundColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(255, 255, 255, 0.5)",
                      borderColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.1)",
                      color: isDarkMode
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    ↵
                  </kbd>
                  Open
                </span>
                <span className="flex items-center gap-2">
                  <kbd
                    className="px-2 py-1 rounded-md border font-mono text-xs"
                    style={{
                      backgroundColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(255, 255, 255, 0.5)",
                      borderColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.1)",
                      color: isDarkMode
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    ESC
                  </kbd>
                  Close
                </span>
              </div>
              <div
                className="text-xs"
                style={{
                  color: isDarkMode
                    ? "rgba(255, 255, 255, 0.6)"
                    : "rgba(0, 0, 0, 0.6)",
                }}
              >
                {filteredItems.length}{" "}
                {filteredItems.length === 1 ? "result" : "results"}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spotlight-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Floating search button component
export function FloatingSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 bg-foreground/10 right-6 z-99999 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
      style={{
        backdropFilter: "blur(20px) saturate(200%)",
        WebkitBackdropFilter: "blur(20px) saturate(200%)",
      }}
      title="Search files and folders (Ctrl+K)"
    >
      <Search size={20} style={{ color: "rgba(116, 116, 116, 0.7)" }} />
    </button>
  );
}
