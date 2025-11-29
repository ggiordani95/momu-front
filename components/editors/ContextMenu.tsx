"use client";

import { useEffect, useRef, useState } from "react";

interface ContextMenuOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export interface ContextMenuAnchorRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

interface ContextMenuProps {
  options: ContextMenuOption[];
  onClose: () => void;
  anchorRect?: ContextMenuAnchorRect;
}

export default function ContextMenu({
  options,
  onClose,
  anchorRect,
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

  const [adjustedPosition] = useState<{
    x: number;
    y: number;
  }>(() => ({ x: 66, y: 90 }));

  return (
    <div
      ref={menuRef}
      className="fixed z-50 shadow-2xl w-[200px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        backgroundColor: "rgba(32, 32, 32, 0.331)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        color: "rgba(255, 255, 255, 0.9)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((option, index) => (
        <div key={index}>
          <button
            onClick={() => {
              if (!option.disabled) {
                option.onClick();
                onClose();
              }
            }}
            disabled={option.disabled}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
            style={{
              color: option.disabled
                ? "rgba(255, 255, 255, 0.3)"
                : "rgba(255, 255, 255, 0.9)",
              cursor: option.disabled ? "not-allowed" : "pointer",
              backgroundColor: "transparent",
              borderTop:
                index > 0 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!option.disabled) {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {/* {option.icon && (
              <span
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: "20px",
                  height: "20px",
                  opacity: option.disabled ? 0.3 : 0.9,
                }}
              >
                {option.icon}
              </span>
            )} */}
            <span className="flex-1">{option.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
