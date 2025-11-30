import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/lib/types";
import type { File } from "@/lib/types";

// ============================================
// Types
// ============================================

export interface SyncFilesResponse {
  workspaces: Workspace[];
  files: File[];
  error?: string;
}

interface WorkspaceState {
  // Data
  workspaces: Workspace[];
  files: File[];

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setFiles: (files: File[]) => void;
  setSyncData: (data: SyncFilesResponse) => void;
  syncFiles: () => Promise<void>;
  markFileAsDeleted: (fileId: string) => void;
  markFileAsRestored: (fileId: string) => void;
  removeFilePermanently: (fileId: string) => void;
  updateFileInStore: (fileId: string, updates: Partial<File>) => void;
  clearError: () => void;
  reset: () => void;

  // Getters
  getFilesByWorkspace: (workspaceId: string) => File[];
  getDeletedFilesByWorkspace: (workspaceId: string) => File[];
  getFileById: (fileId: string) => File | undefined;
  getWorkspaceById: (workspaceId: string) => Workspace | undefined;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  workspaces: [],
  files: [],
  isLoading: false,
  isSyncing: false,
  lastSyncAt: null,
  error: null,
};

// ============================================
// Store
// ============================================

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Setters
      setWorkspaces: (workspaces) => set({ workspaces }),

      setFiles: (files) => set({ files }),

      setSyncData: (data) => {
        set({
          workspaces: data.workspaces || [],
          files: data.files || [],
          lastSyncAt: new Date(),
          error: data.error || null,
        });
      },

      // Sync action
      syncFiles: async () => {
        const state = get();

        // Evitar múltiplas chamadas simultâneas
        if (state.isSyncing) {
          console.log("⏭️ Sync já em andamento, ignorando chamada duplicada");
          return;
        }

        set({ isSyncing: true, error: null });

        try {
          const userId = localStorage.getItem("userId") || "user-001";
          const { syncFiles: syncService } = await import(
            "@/lib/services/syncService"
          );
          const data = await syncService(userId);

          set({
            workspaces: data.workspaces || [],
            files: data.files || [],
            lastSyncAt: new Date(),
            isSyncing: false,
            error: data.error || null,
          });
        } catch (error: unknown) {
          console.error("Error syncing files:", error);
          set({
            isSyncing: false,
            error: (error as Error)?.message || "Failed to sync files",
          });
        }
      },

      // Mark file as deleted (optimistic update)
      markFileAsDeleted: (fileId: string) => {
        const state = get();
        const fileIndex = state.files.findIndex((file) => file.id === fileId);

        if (fileIndex === -1) {
          console.warn(
            `⚠️ [Zustand] File ${fileId} not found in store, cannot mark as deleted`
          );
          return;
        }

        const updatedFiles = state.files.map((file) =>
          file.id === fileId ? { ...file, active: false } : file
        );

        set({ files: updatedFiles });
        console.log(`🗑️ [Zustand] Marked file as deleted: ${fileId}`, {
          totalFiles: updatedFiles.length,
          deletedFiles: updatedFiles.filter((f) => f.active === false).length,
        });
      },

      // Mark file as restored (optimistic update)
      markFileAsRestored: (fileId: string) => {
        const state = get();
        const updatedFiles = state.files.map((file) =>
          file.id === fileId ? { ...file, active: true } : file
        );
        set({ files: updatedFiles });
        console.log(`♻️ [Zustand] Marked file as restored: ${fileId}`);
      },

      // Remove file permanently from store
      removeFilePermanently: (fileId: string) => {
        const state = get();
        const updatedFiles = state.files.filter((file) => file.id !== fileId);
        set({ files: updatedFiles });
        console.log(`🗑️ [Zustand] Permanently removed file: ${fileId}`, {
          totalFiles: updatedFiles.length,
        });
      },

      // Update file in store (optimistic update)
      updateFileInStore: (fileId: string, updates: Partial<File>) => {
        const state = get();
        const fileIndex = state.files.findIndex((file) => file.id === fileId);

        if (fileIndex === -1) {
          console.warn(
            `⚠️ [Zustand] File ${fileId} not found in store, cannot update`
          );
          return;
        }

        const updatedFiles = state.files.map((file) =>
          file.id === fileId
            ? { ...file, ...updates, updated_at: new Date().toISOString() }
            : file
        );

        set({ files: updatedFiles });
        console.log(`✏️ [Zustand] Updated file in store: ${fileId}`, updates);
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      reset: () => set(initialState),

      // Getters
      getFilesByWorkspace: (workspaceId: string) => {
        return get().files.filter(
          (file) => file.workspace_id === workspaceId && file.active !== false
        );
      },

      // Get deleted files by workspace (for trash view)
      getDeletedFilesByWorkspace: (workspaceId: string) => {
        return get().files.filter(
          (file) => file.workspace_id === workspaceId && file.active === false
        );
      },

      getFileById: (fileId: string) => {
        return get().files.find((file) => file.id === fileId);
      },

      getWorkspaceById: (workspaceId: string) => {
        return get().workspaces.find((ws) => ws.id === workspaceId);
      },
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({
        workspaces: state.workspaces,
        files: state.files,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
