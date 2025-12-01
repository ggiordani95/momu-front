"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.workspaceId as string;
  const { setSelectedWorkspaceId } = useWorkspaceStore();

  // Redirect old workspace routes to /explorer
  useEffect(() => {
    if (workspaceId) {
      // Set the workspace in Zustand store
      setSelectedWorkspaceId(workspaceId);
      // Redirect to explorer view
      router.replace("/explorer");
    } else {
      // If no workspaceId, redirect to home
      router.replace("/");
    }
  }, [workspaceId, router, setSelectedWorkspaceId]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-foreground/60">Redirecionando...</p>
    </div>
  );
}
