import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fileService } from "@/lib/services/fileService";
import { buildHierarchy } from "@/lib/utils/hierarchy";
import type { CreateFileDto, UpdateFileDto } from "@/lib/types";

// Query keys
// Note: Keeping "items" key name for backward compatibility
// but these represent "files" in the database
export const fileKeys = {
  all: ["files"] as const,
  workspace: (workspaceId: string) =>
    [...fileKeys.all, "workspace", workspaceId] as const,
  file: (fileId: string) => [...fileKeys.all, "file", fileId] as const,
};

/**
 * Hook to fetch files for a workspace
 * Files can be of type: 'folder', 'note', or 'video'
 */
export function useWorkspaceFiles(
  workspaceId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: fileKeys.workspace(workspaceId),
    queryFn: async () => {
      const items = await fileService.getByWorkspace(workspaceId);
      return buildHierarchy(items);
    },
    enabled: options?.enabled !== false && !!workspaceId,
  });
}

/**
 * Hook to fetch a single file
 */
export function useFile(fileId: string) {
  return useQuery({
    queryKey: fileKeys.file(fileId),
    queryFn: () => fileService.getById(fileId),
    enabled: !!fileId,
  });
}

/**
 * Hook to create a new file
 * File type can be: 'folder', 'note', or 'video'
 */
export function useCreateFile(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFileDto) => fileService.create(workspaceId, data),
    onSuccess: () => {
      // Invalidate workspace items query to refetch
      queryClient.invalidateQueries({
        queryKey: fileKeys.workspace(workspaceId),
      });
    },
  });
}

/**
 * Hook to update a file
 */
export function useUpdateFile(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: UpdateFileDto }) =>
      fileService.update(fileId, data),
    onSuccess: (updatedFile) => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: fileKeys.workspace(workspaceId),
      });
      // Invalidate specific item query
      queryClient.invalidateQueries({
        queryKey: fileKeys.file(updatedFile.id),
      });
    },
  });
}

/**
 * Hook to delete a file (soft delete)
 */
export function useDeleteFile(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => fileService.delete(fileId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: fileKeys.workspace(workspaceId),
      });
      // Note: Trash items are now managed by Zustand store (active === false)
      // No need to invalidate trash queries
    },
  });
}

/**
 * Hook to restore a file from trash
 */
export function useRestoreItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => fileService.restore(itemId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: fileKeys.workspace(workspaceId),
      });
      // Note: Trash items are now managed by Zustand store (active === false)
      // No need to invalidate trash queries
    },
  });
}

/**
 * Hook to permanently delete a file
 */
export function usePermanentDeleteItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => fileService.permanentDelete(itemId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: fileKeys.workspace(workspaceId),
      });
      // Note: Trash items are now managed by Zustand store (active === false)
      // No need to invalidate trash queries
    },
  });
}

/**
 * Hook to update file order
 */
export function useUpdateItemOrder(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      orderIndex,
      parentId,
    }: {
      itemId: string;
      orderIndex: number;
      parentId?: string | null;
    }) => fileService.updateOrder(itemId, orderIndex, parentId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: fileKeys.workspace(workspaceId),
      });
    },
  });
}
