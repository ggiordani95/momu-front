import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

interface UsePersistReorderProps {
  workspaceId: string;
  updateFileOrderMutation: UseMutationResult<
    void,
    Error,
    { fileId: string; orderIndex: number; parentId: string | null },
    unknown
  >;
  updates: Array<{
    fileId: string;
    orderIndex: number;
  }>;
  currentFileId: string | null;
}

/**
 * Função utilitária para persistir a reordenação no backend
 */
export async function persistReorder({
  workspaceId,
  updateFileOrderMutation,
  updates,
  currentFileId,
}: UsePersistReorderProps) {
  if (!workspaceId || !updateFileOrderMutation) {
    return;
  }

  try {
    await Promise.all(
      updates.map((update) =>
        updateFileOrderMutation.mutateAsync({
          fileId: update.fileId,
          orderIndex: update.orderIndex,
          parentId: currentFileId || null,
        })
      )
    );
  } catch (error) {
    console.error("Error updating item order:", error);
    toast.error("Não foi possível reordenar os itens. Tente novamente.");
    throw error;
  }
}
