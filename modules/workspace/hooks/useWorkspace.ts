"use client";

import { useWorkspaceNavigation } from "./useWorkspaceNavigation";
import { useWorkspaceFiles } from "./useWorkspaceFiles";
import { useWorkspaceView } from "./useWorkspaceView";
import { useMoveFile } from "@/modules/files";

/**
 * Main hook that combines all workspace functionality
 * This eliminates prop drilling by providing all workspace state and handlers
 */
export function useWorkspace(workspaceId: string) {
  // Navigation
  const navigation = useWorkspaceNavigation(workspaceId);

  // Files operations
  const files = useWorkspaceFiles(workspaceId);

  // View management
  const view = useWorkspaceView();

  // Move file functionality
  const moveFile = useMoveFile(workspaceId);

  return {
    // Navigation
    ...navigation,

    // Files
    ...files,

    // View
    ...view,

    // Move file
    handleItemMove: (id: string, parentId: string | null) => {
      moveFile.mutate({ fileId: id, parentId, workspaceId });
    },
  };
}
