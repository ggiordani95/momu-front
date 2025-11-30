import { apiRequest } from "./api";
import type {
  HierarchicalFile,
  CreateFileDto,
  UpdateFileDto,
} from "@/lib/types";
import type { PendingOperation } from "./offlineSync";

// ============================================
// File Service
// ============================================
// Note: Files can be of different types: 'folder', 'note', 'video'
// All are stored in the 'files' table with type-specific tables

export const fileService = {
  /**
   * Get all files from a workspace
   * Files can be of type: 'folder', 'note', or 'video'
   */
  async getByWorkspace(workspaceId: string): Promise<HierarchicalFile[]> {
    return apiRequest<HierarchicalFile[]>(`/workspaces/${workspaceId}/files`);
  },

  /**
   * Get a single file by ID
   */
  async getById(fileId: string): Promise<HierarchicalFile> {
    return apiRequest<HierarchicalFile>(`/files/${fileId}`);
  },

  /**
   * Create a new file
   * File type can be: 'folder', 'note', or 'video'
   */
  async create(
    workspaceId: string,
    data: CreateFileDto
  ): Promise<HierarchicalFile> {
    return apiRequest<HierarchicalFile>(`/workspaces/${workspaceId}/files`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a file
   */
  async update(fileId: string, data: UpdateFileDto): Promise<HierarchicalFile> {
    return apiRequest<HierarchicalFile>(`/files/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update file order
   */
  async updateOrder(
    fileId: string,
    orderIndex: number,
    parentId?: string | null
  ): Promise<HierarchicalFile> {
    // Note: This endpoint might need to be implemented in the backend
    // For now, we'll use the update endpoint
    return apiRequest<HierarchicalFile>(`/files/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify({
        order_index: orderIndex,
        parent_id: parentId,
      }),
    });
  },

  /**
   * Soft delete a file (move to trash)
   */
  async delete(fileId: string): Promise<{ success: boolean; id: string }> {
    return apiRequest<{ success: boolean; id: string }>(`/files/${fileId}`, {
      method: "DELETE",
    });
  },

  /**
   * Restore a file from trash
   */
  async restore(fileId: string): Promise<HierarchicalFile> {
    return apiRequest<HierarchicalFile>(`/files/${fileId}/restore`, {
      method: "POST",
    });
  },

  /**
   * Permanently delete a file
   */
  async permanentDelete(
    fileId: string
  ): Promise<{ success: boolean; id: string }> {
    // Note: This endpoint might need to be implemented in the backend
    // For now, we'll use the delete endpoint
    return apiRequest<{ success: boolean; id: string }>(`/files/${fileId}`, {
      method: "DELETE",
    });
  },

  /**
   * Sync operations in batch
   */
  async syncBatch(operations: PendingOperation[]): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    results: Array<{
      operationId: string;
      type: string;
      item?: HierarchicalFile;
      skipped?: boolean;
      reason?: string;
    }>;
    errors: string[];
    tempIdMap?: Record<string, string>;
  }> {
    return apiRequest<{
      success: boolean;
      synced: number;
      failed: number;
      results: Array<{
        operationId: string;
        type: string;
        item?: HierarchicalFile;
        skipped?: boolean;
        reason?: string;
      }>;
      errors: string[];
      tempIdMap?: Record<string, string>;
    }>(`/workspaces/sync`, {
      method: "POST",
      body: JSON.stringify({ operations }),
    });
  },
};
