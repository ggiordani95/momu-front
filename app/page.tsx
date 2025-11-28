"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFolders } from "@/lib/hooks/useFolders";

export default function Home() {
  const router = useRouter();
  const { data: folders = [] } = useFolders();

  useEffect(() => {
    if (folders.length > 0) {
      // Redirect to first workspace
      const firstWorkspaceId = folders[0].id;
      router.push(`/${firstWorkspaceId}`);
    }
  }, [folders, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-foreground/60">Carregando...</p>
    </div>
  );
}
