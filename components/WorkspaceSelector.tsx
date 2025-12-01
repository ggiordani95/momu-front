"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";

interface WorkspaceSelectorProps {
  currentWorkspaceId?: string;
  currentView?: "explorer" | "settings" | "trash" | "social" | "planner" | "ai";
  onWorkspaceChange?: (workspaceId: string) => void;
  className?: string;
  showLabel?: boolean;
}

export function WorkspaceSelector({
  currentWorkspaceId,
  onWorkspaceChange,
  className = "",
  showLabel = false,
}: WorkspaceSelectorProps) {
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    setCurrentWorkspace,
  } = useWorkspaceStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Initialize selectedWorkspaceId with currentWorkspaceId if not set
  useEffect(() => {
    if (!selectedWorkspaceId && currentWorkspaceId) {
      setSelectedWorkspaceId(currentWorkspaceId);
    }
  }, [selectedWorkspaceId, currentWorkspaceId, setSelectedWorkspaceId]);

  // Use selectedWorkspaceId from store if available, otherwise use currentWorkspaceId
  const activeWorkspaceId = selectedWorkspaceId || currentWorkspaceId;
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const handleWorkspaceSelect = (workspaceId: string) => {
    setIsDropdownOpen(false);
    setSelectedWorkspaceId(workspaceId);

    // Update currentWorkspace in store
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace({
        id: workspace.id,
        title: workspace.title,
      });
    }

    // Call custom handler if provided, but don't navigate (client-side only)
    if (onWorkspaceChange) {
      onWorkspaceChange(workspaceId);
    }
    // No router.push - stays client-side only, URL doesn't change
  };

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div className={`relative z-30 ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-foreground/70 mb-2">
          Workspace
        </label>
      )}
      <button
        ref={buttonRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg transition-colors text-sm border border-border relative z-30"
        style={{ pointerEvents: "auto" }}
      >
        <span className="text-base font-medium text-foreground truncate">
          {currentWorkspace?.title || "Selecionar workspace"}
        </span>
        <ChevronDown className="w-4 h-4 text-foreground/40 shrink-0" />
      </button>
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          style={{ pointerEvents: "auto" }}
        >
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleWorkspaceSelect(ws.id)}
              className={`w-full text-left px-4 py-2 hover:bg-foreground/5 transition-colors ${
                activeWorkspaceId === ws.id
                  ? "bg-foreground/10 font-medium"
                  : ""
              }`}
            >
              {ws.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
