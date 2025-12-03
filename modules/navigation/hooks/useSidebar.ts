"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import type { ViewType } from "@/modules/workspace/stores/workspaceStore";

export function useSidebar() {
  const pathname = usePathname();
  const { currentView, setCurrentView } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(true);

  const currentViewFromPath = pathname?.split("/")[1] as ViewType | undefined;

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(
    (view: ViewType) => {
      // Don't navigate if already on the same view
      if (currentViewFromPath === view && currentView === view) {
        return;
      }

      setCurrentView(view);
    },
    [currentViewFromPath, currentView, setCurrentView]
  );

  return {
    isOpen,
    toggleSidebar,
    currentView,
    handleNavigate,
  };
}
