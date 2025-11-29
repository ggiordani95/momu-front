import {
  FolderIcon,
  VideoIcon,
  TaskIcon,
  NoteIcon,
} from "@/components/icons/ItemIcons";
import React from "react";

export type ItemType = "folder" | "video" | "note";

export interface ItemTypeConfig {
  type: ItemType;
  label: string;
  emoji: string; // Keep for backward compatibility
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const ITEM_TYPES: ItemTypeConfig[] = [
  {
    type: "folder",
    label: "Pasta",
    emoji: "📂",
    icon: FolderIcon,
  },
  {
    type: "note",
    label: "Bloco de notas",
    emoji: "📝",
    icon: NoteIcon,
  },
  {
    type: "video",
    label: "Vídeo",
    emoji: "🎥",
    icon: VideoIcon,
  },
];

export const getItemTypeConfig = (
  type: ItemType
): ItemTypeConfig | undefined => {
  return ITEM_TYPES.find((item) => item.type === type);
};

export const getItemTypeEmoji = (type: ItemType): string => {
  return getItemTypeConfig(type)?.emoji || "📄";
};

export const getItemTypeLabel = (type: ItemType): string => {
  return getItemTypeConfig(type)?.label || "Item";
};

export const getItemTypeIcon = (
  type: ItemType
): React.ComponentType<{ size?: number; className?: string }> | undefined => {
  return getItemTypeConfig(type)?.icon;
};
