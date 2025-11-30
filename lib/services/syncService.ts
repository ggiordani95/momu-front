import { apiRequest } from "./api";
import type { Workspace, File } from "@/lib/types";

// ============================================
// Types
// ============================================

export interface SyncFilesResponse {
  workspaces: Workspace[];
  files: File[];
  error?: string;
}

// ============================================
// Sync Service
// ============================================

/**
 * Busca todos os workspaces e files do usuário de uma vez
 * @param userId ID do usuário
 * @returns Objeto com workspaces e files
 */
export async function syncFiles(userId: string): Promise<SyncFilesResponse> {
  try {
    const response = await apiRequest<SyncFilesResponse>(
      `/workspaces/sync-files`,
      {
        method: "GET",
        headers: {
          "X-User-Id": userId,
        },
      }
    );

    return {
      workspaces: response.workspaces || [],
      files: response.files || [],
      error: response.error,
    };
  } catch (error: unknown) {
    console.error("Error syncing files:", error);
    return {
      workspaces: [],
      files: [],
      error: (error as Error)?.message || "Failed to sync files",
    };
  }
}
