"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Copy, Scissors, FileEdit, FolderPlus } from "lucide-react";

interface ContextMenuOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

export default function ContextMenu({
  x,
  y,
  options,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Add listeners after a small delay to avoid immediate close
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 10);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      let newY = y;

      if (x + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }

      // Avoid setting state synchronously in the effect
      // Only update if value changed to prevent re-render loop
      setAdjustedPosition((pos) => {
        if (pos.x !== newX || pos.y !== newY) {
          return { x: newX, y: newY };
        }
        return pos;
      });
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[180px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((option, index) => (
        <div key={index}>
          {option.separator && index > 0 && (
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          )}
          <button
            onClick={() => {
              if (!option.disabled) {
                option.onClick();
                onClose();
              }
            }}
            disabled={option.disabled}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
              option.disabled
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-200 hover:bg-hover"
            }`}
          >
            {option.icon && (
              <span className="w-4 h-4 shrink-0">{option.icon}</span>
            )}
            <span>{option.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
