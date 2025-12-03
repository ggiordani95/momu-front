import { apiRequest } from "@/lib/services/api";
import type {
  Workspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from "@/lib/types";

// ============================================
// Workspace Service
// ============================================
// Note: "Folder" type is kept for backward compatibility
// but represents a "Workspace" in the database

export const workspaceService = {
  /**
   * Get all workspaces
   */
  async getAll(): Promise<Workspace[]> {
    return apiRequest<Workspace[]>("/workspaces");
  },

  /**
   * Get a workspace by ID
   */
  async getById(id: string): Promise<Workspace> {
    return apiRequest<Workspace>(`/workspaces/${id}`);
  },

  /**
   * Create a new workspace
   */
  async create(data: CreateWorkspaceDto): Promise<Workspace> {
    return apiRequest<Workspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a workspace
   */
  async update(id: string, data: UpdateWorkspaceDto): Promise<Workspace> {
    return apiRequest<Workspace>(`/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a workspace
   */
  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/workspaces/${id}`, {
      method: "DELETE",
    });
  },
};
