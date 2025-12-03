import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { fileService } from "@/lib/services/fileService";
import { fileKeys } from "./querys/useFiles";
import type { HierarchicalFile } from "@/lib/types";

interface MoveFileParams {
  fileId: string;
  parentId: string | null;
  workspaceId: string;
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
    mutationFn: async ({ fileId, parentId }: MoveFileParams) => {
      // Retry logic para deadlock handling
      let retries = 3;
      let lastError: unknown = null;

      while (retries > 0) {
        try {
          const updatedFile = await fileService.update(fileId, {
            parent_id: parentId,
          });
          return updatedFile;
        } catch (error: unknown) {
          lastError = error;
          const errorMessage =
            (error as Error)?.message || String(error) || "Unknown error";

          // Check if it's a deadlock error
          if (
            errorMessage.includes("deadlock") ||
            errorMessage.includes("Deadlock")
          ) {
            retries--;
            if (retries > 0) {
              // Wait a random amount of time (50-200ms) before retrying
              // This helps prevent concurrent requests from retrying at the same time
              const delay = 50 + Math.random() * 150;
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          } else {
            // For non-deadlock errors, don't retry
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
