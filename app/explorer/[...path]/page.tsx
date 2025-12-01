"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import WorkspaceView from "@/app/[workspaceId]/WorkspaceView";

export default function ExplorerPathPage() {
  const params = useParams();
  const { workspaces } = useWorkspaceData();
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceStore();
  const path = params?.path as string[] | undefined;

  // Parse path: first segment should be workspaceId, rest are folder/file IDs
  const pathSegments = Array.isArray(path) ? path : path ? [path] : [];

  // Check if first segment is a workspace ID
  const firstSegment = pathSegments[0];
  const isFirstSegmentWorkspaceId = workspaces.some(
    (w) => w.id === firstSegment
  );

  // Extract workspace ID and folder/file path
  const activeWorkspaceId = isFirstSegmentWorkspaceId
    ? firstSegment
    : selectedWorkspaceId || workspaces[0]?.id;

  const folderPathSegments = isFirstSegmentWorkspaceId
    ? pathSegments.slice(1)
    : pathSegments;

  useEffect(() => {
    if (workspaces.length > 0 && activeWorkspaceId) {
      // Set workspace ID if it's in the URL or if not set
      if (isFirstSegmentWorkspaceId) {
        setSelectedWorkspaceId(activeWorkspaceId);
      } else if (!selectedWorkspaceId) {
        setSelectedWorkspaceId(activeWorkspaceId);
      }
    }
  }, [
    workspaces,
    activeWorkspaceId,
    isFirstSegmentWorkspaceId,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
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
