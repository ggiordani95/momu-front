import type { UseMutationResult } from "@tanstack/react-query";
import { useDragState } from "./useDragState";
import { useDragHandlers } from "./useDragHandlers";
import { useItemReorder } from "./useItemReorder";
import { applyOptimisticUpdate } from "./useOptimisticUpdate";
import { persistReorder } from "./usePersistReorder";
import { useUpdateFileOrder } from "../services/useFilesQuery";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { buildHierarchy } from "../utils/hierarchy";
import { findFileById } from "../utils/hierarchy";

interface UseDragAndDropProps {
  workspaceId: string;
  currentFileId?: string | null;
}

/**
 * Hook principal para drag and drop - orquestra os hooks menores
 * Agora recebe apenas workspaceId e currentFileId, calculando o resto internamente
 */
export function useDragAndDrop({
  workspaceId,
  currentFileId = null,
}: UseDragAndDropProps) {
  // Obter files do Zustand store
  const { getFilesByWorkspace } = useWorkspaceStore();
  const workspaceFiles = getFilesByWorkspace(workspaceId);
  const files = buildHierarchy(workspaceFiles);

  // Criar mutation dentro do hook
  const updateFileOrderMutation = useUpdateFileOrder(workspaceId || "");

  // Calcular sortedFolders e sortedFiles
  const currentFile = currentFileId ? findFileById(files, currentFileId) : null;

  const displayFiles = currentFile
    ? currentFile.children || []
    : files.filter((file) => !file.parent_id);

  // Sort ALL items together by order_index (folders and files mixed)
  const sortedFiles = [...displayFiles].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  // Estado de drag
  const dragState = useDragState();

  // Handlers básicos
  const handlers = useDragHandlers({
    draggedFileIdRef: dragState.draggedFileIdRef,
    setDraggedFileId: dragState.setDraggedFileId,
    setDragOverFileId: dragState.setDragOverFileId,
    resetDragState: dragState.resetDragState,
  });

  // Lógica de reordenação
  const { calculateReorder } = useItemReorder({
    files,
    sortedFiles,
    draggedFileIdRef: dragState.draggedFileIdRef,
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

    const { reorderedFiles, updates } = reorderResult;

    // Atualização otimista
    applyOptimisticUpdate({
      files,
      filesContext: null, // Zustand handles state updates
      currentFileId: currentFileId || null,
      reorderedFiles,
    });

    // Persistir no backend
    try {
      await persistReorder({
        workspaceId,
        updateFileOrderMutation:
          updateFileOrderMutation as unknown as UseMutationResult<
            void,
            Error,
            { fileId: string; orderIndex: number; parentId: string | null },
            unknown
          >,
        updates,
        currentFileId: currentFileId || null,
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
    draggedFileId: dragState.draggedFileId,
    dragOverFileId: dragState.dragOverFileId,
  };
}
