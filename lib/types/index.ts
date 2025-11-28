import { type ItemType } from "@/lib/itemTypes";

// ============================================
// Folder Types
// ============================================

export interface Folder {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_public: boolean;
  cover_color?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateFolderDto {
  title: string;
  description?: string;
  user_id?: string;
}

export interface UpdateFolderDto {
  title?: string;
  description?: string;
  is_public?: boolean;
  cover_color?: string;
}

// ============================================
// Item Types
// ============================================

export interface FolderItem {
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
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface HierarchicalItem extends FolderItem {
  children?: HierarchicalItem[];
}

export interface CreateItemDto {
  type: ItemType;
  title: string;
  content?: string;
  youtube_url?: string;
  parent_id?: string;
  active?: boolean;
}

export interface UpdateItemDto {
  title?: string;
  content?: string;
  youtube_url?: string;
  parent_id?: string | null;
  order_index?: number;
  active?: boolean;
}

// ============================================
// Trash Types
// ============================================

export interface TrashItem extends FolderItem {
  deleted_at: string;
}
