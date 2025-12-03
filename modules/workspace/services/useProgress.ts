import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/services/api";
import type { WorkspaceProgress } from "@/lib/types";

export function useWorkspaceProgress(workspaceId: string | null) {
  return useQuery<WorkspaceProgress>({
    queryKey: ["workspace-progress", workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required");
      }
      return apiRequest<WorkspaceProgress>(
        `/progress/workspaces/${workspaceId}`
      );
    },
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}
