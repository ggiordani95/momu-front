"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceData } from "@/lib/hooks/useSyncFiles";

export default function Home() {
  const router = useRouter();
  const { workspaces } = useWorkspaceData();

  useEffect(() => {
    if (workspaces.length > 0) {
      // Redirect to explorer view (workspace managed by Zustand)
      router.push("/explorer");
    }
  }, [workspaces, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-foreground/60">Carregando...</p>
    </div>
  );
}
