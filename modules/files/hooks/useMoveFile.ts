import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { fileService } from "../services/fileService";
import { fileKeys } from "../services/useFilesQuery";
import { buildHierarchy, findItemById } from "../utils/hierarchy";
import type { HierarchicalFile } from "@/lib/types";

interface MoveFileParams {
  fileId: string;
  parentId: string | null;
  workspaceId: string;
  orderIndex?: number; // Optional: if not provided, will be calculated
}

interface MoveFileOptions {
  onSuccess?: (updatedFile: HierarchicalFile) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook customizado para mover arquivos entre pastas
 *
 * Features:
 * - Optimistic updates via Zustand store
 * - Retry logic para deadlocks (3 tentativas com delay aleatório)
 * - Sincronização automática após mover
 * - Rollback automático em caso de erro
 * - Integração com React Query para cache invalidation
 *
 * @example
 * ```tsx
 * const moveFile = useMoveFile(workspaceId);
 *
 * // Mover arquivo para uma pasta
 * moveFile.mutate({ fileId: "file-123", parentId: "folder-456", workspaceId });
 *
 * // Mover arquivo para a raiz
 * moveFile.mutate({ fileId: "file-123", parentId: null, workspaceId });
 * ```
 */
export function useMoveFile(workspaceId: string, options?: MoveFileOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, parentId, orderIndex }: MoveFileParams) => {
      // Calculate order_index if not provided
      let calculatedOrderIndex = orderIndex;

      // Helper function to calculate unique order_index
      const calculateUniqueOrderIndex = (retryAttempt: number = 0): number => {
        const { files } = useWorkspaceStore.getState();
        const workspaceFiles = files.filter(
          (f) => f.workspace_id === workspaceId && f.active !== false
        );
        const hierarchy = buildHierarchy(workspaceFiles);

        // Get files in the target parent
        let targetFiles: HierarchicalFile[] = [];
        if (parentId) {
          const parentFolder = findItemById(hierarchy, parentId);
          targetFiles = parentFolder?.children || [];
        } else {
          // Root level files
          targetFiles = hierarchy.filter((item) => !item.parent_id);
        }

        // Exclude the file being moved from the calculation
        targetFiles = targetFiles.filter((f) => f.id !== fileId);

        // Calculate order_index: max + 1, or 0 if empty
        if (targetFiles.length === 0) {
          // Use timestamp-based unique value to avoid conflicts
          return Date.now() % 1000000; // Use last 6 digits of timestamp
        } else {
          const maxOrder = Math.max(
            ...targetFiles.map((f) => f.order_index || 0)
          );
          // Use fractional indexing strategy: place between max and MAX_ORDER
          // Add a unique component based on timestamp and retry attempt to ensure uniqueness
          const MAX_ORDER = 2147483647;
          const baseOrder = Math.floor((maxOrder + MAX_ORDER) / 2);

          // Add a small unique component (timestamp-based) to avoid conflicts
          // This ensures each request gets a unique order_index even if they run simultaneously
          const uniqueComponent = (Date.now() % 10000) + retryAttempt * 1000;

          // Ensure we don't exceed MAX_ORDER
          const finalOrder = Math.min(
            baseOrder + uniqueComponent,
            MAX_ORDER - 1
          );

          return finalOrder;
        }
      };

      if (calculatedOrderIndex === undefined) {
        calculatedOrderIndex = calculateUniqueOrderIndex();

        console.log("[useMoveFile] Calculated order_index:", {
          fileId,
          parentId,
          calculatedOrderIndex,
        });
      }

      // Retry logic para deadlock e constraint errors
      let retries = 3;
      let lastError: unknown = null;

      while (retries > 0) {
        try {
          const updatedFile = await fileService.update(fileId, {
            parent_id: parentId,
            order_index: calculatedOrderIndex,
          });
          return updatedFile;
        } catch (error: unknown) {
          lastError = error;
          const errorMessage =
            (error as Error)?.message || String(error) || "Unknown error";

          // Check if it's a deadlock or constraint error
          const isDeadlock =
            errorMessage.includes("deadlock") ||
            errorMessage.includes("Deadlock");
          const isConstraintError =
            errorMessage.includes("duplicate key") ||
            errorMessage.includes("unique constraint") ||
            errorMessage.includes("files_workspace_parent_order_idx");

          if (isDeadlock || isConstraintError) {
            retries--;
            if (retries > 0) {
              // Recalculate order_index with a new unique value for retry
              calculatedOrderIndex = calculateUniqueOrderIndex(3 - retries);

              // Wait a random amount of time (50-200ms) before retrying
              // This helps prevent concurrent requests from retrying at the same time
              const delay = 50 + Math.random() * 150;
              console.log(
                `[useMoveFile] Retrying with new order_index: ${calculatedOrderIndex} after ${delay.toFixed(
                  0
                )}ms (${retries} retries left)`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          } else {
            // For non-deadlock/constraint errors, don't retry
            break;
          }
        }
      }

      // If all retries failed, throw the last error
      throw new Error(
        `Failed to move file after multiple retries: ${String(lastError)}`
      );
    },
    onMutate: async ({ fileId, parentId }) => {
      // Optimistic update: atualizar Zustand store imediatamente
      const { files, updateFileInStore } = useWorkspaceStore.getState();
      const file = files.find(
        (f) => f.id === fileId && f.workspace_id === workspaceId
      );

      if (!file) {
        console.warn(
          "[useMoveFile] File not found for optimistic update:",
          fileId
        );
        return { previousFile: null, originalParentId: null };
      }

      // Store original parent_id for rollback
      const originalParentId = file.parent_id;

      // Optimistic update
      console.log("[useMoveFile] Optimistic update:", {
        fileId,
        originalParentId,
        newParentId: parentId,
      });
      updateFileInStore(fileId, { parent_id: parentId });

      return { previousFile: file, originalParentId };
    },
    onSuccess: async (updatedFile) => {
      // Update Zustand store with the response from backend
      // This includes parent_id, order_index, and updated_at
      const { updateFileInStore } = useWorkspaceStore.getState();
      updateFileInStore(updatedFile.id, {
        parent_id: updatedFile.parent_id,
        order_index: updatedFile.order_index,
        updated_at: updatedFile.updated_at,
      });

      console.log("[useMoveFile] Success:", {
        fileId: updatedFile.id,
        parent_id: updatedFile.parent_id,
        order_index: updatedFile.order_index,
      });

      // Invalidate React Query cache
      queryClient.invalidateQueries({
        queryKey: fileKeys.workspace(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: fileKeys.file(updatedFile.id),
      });

      // Force a sync to refresh the hierarchy after moving
      // This ensures the UI updates correctly (file appears in new location)
      const { syncFiles, isSyncing } = useWorkspaceStore.getState();
      if (!isSyncing) {
        // Use a small delay to ensure the store update is processed first
        setTimeout(async () => {
          try {
            await syncFiles();
          } catch (syncError) {
            console.error("[useMoveFile] Error syncing after move:", syncError);
          }
        }, 200);
      }

      // Call custom onSuccess callback if provided
      if (options?.onSuccess) {
        options.onSuccess(updatedFile);
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.originalParentId !== undefined) {
        const { updateFileInStore } = useWorkspaceStore.getState();
        updateFileInStore(variables.fileId, {
          parent_id: context.originalParentId,
        });
        console.log("[useMoveFile] Rolled back optimistic update:", {
          fileId: variables.fileId,
          originalParentId: context.originalParentId,
        });
      }

      console.error("[useMoveFile] Error moving file:", error);

      // Call custom onError callback if provided
      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });
}

/**
 * Hook simplificado que retorna apenas a função de mover
 * Útil quando você só precisa da função, não do estado da mutation
 */
export function useMoveFileAction(workspaceId: string) {
  const moveFile = useMoveFile(workspaceId);
  return moveFile.mutate;
}
