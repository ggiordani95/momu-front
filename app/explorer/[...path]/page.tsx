"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import WorkspaceView from "@/app/[workspaceId]/WorkspaceView";

export default function ExplorerPathPage() {
  const params = useParams();
  const pathname = usePathname();
  const { workspaces } = useWorkspaceData();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const path = params?.path as string[] | undefined;

  // Parse path: first segment should be workspaceId, rest are folder/file IDs
  const pathSegments = Array.isArray(path) ? path : path ? [path] : [];

  // Check if first segment is a workspace ID
  const firstSegment = pathSegments[0];
  const isFirstSegmentWorkspaceId = workspaces.some(
    (w) => w.id === firstSegment
  );

  // Track previous workspace to detect changes (initialize with URL workspace if present, otherwise store)
  const urlWorkspaceId = isFirstSegmentWorkspaceId ? firstSegment : null;
  const prevWorkspaceIdRef = useRef<string | undefined>(
    urlWorkspaceId || currentWorkspace?.id
  );
  // Track the last workspace ID that was set in the URL to prevent sync loops
  const lastUrlWorkspaceIdRef = useRef<string | null>(urlWorkspaceId);
  // Track if we just updated the URL from the store (to prevent sync back)
  const justUpdatedUrlFromStoreRef = useRef(false);

  // Extract workspace ID - prioritize store workspace (for smooth client-side transitions)
  // Only use URL workspace if store is not set (for direct URL access)
  const activeWorkspaceId = useMemo(() => {
    // Priority 1: Use store workspace (from selector or previous navigation) - smooth transitions
    if (currentWorkspace?.id) {
      return currentWorkspace.id;
    }

    // Priority 2: If URL contains a workspace ID as first segment, use it (direct URL access)
    if (isFirstSegmentWorkspaceId && firstSegment) {
      return firstSegment;
    }

    // Priority 3: Fallback to first available workspace
    return workspaces[0]?.id || null;
  }, [
    currentWorkspace, // Use full object to ensure reactivity when workspace changes
    isFirstSegmentWorkspaceId,
    firstSegment,
    workspaces,
  ]);

  const folderPathSegments = isFirstSegmentWorkspaceId
    ? pathSegments.slice(1)
    : pathSegments;

  // Update URL when workspace changes in store (when selected via WorkspaceSelector)
  // Uses window.history.replaceState for smooth client-side transitions (no flicker)
  useEffect(() => {
    if (!currentWorkspace?.id || !pathname) {
      return;
    }

    // Get current URL workspace ID
    const currentUrlWorkspaceId = isFirstSegmentWorkspaceId
      ? firstSegment
      : null;

    // Get current view from pathname (preserve the current view)
    const viewFromPath = pathname.split("/")[1] as
      | "explorer"
      | "settings"
      | "trash"
      | "social"
      | "planner"
      | "ai"
      | undefined;
    const currentViewFromPath = viewFromPath || "explorer";

    // Update URL if store workspace is different from URL workspace
    // This ensures that when user selects a workspace in the selector, the URL updates
    // IMPORTANT: Preserve the current view (explorer, trash, etc.) when changing workspace
    if (currentUrlWorkspaceId !== currentWorkspace.id) {
      // Use the view from the current pathname, not from store, to preserve the user's current view
      const newPath = `/${currentViewFromPath}/${currentWorkspace.id}`;

      console.log("[ExplorerPathPage] Updating URL for workspace change:", {
        oldWorkspaceId: currentUrlWorkspaceId,
        newWorkspaceId: currentWorkspace.id,
        currentView: currentViewFromPath,
        newPath,
      });

      // Update the ref to track what we're setting in the URL
      lastUrlWorkspaceIdRef.current = currentWorkspace.id;
      // Mark that we're updating URL from store (prevent sync back)
      justUpdatedUrlFromStoreRef.current = true;
      prevWorkspaceIdRef.current = currentWorkspace.id;

      // Use window.history.replaceState for smooth client-side URL update (no re-render)
      // This prevents flicker by updating URL without triggering server-side navigation
      if (typeof window !== "undefined") {
        window.history.replaceState(
          { ...window.history.state, workspaceId: currentWorkspace.id },
          "",
          newPath
        );
      }

      // Reset flag after URL has had time to update
      setTimeout(() => {
        justUpdatedUrlFromStoreRef.current = false;
      }, 200);
    } else {
      // Update ref to track current workspace
      prevWorkspaceIdRef.current = currentWorkspace.id;
      // Update last URL workspace if it matches
      if (currentUrlWorkspaceId) {
        lastUrlWorkspaceIdRef.current = currentUrlWorkspaceId;
      }
    }
  }, [currentWorkspace?.id, pathname, isFirstSegmentWorkspaceId, firstSegment]);

  // Sync workspace from URL to store when URL contains a workspace ID
  // This ensures the store reflects the URL workspace (for direct URL access)
  // Only sync if the URL workspace is different from what we last set (prevent infinite loop)
  useEffect(() => {
    // If URL contains a workspace ID, sync it to the store
    if (
      isFirstSegmentWorkspaceId &&
      workspaces.length > 0 &&
      activeWorkspaceId
    ) {
      const workspace = workspaces.find((w) => w.id === activeWorkspaceId);

      // Only sync if:
      // 1. Workspace exists
      // 2. Store workspace is different from URL workspace
      // 3. URL workspace is different from what we last set (i.e., user navigated directly to URL)
      // 4. We didn't just update the URL from the store (prevent loop)
      if (
        workspace &&
        currentWorkspace?.id !== activeWorkspaceId &&
        lastUrlWorkspaceIdRef.current !== activeWorkspaceId &&
        !justUpdatedUrlFromStoreRef.current
      ) {
        // This is a direct URL navigation, sync to store
        lastUrlWorkspaceIdRef.current = activeWorkspaceId;
        setCurrentWorkspace({
          id: workspace.id,
          title: workspace.title,
        });
      }
    }
  }, [
    isFirstSegmentWorkspaceId,
    workspaces,
    activeWorkspaceId,
    currentWorkspace?.id, // Use id instead of full object for comparison
    setCurrentWorkspace,
  ]);

  if (!activeWorkspaceId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-foreground/60">Carregando...</p>
      </div>
    );
  }

  return (
    <WorkspaceView
      workspaceId={activeWorkspaceId}
      pathSegments={folderPathSegments}
    />
  );
}
