import { apiRequest } from "./api";
import type { FolderItem, CreateItemDto, UpdateItemDto } from "@/lib/types";

// ============================================
// Item Service
// ============================================

export const itemService = {
  /**
   * Get all items from a workspace
   */
  async getByWorkspace(workspaceId: string): Promise<FolderItem[]> {
    return apiRequest<FolderItem[]>(`/folders/${workspaceId}/items`);
  },

  /**
   * Get a single item by ID
   */
  async getById(itemId: string): Promise<FolderItem> {
    return apiRequest<FolderItem>(`/folders/items/${itemId}`);
  },

  /**
   * Create a new item
   */
  async create(workspaceId: string, data: CreateItemDto): Promise<FolderItem> {
    return apiRequest<FolderItem>(`/folders/${workspaceId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an item
   */
  async update(itemId: string, data: UpdateItemDto): Promise<FolderItem> {
    return apiRequest<FolderItem>(`/folders/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update item order
   */
  async updateOrder(
    itemId: string,
    orderIndex: number,
    parentId?: string | null
  ): Promise<FolderItem> {
    return apiRequest<FolderItem>(`/folders/items/${itemId}/order`, {
      method: "PATCH",
      body: JSON.stringify({
        order_index: orderIndex,
        parent_id: parentId,
      }),
    });
  },

  /**
   * Soft delete an item (move to trash)
   */
  async delete(itemId: string): Promise<{ success: boolean; id: string }> {
    return apiRequest<{ success: boolean; id: string }>(
      `/folders/items/${itemId}`,
      {
        method: "DELETE",
      }
    );
  },

  /**
   * Restore an item from trash
   */
  async restore(itemId: string): Promise<FolderItem> {
    return apiRequest<FolderItem>(`/folders/items/${itemId}/restore`, {
      method: "POST",
    });
  },

  /**
   * Permanently delete an item
   */
  async permanentDelete(
    itemId: string
  ): Promise<{ success: boolean; id: string }> {
    return apiRequest<{ success: boolean; id: string }>(
      `/folders/items/${itemId}/permanent`,
      {
        method: "DELETE",
      }
    );
  },

  /**
   * Sync operations in batch
   */
  async syncBatch(
    workspaceId: string,
    operations: any[]
  ): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    results: any[];
    errors: string[];
    tempIdMap?: Record<string, string>;
  }> {
    return apiRequest<{
      success: boolean;
      synced: number;
      failed: number;
      results: any[];
      errors: string[];
      tempIdMap?: Record<string, string>;
    }>(`/folders/${workspaceId}/sync`, {
      method: "POST",
      body: JSON.stringify({ operations }),
    });
  },
};
