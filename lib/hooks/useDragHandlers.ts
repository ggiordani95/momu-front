import type React from "react";

interface UseDragHandlersProps {
  draggedItemIdRef: React.RefObject<string | null>;
  setDraggedItemId: (itemId: string | null) => void;
  setDragOverItemId: (itemId: string | null) => void;
  resetDragState: () => void;
}

/**
 * Hook para handlers básicos de drag and drop
 */
export function useDragHandlers({
  draggedItemIdRef,
  setDraggedItemId,
  setDragOverItemId,
  resetDragState,
}: UseDragHandlersProps) {
  const handleDragStart = (itemId: string) => {
    draggedItemIdRef.current = itemId;
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItemIdRef.current && draggedItemIdRef.current !== targetItemId) {
      setDragOverItemId(targetItemId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
  };
}
