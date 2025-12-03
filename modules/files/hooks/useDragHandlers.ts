import type React from "react";

interface UseDragHandlersProps {
  draggedFileIdRef: React.RefObject<string | null>;
  setDraggedFileId: (fileId: string | null) => void;
  setDragOverFileId: (fileId: string | null) => void;
  resetDragState: () => void;
}

/**
 * Hook para handlers básicos de drag and drop
 */
export function useDragHandlers({
  draggedFileIdRef,
  setDraggedFileId,
  setDragOverFileId,
  resetDragState,
}: UseDragHandlersProps) {
  const handleDragStart = (fileId: string) => {
    draggedFileIdRef.current = fileId;
    setDraggedFileId(fileId);
  };

  const handleDragOver = (e: React.DragEvent, targetFileId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedFileIdRef.current && draggedFileIdRef.current !== targetFileId) {
      setDragOverFileId(targetFileId);
    }
  };

  const handleDragLeave = () => {
    setDragOverFileId(null);
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
