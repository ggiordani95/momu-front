import { useState, useRef } from "react";

/**
 * Hook para gerenciar o estado de drag and drop
 */
export function useDragState() {
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFileId, setDragOverFileId] = useState<string | null>(null);
  const draggedFileIdRef = useRef<string | null>(null);

  const resetDragState = () => {
    setDraggedFileId(null);
    setDragOverFileId(null);
    draggedFileIdRef.current = null;
  };

  return {
    draggedFileId,
    setDraggedFileId,
    dragOverFileId,
    setDragOverFileId,
    draggedFileIdRef,
    resetDragState,
  };
}
