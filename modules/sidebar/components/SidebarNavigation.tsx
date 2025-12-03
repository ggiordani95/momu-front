"use client";

import { useState, useEffect } from "react";
import SidebarItem from "@/modules/sidebar/components/SidebarItem";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { buildHierarchy } from "@/modules/files";
import { FileType } from "@/modules/files/types/filesTypes";
import { HierarchicalFile } from "@/lib/types";
import { useMemo } from "react";
import { useUpdateFile } from "@/modules/files";

interface FileItem {
  id: string;
  type: FileType;
  title: string;
  parent_id?: string;
  children?: FileItem[];
}

interface SidebarNavigationProps {
  files: FileItem[];
  workspaceId?: string;
}

export default function SidebarNavigation({
  files: initialFiles,
  workspaceId,
}: SidebarNavigationProps) {
  const [activeId, setActiveId] = useState("");

  // Get files from Zustand store if workspaceId is provided
  const { getFilesByWorkspace } = useWorkspaceStore();
  const workspaceFiles = workspaceId ? getFilesByWorkspace(workspaceId) : [];
  const zustandFiles = useMemo(
    () => buildHierarchy(workspaceFiles),
    [workspaceFiles]
  );

  const derivedWorkspaceId =
    workspaceId ||
    (zustandFiles[0] as HierarchicalFile | undefined)?.workspace_id ||
    (initialFiles[0] as HierarchicalFile | undefined)?.workspace_id ||
    null;

  const updateFileMutation = useUpdateFile(derivedWorkspaceId || "");

  // Use files from Zustand if available, otherwise use initialFiles
  const files = zustandFiles.length > 0 ? zustandFiles : initialFiles;

  useEffect(() => {
    // Set initial activeId from URL hash after mount (only on client)
    // Use requestAnimationFrame to ensure DOM is ready and avoid hydration mismatch
    const setInitialActiveId = () => {
      if (window.location.hash) {
        setActiveId(window.location.hash.slice(1));
      }
    };
    requestAnimationFrame(setInitialActiveId);

    // Track scroll position to highlight current section
    const handleScroll = () => {
      const sections = document.querySelectorAll("[id]");
      let currentId = "";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentId = section.id;
        }
      });

      if (currentId) {
        setActiveId(currentId);
      }
    };

    // Listen to hash changes
    const handleHashChange = () => {
      if (window.location.hash) {
        setActiveId(window.location.hash.slice(1));
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("hashchange", handleHashChange);

    // Initial check after a small delay to ensure DOM is ready
    setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const updateFile = (id: string, field: "title", value: string) => {
    const previousItems = files as FileItem[];
    const updateFileRecursive = (files: FileItem[]): FileItem[] => {
      return files.map((file) => {
        if (file.id === id) {
          return { ...file, [field]: value };
        }
        if (file.children) {
          return { ...file, children: updateFileRecursive(file.children) };
        }
        return file;
      });
    };

    const updatedFiles = updateFileRecursive(files as FileItem[]);
    // Zustand handles state updates automatically via mutations

    if (!derivedWorkspaceId) {
      console.error(
        "Não foi possível identificar o workspace para atualizar o arquivo."
      );
      return;
    }

    updateFileMutation.mutate(
      { fileId: id, data: { [field]: value } },
      {
        onError: (error: Error) => {
          console.error("Error updating file:", error);
          // Zustand irá lidar com o rollback via React Query
        },
      }
    );
  };

  const deleteFile = (id: string) => {
    const deleteFileRecursive = (files: FileItem[]): FileItem[] => {
      return files
        .filter((file) => file.id !== id)
        .map((file) => {
          if (file.children) {
            return { ...file, children: deleteFileRecursive(file.children) };
          }
          return file;
        });
    };

    const updatedFiles = deleteFileRecursive(files as FileItem[]);
    // Zustand handles state updates automatically via mutations

    if (!derivedWorkspaceId) {
      console.error(
        "Não foi possível identificar o workspace para atualizar o arquivo."
      );
      return;
    }

    updateFileMutation.mutate({
      fileId: id,
      data: { active: false },
    });
  };

  return (
    <nav className="space-y-1">
      {files.map((file) => (
        <SidebarItem
          key={file.id}
          item={file as FileItem}
          level={0}
          activeId={activeId}
          onUpdate={updateFile}
          onDelete={deleteFile}
        />
      ))}
    </nav>
  );
}
