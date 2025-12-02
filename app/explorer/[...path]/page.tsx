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
  const {
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    currentWorkspace,
    setCurrentWorkspace,
    currentView,
  } = useWorkspaceStore();
  const path = params?.path as string[] | undefined;

  // Track previous workspace to detect changes
  const prevWorkspaceIdRef = useRef<string | undefined>(
    selectedWorkspaceId || currentWorkspace?.id
  );

  // Parse path: first segment should be workspaceId, rest are folder/file IDs
  const pathSegments = Array.isArray(path) ? path : path ? [path] : [];

  // Check if first segment is a workspace ID
  const firstSegment = pathSegments[0];
  const isFirstSegmentWorkspaceId = workspaces.some(
    (w) => w.id === firstSegment
  );

  // Extract workspace ID - prioritize URL workspaceId if present, otherwise use store
  // This ensures direct URL access (like /explorer/workspace-004/file-id) uses the URL workspace
  const activeWorkspaceId = useMemo(() => {
    // Priority 1: If URL contains a workspace ID as first segment, use it (direct URL access)
    if (isFirstSegmentWorkspaceId && firstSegment) {
      return firstSegment;
    }

    // Priority 2: Use store workspace (from selector or previous navigation)
    const storeWorkspaceId = selectedWorkspaceId || currentWorkspace?.id;
    if (storeWorkspaceId) {
      return storeWorkspaceId;
    }

    // Priority 3: Fallback to first available workspace
    return workspaces[0]?.id || null;
  }, [
    isFirstSegmentWorkspaceId,
    firstSegment,
    selectedWorkspaceId,
    currentWorkspace?.id,
    workspaces,
  ]);

  const folderPathSegments = isFirstSegmentWorkspaceId
    ? pathSegments.slice(1)
    : pathSegments;

  // Update URL when workspace changes in store (when selected via WorkspaceSelector)
  // Only update if URL doesn't already have a workspace ID (to preserve direct URL access)
  useEffect(() => {
    // Skip if URL already contains a workspace ID - URL takes priority
    if (isFirstSegmentWorkspaceId) {
      return;
    }

    const storeWorkspaceId = selectedWorkspaceId || currentWorkspace?.id;
    const workspaceChanged = prevWorkspaceIdRef.current !== storeWorkspaceId;

    if (workspaceChanged && storeWorkspaceId && pathname) {
      // Update URL silently using history API - no page reload, no flicker
      const view = currentView || pathname.split("/")[1] || "explorer";
      const newPath = `/${view}/${storeWorkspaceId}`;

      // Use requestAnimationFrame to ensure it happens after React's render
      // This prevents flicker by updating URL asynchronously
      requestAnimationFrame(() => {
        window.history.replaceState(
          { ...window.history.state, workspaceId: storeWorkspaceId },
          "",
          newPath
        );
      });

      prevWorkspaceIdRef.current = storeWorkspaceId;
    } else if (!prevWorkspaceIdRef.current && storeWorkspaceId) {
      prevWorkspaceIdRef.current = storeWorkspaceId;
    }
  }, [
    selectedWorkspaceId,
    currentWorkspace?.id,
    pathname,
    currentView,
    isFirstSegmentWorkspaceId,
  ]);

  // Sync workspace from URL to store when URL contains a workspace ID
  // This ensures the store reflects the URL workspace (for direct URL access)
  useEffect(() => {
    // If URL contains a workspace ID, sync it to the store
    if (
      isFirstSegmentWorkspaceId &&
      workspaces.length > 0 &&
      activeWorkspaceId
    ) {
      const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
      const storeWorkspaceId = selectedWorkspaceId || currentWorkspace?.id;

      // Update store to match URL workspace
      if (workspace && storeWorkspaceId !== activeWorkspaceId) {
        setSelectedWorkspaceId(activeWorkspaceId);
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
    selectedWorkspaceId,
    currentWorkspace,
    setSelectedWorkspaceId,
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
