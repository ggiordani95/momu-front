"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";

export default function ExplorerPage() {
  const router = useRouter();
  const { workspaces } = useWorkspaceData();
  const { selectedWorkspaceId, setCurrentView } = useWorkspaceStore();

  useEffect(() => {
    // Initialize view to explorer on mount
    setCurrentView("explorer");

    if (workspaces.length > 0) {
      // Initialize selectedWorkspaceId if not set
      const activeWorkspaceId = selectedWorkspaceId || workspaces[0].id;

      if (!selectedWorkspaceId) {
        const { setSelectedWorkspaceId } = useWorkspaceStore.getState();
        setSelectedWorkspaceId(activeWorkspaceId);
      }

      // Redirect to /explorer/{workspaceId} to include workspaceId in URL
      router.replace(`/explorer/${activeWorkspaceId}`, { scroll: false });
    }
  }, [workspaces, selectedWorkspaceId, setCurrentView, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-foreground/60">Carregando...</p>
    </div>
  );
}
