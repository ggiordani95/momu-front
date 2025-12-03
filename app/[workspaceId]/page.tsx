"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.workspaceId as string;
  const { setCurrentWorkspace, workspaces } = useWorkspaceStore();

  // Redirect old workspace routes to /explorer
  useEffect(() => {
    if (workspaceId) {
      // Set the workspace in Zustand store
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace({
          id: workspace.id,
          title: workspace.title,
        });
      } else {
        // Workspace not found yet, just set by ID and it will be resolved later
        setCurrentWorkspace(workspaceId);
      }
      // Redirect to explorer view
      router.replace("/explorer");
    } else {
      // If no workspaceId, redirect to home
      router.replace("/");
    }
  }, [workspaceId, router, setCurrentWorkspace, workspaces]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-foreground/60">Redirecionando...</p>
    </div>
  );
}
