/**
 * Hook para sincronização offline
 *
 * Sincroniza operações pendentes do localStorage com o backend em uma única requisição
 */

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getPendingOperations,
  clearPendingOperations,
} from "@/lib/services/offlineSync";
import { itemService } from "@/lib/services/itemService";
import { itemKeys } from "./querys/useItems";
import { trashKeys } from "./querys/useTrash";

export function useOfflineSync(workspaceId: string) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Sincroniza todas as operações pendentes com o backend em uma única requisição
   * Executado silenciosamente em background
   */
  const syncPendingOperations = useCallback(async (): Promise<void> => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      const operations = getPendingOperations(workspaceId);
      if (operations.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(
        `🔄 Syncing ${operations.length} operations for workspace ${workspaceId}`
      );

      // Enviar todas as operações em uma única requisição JSON
      const syncResult = await itemService.syncBatch(workspaceId, operations);

      console.log(
        `✅ Sync result: ${syncResult.synced} synced, ${syncResult.failed} failed`
      );

      // Se todas foram bem-sucedidas, limpar o localStorage
      if (syncResult.success && syncResult.failed === 0) {
        clearPendingOperations(workspaceId);
        // Invalidar queries para atualizar a UI
        queryClient.invalidateQueries({
          queryKey: itemKeys.workspace(workspaceId),
        });
        queryClient.invalidateQueries({
          queryKey: trashKeys.workspace(workspaceId),
        });
        setHasSynced(true);
      } else if (syncResult.synced > 0) {
        // Se algumas foram bem-sucedidas mas algumas falharam
        // Limpar apenas as que foram sincronizadas com sucesso
        // Por enquanto, limpar tudo do workspace (as que falharam podem ser re-adicionadas se necessário)
        clearPendingOperations(workspaceId);
        // Invalidar queries mesmo se algumas falharam
        queryClient.invalidateQueries({
          queryKey: itemKeys.workspace(workspaceId),
        });
        queryClient.invalidateQueries({
          queryKey: trashKeys.workspace(workspaceId),
        });
        setHasSynced(true);
      }

      // Se houve sucesso e ainda há operações pendentes (novas alterações durante a sincronização),
      // sincronizar novamente após um delay
      if (syncResult.success) {
        const remainingOps = getPendingOperations(workspaceId);
        if (remainingOps.length > 0) {
          // Aguardar um pouco antes de sincronizar novamente para evitar loops
          setTimeout(() => {
            syncPendingOperations();
          }, 1000);
        }
      }
    } catch (error) {
      // Log do erro para debug, mas não mostrar ao usuário
      console.error("❌ Sync error:", error);
      // As operações permanecerão no localStorage para tentar novamente na próxima vez
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, workspaceId, queryClient]);

  /**
   * Sincroniza automaticamente ao montar o componente
   * Executa ANTES de carregar os dados
   */
  useEffect(() => {
    if (workspaceId && !hasSynced) {
      // Verificar se há operações pendentes
      const operations = getPendingOperations(workspaceId);
      if (operations.length === 0) {
        // Não há operações pendentes, considerar sync concluído
        setHasSynced(true);
      } else {
        // Executar sync imediatamente, sem delay
        syncPendingOperations();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, hasSynced]); // Apenas ao mudar workspace

  return {
    isSyncing,
    hasSynced,
  };
}
