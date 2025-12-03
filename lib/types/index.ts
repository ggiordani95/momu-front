import { type ItemType } from "@/modules/files/types/filesTypes";

// ============================================
// Folder Types
// ============================================

export interface Workspace {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_public: boolean;
  cover_color?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateWorkspaceDto {
  title: string;
  description?: string;
  user_id?: string;
}

export interface UpdateWorkspaceDto {
  title?: string;
  description?: string;
  is_public?: boolean;
  cover_color?: string;
}

// ============================================
// Item Types
// ============================================

export interface File {
  id: string;
  workspace_id: string;
  type: ItemType;
  title: string;
  content?: string;
  youtube_id?: string;
  youtube_url?: string;
  parent_id?: string | null;
  order_index?: number;
  active?: boolean;
  completed?: boolean;
  completed_at?: string;
  video_watched_seconds?: number;
  created_at: string;
  updated_at?: string;
}

export interface HierarchicalFile extends File {
  children?: HierarchicalFile[];
}

export interface CreateFileDto {
  type: ItemType;
  title: string;
  content?: string;
  youtube_url?: string;
  parent_id?: string;
  order_index?: number;
  active?: boolean;
}

export interface UpdateFileDto {
  title?: string;
  content?: string;
  youtube_url?: string;
  parent_id?: string | null;
  order_index?: number;
  active?: boolean;
  completed?: boolean;
  completed_at?: string;
  video_watched_seconds?: number;
}

// ============================================
// Progress Types
// ============================================

export interface WorkspaceProgress {
  workspace_id: string;
  total_files: number;
  completed_files: number;
  progress_percentage: number;
  completed_videos: number;
  completed_notes: number;
  completed_folders: number;
}

// ============================================
// Trash Types
// ============================================

export interface TrashFile extends File {
  active: boolean;
}
