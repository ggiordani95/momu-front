import type { UseMutationResult } from "@tanstack/react-query";
import { useDragState } from "./useDragState";
import { useDragHandlers } from "./useDragHandlers";
import { useItemReorder } from "./useItemReorder";
import { applyOptimisticUpdate } from "./useOptimisticUpdate";
import { persistReorder } from "./usePersistReorder";
import { useUpdateItemOrder } from "../services/useFilesQuery";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { buildHierarchy } from "../utils/hierarchy";
import { findItemById } from "../utils/hierarchy";

interface UseDragAndDropProps {
  workspaceId: string;
  currentFolderId?: string | null;
}

/**
 * Hook principal para drag and drop - orquestra os hooks menores
 * Agora recebe apenas workspaceId e currentFolderId, calculando o resto internamente
 */
export function useDragAndDrop({
  workspaceId,
  currentFolderId = null,
}: UseDragAndDropProps) {
  // Obter files do Zustand store
  const { getFilesByWorkspace } = useWorkspaceStore();
  const workspaceFiles = getFilesByWorkspace(workspaceId);
  const items = buildHierarchy(workspaceFiles);

  // Criar mutation dentro do hook
  const updateItemOrderMutation = useUpdateItemOrder(workspaceId || "");

  // Calcular sortedFolders e sortedFiles
  const currentFolder = currentFolderId
    ? findItemById(items, currentFolderId)
    : null;

  const displayItems = currentFolder
    ? currentFolder.children || []
    : items.filter((item) => !item.parent_id);

  // Sort ALL items together by order_index (folders and files mixed)
  const sortedItems = [...displayItems].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  // Estado de drag
  const dragState = useDragState();

  // Handlers básicos
  const handlers = useDragHandlers({
    draggedItemIdRef: dragState.draggedItemIdRef,
    setDraggedItemId: dragState.setDraggedItemId,
    setDragOverItemId: dragState.setDragOverItemId,
    resetDragState: dragState.resetDragState,
  });

  // Lógica de reordenação
  const { calculateReorder } = useItemReorder({
    items,
    sortedItems,
    draggedItemIdRef: dragState.draggedItemIdRef,
    workspaceId,
  });

  // Handler de drop que combina tudo
  const handleDrop = async (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const reorderResult = calculateReorder(targetItemId);
    if (!reorderResult) {
      dragState.resetDragState();
      return;
    }

    const { reorderedItems, updates } = reorderResult;

    // Atualização otimista
    applyOptimisticUpdate({
      items,
      itemsContext: null, // Zustand handles state updates
      currentFolderId: currentFolderId || null,
      reorderedItems,
    });

    // Persistir no backend
    try {
      await persistReorder({
        workspaceId,
        updateItemOrderMutation:
          updateItemOrderMutation as unknown as UseMutationResult<
            void,
            Error,
            { itemId: string; orderIndex: number; parentId: string | null },
            unknown
          >,
        updates,
        currentFolderId: currentFolderId || null,
      });
    } catch {
      // O erro já foi tratado em persistReorder (toast)
      // A query vai refetch automaticamente
    }

    dragState.resetDragState();
  };

  return {
    handleDragStart: handlers.handleDragStart,
    handleDragOver: handlers.handleDragOver,
    handleDragLeave: handlers.handleDragLeave,
    handleDrop,
    handleDragEnd: handlers.handleDragEnd,
    draggedItemId: dragState.draggedItemId,
    dragOverItemId: dragState.dragOverItemId,
  };
}
