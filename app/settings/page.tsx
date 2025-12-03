"use client";

import { useEffect } from "react";
import { useWorkspaceData } from "@/modules/workspace/hooks/useSyncWorkspaceFiles";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import WorkspaceView from "@/modules/workspace/components/WorkspaceView";

export default function SettingsPage() {
  const { workspaces } = useWorkspaceData();
  const { currentWorkspace, setCurrentView } = useWorkspaceStore();

  useEffect(() => {
    // Initialize view to settings on mount
    setCurrentView("settings");

    if (workspaces.length > 0) {
      // Initialize currentWorkspace if not set
      if (!currentWorkspace) {
        const { setCurrentWorkspace } = useWorkspaceStore.getState();
        setCurrentWorkspace({
          id: workspaces[0].id,
          title: workspaces[0].title,
        });
      }
    }
  }, [workspaces, currentWorkspace, setCurrentView]);

  // Get active workspace from store
  const activeWorkspaceId = currentWorkspace?.id || workspaces[0]?.id;

  if (!activeWorkspaceId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-foreground/60">Carregando...</p>
      </div>
    );
  }

  return <WorkspaceView workspaceId={activeWorkspaceId} pathSegments={[]} />;
}
