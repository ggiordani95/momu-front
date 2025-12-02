"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";

export default function WorkspacePathPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.workspaceId as string;
  const path = params?.path as string[] | undefined;
  const { setCurrentWorkspace, workspaces } = useWorkspaceStore();

  // Redirect old workspace routes with paths to /explorer with path
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

      // Build new path for explorer
      const pathSegments = Array.isArray(path) ? path : path ? [path] : [];
      const newPath =
        pathSegments.length > 0
          ? `/explorer/${pathSegments.join("/")}`
          : "/explorer";

      router.replace(newPath);
    } else {
      router.replace("/");
    }
  }, [workspaceId, path, router, setCurrentWorkspace, workspaces]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-foreground/60">Redirecionando...</p>
    </div>
  );
}
