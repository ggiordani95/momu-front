import { FolderIcon, VideoIcon, TaskIcon, NoteIcon } from "@/components/Icons";
import React from "react";

export type FileType = "folder" | "video" | "note";

export interface FileTypeConfig {
  type: FileType;
  label: string;
  emoji: string; // Keep for backward compatibility
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const FILE_TYPES: FileTypeConfig[] = [
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

export const getFileTypeConfig = (
  type: FileType
): FileTypeConfig | undefined => {
  return FILE_TYPES.find((item) => item.type === type);
};

export const getFileTypeEmoji = (type: FileType): string => {
  return getFileTypeConfig(type)?.emoji || "📄";
};

export const getFileTypeLabel = (type: FileType): string => {
  return getFileTypeConfig(type)?.label || "Item";
};

export const getFileTypeIcon = (
  type: FileType
): React.ComponentType<{ size?: number; className?: string }> | undefined => {
  return getFileTypeConfig(type)?.icon;
};
