"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import WorkspaceView from "./WorkspaceView";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.workspaceId as string;

  // If no workspaceId, redirect to home
  useEffect(() => {
    if (!workspaceId) {
      router.push("/");
    }
  }, [workspaceId, router]);

  if (!workspaceId) {
    return null;
  }

  // Show workspace root (no folder selected)
  return <WorkspaceView workspaceId={workspaceId} pathSegments={[]} />;
}
