"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import type { HierarchicalFile } from "@/lib/types";
import { buildHierarchy } from "@/modules/files";

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showHint, setShowHint] = useState(false);
  const { files: allFiles, currentWorkspace } = useWorkspaceStore();
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter files by current workspace
  const workspaceFiles = allFiles.filter(
    (file) =>
      file.workspace_id === currentWorkspace?.id && file.active !== false
  );

  // Search function
  const searchFiles = useCallback(
    (searchQuery: string): HierarchicalFile[] => {
      if (!searchQuery.trim()) return [];

      const queryLower = searchQuery.toLowerCase();
      const results: HierarchicalFile[] = [];

      const searchInFiles = (files: HierarchicalFile[]) => {
        for (const file of files) {
          const titleMatch = file.title.toLowerCase().includes(queryLower);
          const contentMatch =
            file.content?.toLowerCase().includes(queryLower) || false;

          if (titleMatch || contentMatch) {
            results.push(file);
          }

          if (file.children) {
            searchInFiles(file.children);
          }
        }
      };

      // Build hierarchy and search
      const hierarchicalFiles = buildHierarchy(workspaceFiles);
      searchInFiles(hierarchicalFiles);

      return results;
    },
    [workspaceFiles]
  );

  // Search results
  const results = useMemo(() => {
    return searchFiles(query);
  }, [query, searchFiles]);

  // Open search
  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close search
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  // Show hint
  const showSearchHint = useCallback(() => {
    setShowHint(true);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    hintTimeoutRef.current = setTimeout(() => {
      setShowHint(false);
    }, 4000);
  }, []);

  // Hide hint
  const hideSearchHint = useCallback(() => {
    setShowHint(false);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }

      // Escape to close search
      if (e.key === "Escape" && isOpen) {
        closeSearch();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, openSearch, closeSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    query,
    setQuery,
    results,
    showHint,
    openSearch,
    closeSearch,
    showSearchHint,
    hideSearchHint,
  };
}
