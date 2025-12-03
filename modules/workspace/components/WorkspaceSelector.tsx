"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";

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
  const { workspaces, currentWorkspace, setCurrentWorkspace } =
    useWorkspaceStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Initialize currentWorkspace with currentWorkspaceId if not set
  useEffect(() => {
    if (!currentWorkspace && currentWorkspaceId) {
      const workspace = workspaces.find((w) => w.id === currentWorkspaceId);
      if (workspace) {
        setCurrentWorkspace({
          id: workspace.id,
          title: workspace.title,
        });
      }
    }
  }, [currentWorkspace, currentWorkspaceId, workspaces, setCurrentWorkspace]);

  // Use currentWorkspace from store as source of truth
  const activeWorkspaceId = currentWorkspace?.id || currentWorkspaceId;
  const displayedWorkspace = useMemo(
    () =>
      workspaces.find((w) => w.id === activeWorkspaceId) ||
      (currentWorkspace
        ? { id: currentWorkspace.id, title: currentWorkspace.title }
        : null),
    [workspaces, activeWorkspaceId, currentWorkspace]
  );

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

    // Find workspace object
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return;
    }

    // Update currentWorkspace
    setCurrentWorkspace({
      id: workspace.id,
      title: workspace.title,
    });

    // Call custom handler if provided
    if (onWorkspaceChange) {
      onWorkspaceChange(workspaceId);
    }
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
          {displayedWorkspace?.title || "Selecionar workspace"}
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
