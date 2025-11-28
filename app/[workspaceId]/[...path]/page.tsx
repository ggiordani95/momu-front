"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import WorkspaceView from "../WorkspaceView";

export default function WorkspacePathPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.workspaceId as string;
  const path = params?.path as string[] | undefined;

  // If no workspaceId, redirect to home
  useEffect(() => {
    if (!workspaceId) {
      router.push("/");
    }
  }, [workspaceId, router]);

  if (!workspaceId) {
    return null;
  }

  const pathSegments = Array.isArray(path) ? path : path ? [path] : [];

  return (
    <WorkspaceView workspaceId={workspaceId} pathSegments={pathSegments} />
  );
}
