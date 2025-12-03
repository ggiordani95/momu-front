"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceData } from "@/modules/workspace/hooks/useSyncWorkspaceFiles";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";

export default function ExplorerPage() {
  const router = useRouter();
  const { workspaces } = useWorkspaceData();
  const { currentWorkspace, setCurrentView } = useWorkspaceStore();

  useEffect(() => {
    // Initialize view to explorer on mount
    setCurrentView("explorer");

    if (workspaces.length > 0) {
      // Get active workspace ID
      const activeWorkspaceId = currentWorkspace?.id || workspaces[0].id;

      // Initialize currentWorkspace if not set
      if (!currentWorkspace) {
        const { setCurrentWorkspace } = useWorkspaceStore.getState();
        const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
        if (workspace) {
          setCurrentWorkspace({
            id: workspace.id,
            title: workspace.title,
          });
        }
      }

      // Redirect to /explorer/{workspaceId} to include workspaceId in URL
      router.replace(`/explorer/${activeWorkspaceId}`, { scroll: false });
    }
  }, [workspaces, currentWorkspace, setCurrentView, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-foreground/60">Carregando...</p>
    </div>
  );
}
