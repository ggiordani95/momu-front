import { useState, useRef, useCallback, useEffect } from "react";

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface UseMultiSelectOptions {
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function useMultiSelect(options?: UseMultiSelectOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  // Get bounding boxes for all file cards
  const getFileCardBounds = useCallback((fileId: string) => {
    if (!containerRef.current) return null;
    const element = containerRef.current.querySelector(
      `[data-file-id="${fileId}"]`
    ) as HTMLElement;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      left: rect.left - containerRect.left + containerRef.current.scrollLeft,
      top: rect.top - containerRect.top + containerRef.current.scrollTop,
      right: rect.right - containerRect.left + containerRef.current.scrollLeft,
      bottom: rect.bottom - containerRect.top + containerRef.current.scrollTop,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  // Check if two rectangles intersect
  const doRectsIntersect = useCallback(
    (
      rect1: { left: number; top: number; right: number; bottom: number },
      rect2: { left: number; top: number; right: number; bottom: number }
    ) => {
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );
    },
    []
  );

  // Handle mouse down - start selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start selection if clicking on empty space (not on a file card)
    const target = e.target as HTMLElement;
    if (target.closest("[data-file-id]")) {
      return; // Clicked on a file card, let it handle the click
    }

    // Check if Ctrl/Cmd is pressed for multi-select
    if (e.ctrlKey || e.metaKey) {
      return; // Let individual file clicks handle Ctrl+click
    }

    // Start selection box
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const startX =
        e.clientX - containerRect.left + containerRef.current.scrollLeft;
      const startY =
        e.clientY - containerRect.top + containerRef.current.scrollTop;

      startPointRef.current = { x: startX, y: startY };
      setIsSelecting(true);
      setSelectionBox({
        startX,
        startY,
        endX: startX,
        endY: startY,
      });

      // Clear selection if not holding Shift
      if (!e.shiftKey) {
        setSelectedIds(new Set());
      }
    }
  }, []);

  // Handle mouse move - update selection box
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !startPointRef.current || !containerRef.current)
        return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const endX =
        e.clientX - containerRect.left + containerRef.current.scrollLeft;
      const endY =
        e.clientY - containerRect.top + containerRef.current.scrollTop;

      setSelectionBox({
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        endX,
        endY,
      });

      // Find all file cards that intersect with selection box
      const selectionRect = {
        left: Math.min(startPointRef.current.x, endX),
        top: Math.min(startPointRef.current.y, endY),
        right: Math.max(startPointRef.current.x, endX),
        bottom: Math.max(startPointRef.current.y, endY),
      };

      const newSelectedIds = new Set<string>();
      const fileCards = containerRef.current.querySelectorAll("[data-file-id]");

      fileCards.forEach((card) => {
        const fileId = card.getAttribute("data-file-id");
        if (!fileId) return;

        const cardBounds = getFileCardBounds(fileId);
        if (cardBounds && doRectsIntersect(selectionRect, cardBounds)) {
          newSelectedIds.add(fileId);
        }
      });

      setSelectedIds(newSelectedIds);
    },
    [isSelecting, getFileCardBounds, doRectsIntersect]
  );

  // Handle mouse up - end selection
  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
      startPointRef.current = null;
    }
  }, [isSelecting]);

  // Handle file card click - toggle selection
  const handleFileClick = useCallback((fileId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }
        return newSet;
      });
    } else if (e.shiftKey) {
      // Range selection (if we have a last selected item)
      // For now, just add to selection
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(fileId);
        return newSet;
      });
    } else {
      // Single selection
      setSelectedIds(new Set([fileId]));
    }
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Notify parent of selection changes
  useEffect(() => {
    if (options?.onSelectionChange) {
      options.onSelectionChange(selectedIds);
    }
  }, [selectedIds, options]);

  return {
    selectedIds,
    isSelecting,
    selectionBox,
    containerRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleFileClick,
    clearSelection,
  };
}
