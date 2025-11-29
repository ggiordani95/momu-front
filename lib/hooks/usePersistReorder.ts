import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

interface UsePersistReorderProps {
  workspaceId: string;
  updateItemOrderMutation: UseMutationResult<
    void,
    Error,
    { itemId: string; orderIndex: number; parentId: string | null },
    unknown
  >;
  updates: Array<{
    itemId: string;
    orderIndex: number;
  }>;
  currentFolderId: string | null;
}

/**
 * Função utilitária para persistir a reordenação no backend
 */
export async function persistReorder({
  workspaceId,
  updateItemOrderMutation,
  updates,
  currentFolderId,
}: UsePersistReorderProps) {
  if (!workspaceId || !updateItemOrderMutation) {
    return;
  }

  try {
    await Promise.all(
      updates.map((update) =>
        updateItemOrderMutation.mutateAsync({
          itemId: update.itemId,
          orderIndex: update.orderIndex,
          parentId: currentFolderId || null,
        })
      )
    );
  } catch (error) {
    console.error("Error updating item order:", error);
    toast.error("Não foi possível reordenar os itens. Tente novamente.");
    throw error;
  }
}

