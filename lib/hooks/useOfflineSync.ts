/**
 * Hook para sincronização offline
 *
 * Sincroniza operações pendentes do localStorage com o backend em uma única requisição
 */

import { useEffect, useState, useCallback } from "react";
import {
  getPendingOperations,
  clearPendingOperations,
} from "@/lib/services/offlineSync";
import { fileService } from "@/modules/files";

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  /**
   * Sincroniza todas as operações pendentes com o backend em uma única requisição
   * Executado silenciosamente em background
   */
  const syncPendingOperations = useCallback(async (): Promise<void> => {
    // Evitar múltiplas chamadas simultâneas
    if (isSyncing) {
      console.log(
        "⏭️ Sync offline já em andamento, ignorando chamada duplicada"
      );
      return;
    }

    setIsSyncing(true);

    try {
      // Get all pending operations for all workspaces
      const operations = getPendingOperations(); // Get all operations, not filtered by workspace
      if (operations.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(
        `🔄 Syncing ${operations.length} operations for all workspaces`
      );

      // Enviar todas as operações em uma única requisição JSON
      const syncResult = await fileService.syncBatch(operations);

      console.log(
        `✅ Sync result: ${syncResult.synced} synced, ${syncResult.failed} failed`
      );

      // Se todas foram bem-sucedidas, limpar o localStorage
      if (syncResult.success && syncResult.failed === 0) {
        clearPendingOperations(); // Clear all operations
        // Trigger sync-files to refresh all data (apenas se não estiver já sincronizando)
        const { useWorkspaceStore } = await import(
          "@/modules/workspace/stores/workspaceStore"
        );
        const storeState = useWorkspaceStore.getState();
        if (!storeState.isSyncing) {
          storeState.syncFiles();
        }
        setHasSynced(true);
      } else if (syncResult.synced > 0) {
        // Se algumas foram bem-sucedidas mas algumas falharam
        // Limpar apenas as que foram sincronizadas com sucesso
        clearPendingOperations(); // Clear all for now
        // Trigger sync-files to refresh all data (apenas se não estiver já sincronizando)
        const { useWorkspaceStore } = await import(
          "@/modules/workspace/stores/workspaceStore"
        );
        const storeState = useWorkspaceStore.getState();
        if (!storeState.isSyncing) {
          storeState.syncFiles();
        }
        setHasSynced(true);
      }

      // Se houve sucesso e ainda há operações pendentes (novas alterações durante a sincronização),
      // sincronizar novamente após um delay
      if (syncResult.success) {
        const remainingOps = getPendingOperations();
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
  }, [isSyncing]); // Remover workspaceId e queryClient para evitar múltiplas chamadas

  /**
   * Sincroniza automaticamente ao montar o componente
   * Executa apenas UMA VEZ quando há operações pendentes
   * Não deve executar novamente ao mudar de workspace
   */
  useEffect(() => {
    // Sincronizar apenas uma vez, independente do workspace
    // As operações são globais (de todos os workspaces)
    if (!hasSynced && !isSyncing) {
      // Verificar se há operações pendentes (de todos os workspaces)
      const operations = getPendingOperations();
      if (operations.length === 0) {
        // Não há operações pendentes, considerar sync concluído
        setHasSynced(true);
      } else {
        // Executar sync imediatamente, sem delay
        syncPendingOperations();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar

  return {
    isSyncing,
    hasSynced,
  };
}
