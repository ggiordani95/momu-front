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

  useEffect(() => {
    if (workspaces.length > 0) {
      // Initialize selectedWorkspaceId if not set
      if (!selectedWorkspaceId) {
        setSelectedWorkspaceId(workspaces[0].id);
      }
    }
  }, [workspaces, selectedWorkspaceId, setSelectedWorkspaceId]);

  // Get active workspace from store
  const activeWorkspaceId = selectedWorkspaceId || workspaces[0]?.id;

  if (!activeWorkspaceId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-foreground/60">Carregando...</p>
      </div>
    );
  }

  const pathSegments = Array.isArray(path) ? path : path ? [path] : [];

  return (
    <WorkspaceView
      workspaceId={activeWorkspaceId}
      pathSegments={pathSegments}
    />
  );
}
