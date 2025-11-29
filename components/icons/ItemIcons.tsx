import React from "react";
import Image from "next/image";
import { Folder, Play } from "lucide-react";

interface IconProps {
  size?: number;
  className?: string;
}

// Folder icon (Section) - Using Lucide React with blue dot
export const FolderIcon: React.FC<IconProps> = ({ size = 20 }) => (
  <div className="relative inline-block" style={{ width: size, height: size }}>
    <Image
      src="/icons/folder.png"
      alt="Tarefa"
      width={size}
      height={size}
      style={{ objectFit: "contain", opacity: 0.9 }}
      priority
    />
  </div>
);

// Video icon - Using Lucide React Play icon with green dot
export const VideoIcon: React.FC<IconProps> = ({
  size = 20,
  className = "",
}) => (
  <div className="relative inline-block" style={{ width: size, height: size }}>
    <Play
      size={size}
      className={className}
      style={{ color: "var(--foreground)", opacity: 0.8 }}
    />
    <div
      className="absolute rounded-full"
      style={{
        width: size * 0.3,
        height: size * 0.3,
        backgroundColor: "#4CAF50",
        bottom: 0,
        right: 0,
        transform: "translate(25%, 25%)",
      }}
    />
  </div>
);

// CheckSquare icon (Task) - Using Lucide React with orange dot
export const TaskIcon: React.FC<IconProps> = ({
  size = 20,
  className = "",
}) => (
  <div
    className={`relative inline-block ${className}`}
    style={{ width: size, height: size }}
  >
    <Image
      src="/icons/check.png"
      alt="Tarefa"
      width={size}
      height={size}
      style={{ objectFit: "contain", opacity: 0.9 }}
      priority
    />
  </div>
);

// Note icon - Using Lucide React with yellow dot
export const NoteIcon: React.FC<IconProps> = ({
  size = 20,
  className = "",
}) => (
  <div
    className={`relative inline-block ${className}`}
    style={{ width: size, height: size }}
  >
    <Image
      src="/icons/note.png"
      alt="Bloco de notas"
      width={size}
      height={size}
      style={{ objectFit: "contain", opacity: 1, marginTop: 2 }}
      priority
    />
  </div>
);
