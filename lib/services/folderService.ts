import { apiRequest } from "./api";
import type { Folder, CreateFolderDto, UpdateFolderDto } from "@/lib/types";

// ============================================
// Folder Service
// ============================================

export const folderService = {
  /**
   * Get all folders
   */
  async getAll(): Promise<Folder[]> {
    return apiRequest<Folder[]>("/folders");
  },

  /**
   * Get a workspace by ID
   */
  async getById(id: string): Promise<Folder> {
    return apiRequest<Folder>(`/folders/${id}`);
  },

  /**
   * Create a new workspace
   */
  async create(data: CreateFolderDto): Promise<Folder> {
    return apiRequest<Folder>("/folders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a workspace
   */
  async update(id: string, data: UpdateFolderDto): Promise<Folder> {
    return apiRequest<Folder>(`/folders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a folder
   */
  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/folders/${id}`, {
      method: "DELETE",
    });
  },
};
