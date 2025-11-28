import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemService } from "@/lib/services/itemService";
import { buildHierarchy } from "@/lib/utils/hierarchy";
import type { CreateItemDto, UpdateItemDto } from "@/lib/types";

// Query keys
export const itemKeys = {
  all: ["items"] as const,
  workspace: (workspaceId: string) =>
    [...itemKeys.all, "workspace", workspaceId] as const,
  item: (itemId: string) => [...itemKeys.all, "item", itemId] as const,
};

/**
 * Hook to fetch items for a workspace
 */
export function useWorkspaceItems(workspaceId: string) {
  return useQuery({
    queryKey: itemKeys.workspace(workspaceId),
    queryFn: async () => {
      const items = await itemService.getByWorkspace(workspaceId);
      return buildHierarchy(items);
    },
    enabled: !!workspaceId,
  });
}

/**
 * Hook to fetch a single item
 */
export function useItem(itemId: string) {
  return useQuery({
    queryKey: itemKeys.item(itemId),
    queryFn: () => itemService.getById(itemId),
    enabled: !!itemId,
  });
}

/**
 * Hook to create a new item
 */
export function useCreateItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateItemDto) => itemService.create(workspaceId, data),
    onSuccess: () => {
      // Invalidate workspace items query to refetch
      queryClient.invalidateQueries({
        queryKey: itemKeys.workspace(workspaceId),
      });
    },
  });
}

/**
 * Hook to update an item
 */
export function useUpdateItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateItemDto }) =>
      itemService.update(itemId, data),
    onSuccess: (updatedItem) => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: itemKeys.workspace(workspaceId),
      });
      // Invalidate specific item query
      queryClient.invalidateQueries({
        queryKey: itemKeys.item(updatedItem.id),
      });
    },
  });
}

/**
 * Hook to delete an item (soft delete)
 */
export function useDeleteItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => itemService.delete(itemId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: itemKeys.workspace(workspaceId),
      });
    },
  });
}

/**
 * Hook to restore an item from trash
 */
export function useRestoreItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => itemService.restore(itemId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: itemKeys.workspace(workspaceId),
      });
    },
  });
}

/**
 * Hook to permanently delete an item
 */
export function usePermanentDeleteItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => itemService.permanentDelete(itemId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: itemKeys.workspace(workspaceId),
      });
    },
  });
}

/**
 * Hook to update item order
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
    }) => itemService.updateOrder(itemId, orderIndex, parentId),
    onSuccess: () => {
      // Invalidate workspace items query
      queryClient.invalidateQueries({
        queryKey: itemKeys.workspace(workspaceId),
      });
    },
  });
}
