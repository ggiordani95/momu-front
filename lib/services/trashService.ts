import { apiRequest } from "./api";
import type { TrashItem } from "@/lib/types";

// ============================================
// Trash Service
// ============================================

export const trashService = {
  /**
   * Get all items in trash for a workspace
   */
  async getTrashItems(workspaceId: string): Promise<TrashItem[]> {
    return apiRequest<TrashItem[]>(`/folders/${workspaceId}/trash`);
  },
};
