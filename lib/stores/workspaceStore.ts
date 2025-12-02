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

export type ViewType =
  | "explorer"
  | "settings"
  | "trash"
  | "social"
  | "planner"
  | "ai";

interface CurrentWorkspace {
  id: string;
  title: string;
}

interface WorkspaceState {
  // Data
  workspaces: Workspace[];
  files: File[];
  currentWorkspace: CurrentWorkspace | null;
  currentView: ViewType;

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setFiles: (files: File[]) => void;
  setSyncData: (data: SyncFilesResponse) => void;
  setCurrentWorkspace: (workspace: CurrentWorkspace | null | string) => void;
  setCurrentView: (view: ViewType) => void;
  syncFiles: () => Promise<void>;
  addOptimisticFile: (file: File) => void;
  markFileAsDeleted: (fileId: string) => void;
  markFilesAsDeleted: (fileIds: string[]) => void;
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
  getNextOrderIndex: (workspaceId: string, parentId?: string | null) => number;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  workspaces: [],
  files: [],
  currentWorkspace: null,
  currentView: "explorer" as ViewType,
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

      setCurrentWorkspace: (workspaceOrId) => {
        // Accept both CurrentWorkspace object or just workspaceId (string)
        if (typeof workspaceOrId === "string") {
          // If it's just an ID, find the workspace and create CurrentWorkspace object
          const state = get();
          const workspace = state.workspaces.find(
            (w) => w.id === workspaceOrId
          );
          if (workspace) {
            set({
              currentWorkspace: {
                id: workspace.id,
                title: workspace.title,
              },
            });
          } else {
            // Workspace not found, set to null
            set({ currentWorkspace: null });
          }
        } else {
          // It's already a CurrentWorkspace object or null
          set({ currentWorkspace: workspaceOrId });
        }
      },

      setCurrentView: (view) => set({ currentView: view }),

      setSyncData: (data) => {
        const state = get();
        set({
          workspaces: data.workspaces || [],
          files: data.files || [],
          lastSyncAt: new Date(),
          error: data.error || null,
        });

        // Ensure currentWorkspace is set after sync if it's not already set
        if (
          !state.currentWorkspace &&
          data.workspaces &&
          data.workspaces.length > 0
        ) {
          const firstWorkspace = data.workspaces[0];
          set({
            currentWorkspace: {
              id: firstWorkspace.id,
              title: firstWorkspace.title,
            },
          });
        }
      },

      // Calcula o próximo order_index disponível para um workspace + parent_id
      getNextOrderIndex: (workspaceId, parentId = null) => {
        const state = get();
        const relevantFiles = state.files.filter((file) => {
          if (file.workspace_id !== workspaceId) return false;
          const fileParent =
            file.parent_id === undefined || file.parent_id === null
              ? null
              : file.parent_id;
          const targetParent =
            parentId === undefined || parentId === null ? null : parentId;
          return fileParent === targetParent;
        });

        if (relevantFiles.length === 0) return 0;

        const maxOrderIndex = Math.max(
          ...relevantFiles.map((f) => f.order_index ?? 0)
        );
        return maxOrderIndex + 1;
      },

      // Sync action
      syncFiles: async () => {
        const state = get();

        // Evitar múltiplas chamadas simultâneas
        if (state.isSyncing) {
          return;
        }

        set({ isSyncing: true, error: null });

        try {
          const userId = localStorage.getItem("userId") || "user-001";
          const { syncFiles: syncService } = await import(
            "@/lib/services/syncService"
          );
          const data = await syncService(userId);

          const currentState = get();
          const currentWorkspaceId = currentState.currentWorkspace?.id;

          // Ensure currentWorkspace still exists after sync
          let updatedCurrentWorkspace = currentState.currentWorkspace;
          if (currentWorkspaceId && data.workspaces) {
            const workspaceStillExists = data.workspaces.some(
              (w) => w.id === currentWorkspaceId
            );
            if (!workspaceStillExists && data.workspaces.length > 0) {
              // Current workspace was deleted, fallback to first available
              updatedCurrentWorkspace = {
                id: data.workspaces[0].id,
                title: data.workspaces[0].title,
              };
            } else if (workspaceStillExists) {
              // Update title in case it changed
              const workspace = data.workspaces.find(
                (w) => w.id === currentWorkspaceId
              );
              if (workspace) {
                updatedCurrentWorkspace = {
                  id: workspace.id,
                  title: workspace.title,
                };
              }
            }
          } else if (
            !updatedCurrentWorkspace &&
            data.workspaces &&
            data.workspaces.length > 0
          ) {
            // No current workspace, set to first available
            updatedCurrentWorkspace = {
              id: data.workspaces[0].id,
              title: data.workspaces[0].title,
            };
          }

          set({
            workspaces: data.workspaces || [],
            files: data.files || [],
            lastSyncAt: new Date(),
            isSyncing: false,
            error: data.error || null,
            currentWorkspace: updatedCurrentWorkspace,
          });
        } catch (error: unknown) {
          set({
            isSyncing: false,
            error: (error as Error)?.message || "Failed to sync files",
          });
        }
      },

      // Add optimistic file (for CREATE operations)
      addOptimisticFile: (file: File) => {
        const state = get();
        // Check if file already exists
        const existingFile = state.files.find((f) => f.id === file.id);
        if (existingFile) {
          return;
        }
        const updatedFiles = [...state.files, file];
        set({ files: updatedFiles });
      },

      // Mark file as deleted (optimistic update)
      markFileAsDeleted: (fileId: string) => {
        const state = get();
        const fileIndex = state.files.findIndex((file) => file.id === fileId);

        if (fileIndex === -1) {
          return;
        }

        const updatedFiles = state.files.map((file) =>
          file.id === fileId ? { ...file, active: false } : file
        );

        set({ files: updatedFiles });
      },

      // Mark multiple files as deleted (optimistic update) - more efficient for batch deletes
      markFilesAsDeleted: (fileIds: string[]) => {
        const state = get();
        const fileIdsSet = new Set(fileIds);

        const updatedFiles = state.files.map((file) =>
          fileIdsSet.has(file.id) && file.active !== false
            ? { ...file, active: false }
            : file
        );

        set({ files: updatedFiles });
      },

      // Mark file as restored (optimistic update)
      markFileAsRestored: (fileId: string) => {
        const state = get();
        const updatedFiles = state.files.map((file) =>
          file.id === fileId ? { ...file, active: true } : file
        );
        set({ files: updatedFiles });
      },

      // Remove file permanently from store
      removeFilePermanently: (fileId: string) => {
        const state = get();
        const updatedFiles = state.files.filter((file) => file.id !== fileId);
        set({ files: updatedFiles });
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
        currentWorkspace: state.currentWorkspace,
        currentView: state.currentView,
      }),
    }
  )
);
