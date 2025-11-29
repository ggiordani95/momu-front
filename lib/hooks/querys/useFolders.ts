import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateFolderDto, UpdateFolderDto } from "@/lib/types";
import { folderService } from "../../services/folderService";

// Query keys
export const folderKeys = {
  all: ["folders"] as const,
  list: () => [...folderKeys.all, "list"] as const,
  detail: (id: string) => [...folderKeys.all, "detail", id] as const,
};

/**
 * Hook to fetch all folders
 */
export function useFolders() {
  return useQuery({
    queryKey: folderKeys.list(),
    queryFn: () => folderService.getAll(),
  });
}

/**
 * Hook to fetch a single workspace
 */
export function useWorkspace(id: string) {
  return useQuery({
    queryKey: folderKeys.detail(id),
    queryFn: () => folderService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFolderDto) => folderService.create(data),
    onSuccess: () => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: folderKeys.list(),
      });
    },
  });
}

/**
 * Hook to update a workspace
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFolderDto }) =>
      folderService.update(id, data),
    onSuccess: (updatedFolder) => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: folderKeys.list(),
      });
      // Invalidate specific workspace
      if (
        updatedFolder &&
        typeof updatedFolder === "object" &&
        "id" in updatedFolder
      ) {
        queryClient.invalidateQueries({
          queryKey: folderKeys.detail((updatedFolder as { id: string }).id),
        });
      }
    },
  });
}

/**
 * Hook to delete a workspace
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => folderService.delete(id),
    onSuccess: () => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: folderKeys.list(),
      });
    },
  });
}
