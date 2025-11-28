import {
  FolderIcon,
  VideoIcon,
  TaskIcon,
  NoteIcon,
} from "@/components/icons/ItemIcons";
import React from "react";

export type ItemType = "section" | "video" | "task" | "note";

export interface ItemTypeConfig {
  type: ItemType;
  label: string;
  emoji: string; // Keep for backward compatibility
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const ITEM_TYPES: ItemTypeConfig[] = [
  {
    type: "section",
    label: "Seção",
    emoji: "📂",
    icon: FolderIcon,
  },
  {
    type: "video",
    label: "Vídeo",
    emoji: "🎥",
    icon: VideoIcon,
  },
  {
    type: "task",
    label: "Tarefa",
    emoji: "✅",
    icon: TaskIcon,
  },
  {
    type: "note",
    label: "Nota",
    emoji: "📝",
    icon: NoteIcon,
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
