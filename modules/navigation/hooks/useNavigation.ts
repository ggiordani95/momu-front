"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import type { ViewType } from "@/modules/workspace/stores/workspaceStore";
import { startTransition } from "react";

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { setCurrentView } = useWorkspaceStore();

  const navigate = useCallback(
    (view: ViewType, workspaceId?: string, additionalPath?: string[]) => {
      // Mark as internal navigation
      if (typeof window !== "undefined") {
        (
          window as Window & { __isInternalNavigation?: boolean }
        ).__isInternalNavigation = true;
      }

      setCurrentView(view);

      let newPath = `/${view}`;
      if (workspaceId) {
        newPath += `/${workspaceId}`;
        if (additionalPath && additionalPath.length > 0) {
          newPath += `/${additionalPath.join("/")}`;
        }
      }

      startTransition(() => {
        router.push(newPath, { scroll: false });
      });

      // Reset flag after navigation
      setTimeout(() => {
        if (typeof window !== "undefined") {
          (
            window as Window & { __isInternalNavigation?: boolean }
          ).__isInternalNavigation = false;
        }
      }, 100);
    },
    [router, setCurrentView]
  );

  const navigateToView = useCallback(
    (view: ViewType) => {
      const currentWorkspaceId = pathname?.split("/")[2];
      navigate(view, currentWorkspaceId);
    },
    [pathname, navigate]
  );

  const navigateToWorkspace = useCallback(
    (workspaceId: string, view?: ViewType) => {
      const targetView =
        view || (pathname?.split("/")[1] as ViewType) || "explorer";
      navigate(targetView, workspaceId);
    },
    [pathname, navigate]
  );

  return {
    navigate,
    navigateToView,
    navigateToWorkspace,
  };
}
