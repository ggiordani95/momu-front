"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { getItemTypeIcon } from "@/lib/itemTypes";
import React from "react";

interface ExplorerIconProps {
  type: "folder" | "video" | "note";
  title: string;
  youtubeId?: string | null;
  size?: number;
  className?: string;
  iconClassName?: string;
}

export function ExplorerIcon({
  type,
  title,
  youtubeId,
  size = 80,
  className = "",
  iconClassName = "",
}: ExplorerIconProps) {
  const IconComponent = getItemTypeIcon(type);
  const icon = IconComponent
    ? React.createElement(IconComponent, {
        size: size,
        className: `text-foreground/50 ${iconClassName}`,
      })
    : null;

  const thumbnailUrl =
    type === "video" && youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      : null;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center ${className}`}
    >
      {type === "folder" ? (
        <Image
          src="/icons/folder.png"
          alt="Folder"
          width={size}
          height={size}
          className={`w-full h-full object-contain rounded-2xl ${iconClassName}`}
          unoptimized
        />
      ) : thumbnailUrl ? (
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className={`object-cover ${iconClassName}`}
            unoptimized
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Play size={18} className="text-white" fill="white" />
          </div>
        </div>
      ) : (
        <div className={`opacity-90 ${iconClassName}`}>{icon}</div>
      )}
    </div>
  );
}
