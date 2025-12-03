"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { buildHierarchy, findFileById } from "@/modules/files";
import type { HierarchicalFile } from "@/lib/types";
import { startTransition } from "react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";

export function useWorkspaceNavigation(workspaceId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { files: allFiles } = useWorkspaceStore();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<HierarchicalFile | null>(
    null
  );

  // Filter files by workspace
  const workspaceFiles = useMemo(() => {
    return allFiles.filter(
      (file) => file.workspace_id === workspaceId && file.active !== false
    );
  }, [allFiles, workspaceId]);

  // Build hierarchy
  const files = useMemo(() => {
    return buildHierarchy(workspaceFiles);
  }, [workspaceFiles]);

  // Handle folder click
  const handleFolderClick = useCallback(
    (folderId: string) => {
      const buildPathToFolder = (
        files: HierarchicalFile[],
        targetId: string,
        currentPath: string[] = []
      ): string[] | null => {
        for (const item of files) {
          if (item.id === targetId) {
            return [...currentPath, item.id];
          }
          if (item.children && item.children.length >= 0) {
            const found = buildPathToFolder(item.children, targetId, [
              ...currentPath,
              item.id,
            ]);
            if (found) return found;
          }
        }
        return null;
      };

      const viewFromPath = pathname?.split("/")[1] || "explorer";
      const baseRoute = `/${viewFromPath}`;
      const pathToFolder = buildPathToFolder(files, folderId);

      if (pathToFolder) {
        const newPath = `${baseRoute}/${workspaceId}/${pathToFolder.join("/")}`;
        startTransition(() => {
          router.push(newPath, { scroll: false });
        });
      }
    },
    [files, pathname, workspaceId, router]
  );

  // Handle item click
  const handleItemClick = useCallback(
    (item: HierarchicalFile) => {
      const viewFromPath = pathname?.split("/")[1] || "explorer";
      const baseRoute = `/${viewFromPath}`;

      if (item.type === "note") {
        const parentPath = item.parent_id
          ? [workspaceId, item.parent_id]
          : [workspaceId];
        const newPath = `${baseRoute}/${parentPath.join("/")}/${item.id}/view`;
        startTransition(() => {
          router.push(newPath, { scroll: false });
        });
      } else if (item.type === "folder") {
        handleFolderClick(item.id);
      }
    },
    [pathname, workspaceId, router, handleFolderClick]
  );

  // Handle back navigation
  const handleBack = useCallback(() => {
    const viewFromPath = pathname?.split("/")[1] || "explorer";
    const baseRoute = `/${viewFromPath}`;

    if (currentFolderId) {
      const folder = findFileById(files, currentFolderId);
      if (folder?.parent_id) {
        const parentFolder = findFileById(files, folder.parent_id);
        if (parentFolder) {
          const pathToParent = [workspaceId, folder.parent_id];
          const newPath = `${baseRoute}/${pathToParent.join("/")}`;
          startTransition(() => {
            router.push(newPath, { scroll: false });
          });
        } else {
          const newPath = `${baseRoute}/${workspaceId}`;
          startTransition(() => {
            router.push(newPath, { scroll: false });
          });
        }
      } else {
        const newPath = `${baseRoute}/${workspaceId}`;
        startTransition(() => {
          router.push(newPath, { scroll: false });
        });
      }
    } else {
      const newPath = `${baseRoute}/${workspaceId}`;
      startTransition(() => {
        router.push(newPath, { scroll: false });
      });
    }
  }, [currentFolderId, files, pathname, workspaceId, router]);

  // Navigate to workspace root
  const handleNavigateToWorkspaceRoot = useCallback(() => {
    const viewFromPath = pathname?.split("/")[1] || "explorer";
    const baseRoute = `/${viewFromPath}`;
    const newPath = `${baseRoute}/${workspaceId}`;
    startTransition(() => {
      router.push(newPath, { scroll: false });
    });
  }, [pathname, workspaceId, router]);

  // Close editor
  const handleCloseEditor = useCallback(() => {
    const viewFromPath = pathname?.split("/")[1] || "explorer";
    const baseRoute = `/${viewFromPath}`;
    const newPath = currentFolderId
      ? `${baseRoute}/${workspaceId}/${currentFolderId}`
      : `${baseRoute}/${workspaceId}`;
    startTransition(() => {
      router.push(newPath, { scroll: false });
    });
  }, [pathname, workspaceId, currentFolderId, router]);

  return {
    files,
    currentFolderId,
    selectedFile,
    setCurrentFolderId,
    setSelectedFile,
    handleFolderClick,
    handleItemClick,
    handleBack,
    handleNavigateToWorkspaceRoot,
    handleCloseEditor,
  };
}
