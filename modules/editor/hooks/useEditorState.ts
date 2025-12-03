"use client";

import { useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";

export type EditorMode = "view" | "edit" | null;

export function useEditorState() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Extract mode from URL
  const mode = useMemo<EditorMode>(() => {
    if (pathname?.includes("/view")) return "view";
    if (pathname?.includes("/edit")) return "edit";
    return null;
  }, [pathname]);

  const openEditor = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    mode,
    isOpen,
    openEditor,
    closeEditor,
  };
}
