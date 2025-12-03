"use client";

import { useMemo, useCallback } from "react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { fileService } from "@/modules/files";
import { buildHierarchy } from "@/modules/files";
import type { CreateFileDto, File } from "@/lib/types";

export function useWorkspaceFiles(workspaceId: string) {
  const {
    files: allFiles,
    syncFiles,
    addOptimisticFile,
    updateFileInStore,
    markFileAsDeleted,
    markFilesAsDeleted,
    getNextOrderIndex,
  } = useWorkspaceStore();

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

  // Add item
  const handleAddItem = useCallback(
    async (itemData: CreateFileDto) => {
      const orderIndex = getNextOrderIndex(workspaceId, itemData.parent_id);
      const id = crypto.randomUUID();

      const newFile: File = {
        id,
        workspace_id: workspaceId,
        type: itemData.type,
        title:
          itemData.title ||
          (itemData.type === "folder" ? "Nova Pasta" : "Nova Nota"),
        content: itemData.content,
        parent_id: itemData.parent_id || undefined,
        order_index: orderIndex,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed: false,
      };

      // Optimistic update
      addOptimisticFile(newFile);

      try {
        await fileService.create(workspaceId, {
          ...itemData,
          id,
          order_index: orderIndex,
        } as CreateFileDto & { id: string; order_index: number });
        await syncFiles();
      } catch (error) {
        console.error("Error creating item:", error);
        throw error;
      }
    },
    [workspaceId, getNextOrderIndex, addOptimisticFile, syncFiles]
  );

  // Update item
  const handleItemUpdate = useCallback(
    async (id: string, field: "title" | "content", value: string) => {
      const file = allFiles.find((f) => f.id === id);
      if (!file) return;

      // Optimistic update
      updateFileInStore(id, { [field]: value });

      try {
        await fileService.update(id, { [field]: value });
        await syncFiles();
      } catch (error) {
        console.error("Error updating item:", error);
        throw error;
      }
    },
    [allFiles, updateFileInStore, syncFiles]
  );

  // Delete item
  const handleItemDelete = useCallback(
    async (id: string) => {
      // Optimistic update
      markFileAsDeleted(id);

      try {
        await fileService.delete(id);
        await syncFiles();
      } catch (error) {
        console.error("Error deleting item:", error);
        throw error;
      }
    },
    [markFileAsDeleted, syncFiles]
  );

  // Delete batch
  const handleItemDeleteBatch = useCallback(
    async (ids: string[]) => {
      // Optimistic update
      markFilesAsDeleted(ids);

      try {
        await fileService.deleteBatch(ids);
        await syncFiles();
      } catch (error) {
        console.error("Error deleting items:", error);
        throw error;
      }
    },
    [markFilesAsDeleted, syncFiles]
  );

  // Complete item
  const handleItemComplete = useCallback(
    async (id: string, completed: boolean) => {
      const file = allFiles.find((f) => f.id === id);
      if (!file) return;

      // Optimistic update
      updateFileInStore(id, {
        completed,
        completed_at: completed ? new Date().toISOString() : undefined,
      });

      try {
        await fileService.update(id, {
          completed,
          completed_at: completed ? new Date().toISOString() : undefined,
        });
        await syncFiles();
      } catch (error) {
        console.error("Error completing item:", error);
        throw error;
      }
    },
    [allFiles, updateFileInStore, syncFiles]
  );

  return {
    files,
    workspaceFiles,
    handleAddItem,
    handleItemUpdate,
    handleItemDelete,
    handleItemDeleteBatch,
    handleItemComplete,
  };
}
