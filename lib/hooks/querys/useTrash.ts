import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trashService } from "@/lib/services/trashService";
import { itemKeys } from "./useItems";

// Query keys
export const trashKeys = {
  all: ["trash"] as const,
  workspace: (workspaceId: string) =>
    [...trashKeys.all, "workspace", workspaceId] as const,
};

/**
 * Hook to fetch trash items for a workspace
 */
export function useTrashItems(
  workspaceId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: trashKeys.workspace(workspaceId),
    queryFn: () => trashService.getTrashItems(workspaceId),
    enabled: options?.enabled !== false && !!workspaceId,
  });
}

