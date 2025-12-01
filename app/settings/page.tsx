"use client";

import { useEffect } from "react";
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import WorkspaceView from "../[workspaceId]/WorkspaceView";

export default function SettingsPage() {
  const { workspaces } = useWorkspaceData();
  const { selectedWorkspaceId, setCurrentView } = useWorkspaceStore();

  useEffect(() => {
    // Initialize view to settings on mount
    setCurrentView("settings");

    if (workspaces.length > 0) {
      // Initialize selectedWorkspaceId if not set
      if (!selectedWorkspaceId) {
        const { setSelectedWorkspaceId } = useWorkspaceStore.getState();
        setSelectedWorkspaceId(workspaces[0].id);
      }
    }
  }, [workspaces, selectedWorkspaceId, setCurrentView]);

  // Get active workspace from store
  const activeWorkspaceId = selectedWorkspaceId || workspaces[0]?.id;

  if (!activeWorkspaceId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-foreground/60">Carregando...</p>
      </div>
    );
  }

  return <WorkspaceView workspaceId={activeWorkspaceId} pathSegments={[]} />;
}
