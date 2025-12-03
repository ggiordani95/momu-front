import { useEffect } from "react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { useAuth } from "@/lib/contexts/AuthContext";

/**
 * Hook para sincronizar workspaces e files do usuário
 * Sincroniza automaticamente quando o componente monta e quando o userId muda
 */
export function useSyncWorkspace() {
  const { userId } = useAuth();
  const {
    syncFiles: syncStore,
    isSyncing,
    error,
    lastSyncAt,
  } = useWorkspaceStore();

  useEffect(() => {
    // Sincronizar apenas uma vez quando o userId está disponível
    // Não sincronizar novamente ao mudar de workspace ou remontar componentes
    if (userId && !isSyncing && !lastSyncAt) {
      // Sincronizar apenas se nunca foi sincronizado antes
      syncStore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Apenas quando userId muda (não quando componentes remontam)

  return {
    syncFiles: syncStore,
    isSyncing,
    error,
    lastSyncAt,
  };
}

/**
 * Hook para acessar dados do store
 */
export function useWorkspaceData() {
  const {
    workspaces,
    files,
    getFilesByWorkspace,
    getDeletedFilesByWorkspace,
    getFileById,
    getWorkspaceById,
    isLoading,
    error,
  } = useWorkspaceStore();

  return {
    workspaces,
    files,
    getFilesByWorkspace,
    getDeletedFilesByWorkspace,
    getFileById,
    getWorkspaceById,
    isLoading,
    error,
  };
}
