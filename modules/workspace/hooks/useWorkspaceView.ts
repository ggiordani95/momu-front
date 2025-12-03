"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import type { ViewType } from "@/modules/workspace/stores/workspaceStore";

export function useWorkspaceView() {
  const pathname = usePathname();
  const { currentView: storeView, setCurrentView } = useWorkspaceStore();
  const hasSyncedRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  const isInternalNavRef = useRef(false);

  useEffect(() => {
    // Check if this is an internal navigation
    if (
      typeof window !== "undefined" &&
      (window as Window & { __isInternalNavigation?: boolean })
        .__isInternalNavigation
    ) {
      isInternalNavRef.current = true;
      prevPathnameRef.current = pathname;
      return;
    }

    // Reset internal nav flag if it was set
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
    }

    // Skip if pathname hasn't actually changed
    if (prevPathnameRef.current === pathname && hasSyncedRef.current) {
      return;
    }
    prevPathnameRef.current = pathname;

    // Get view from URL pathname
    const viewFromPath = pathname?.split("/")[1] as ViewType | undefined;

    // Only sync on initial load or when pathname changes from external navigation
    if (!hasSyncedRef.current) {
      if (viewFromPath) {
        setCurrentView(viewFromPath);
      } else {
        setCurrentView("explorer");
        if (typeof window !== "undefined") {
          requestAnimationFrame(() => {
            window.history.replaceState(
              { ...window.history.state, view: "explorer" },
              "",
              "/explorer"
            );
          });
        }
      }
      hasSyncedRef.current = true;
    } else if (viewFromPath && viewFromPath !== storeView) {
      // External navigation (e.g., browser back/forward)
      setCurrentView(viewFromPath);
    }
  }, [pathname, storeView, setCurrentView]);

  return {
    currentView: storeView,
    setCurrentView,
  };
}
