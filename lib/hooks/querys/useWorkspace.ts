import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from "@/lib/types";
import { workspaceService } from "../../services/workspaceService";

// Query keys
export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  detail: (id: string) => [...workspaceKeys.all, "detail", id] as const,
};

/**
 * Hook to fetch all workspaces
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspaceService.getAll(),
  });
}

/**
 * Hook to fetch a single workspace
 */
export function useWorkspace(id: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => workspaceService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceDto) => workspaceService.create(data),
    onSuccess: () => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.list(),
      });
    },
  });
}

/**
 * Hook to update a workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceDto }) =>
      workspaceService.update(id, data),
    onSuccess: (updatedWorkspace) => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.list(),
      });
      // Invalidate specific workspace
      if (
        updatedWorkspace &&
        typeof updatedWorkspace === "object" &&
        "id" in updatedWorkspace
      ) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(
            (updatedWorkspace as { id: string }).id
          ),
        });
      }
    },
  });
}

/**
 * Hook to delete a workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceService.delete(id),
    onSuccess: () => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.list(),
      });
    },
  });
}
