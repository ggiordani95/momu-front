import { useState, useRef } from "react";

/**
 * Hook para gerenciar o estado de drag and drop
 */
export function useDragState() {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);

  const resetDragState = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    draggedItemIdRef.current = null;
  };

  return {
    draggedItemId,
    setDraggedItemId,
    dragOverItemId,
    setDragOverItemId,
    draggedItemIdRef,
    resetDragState,
  };
}

