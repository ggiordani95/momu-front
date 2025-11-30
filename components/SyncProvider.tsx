"use client";

import { useEffect } from "react";
import { useSyncFiles } from "@/lib/hooks/useSyncFiles";

/**
 * Provider que sincroniza automaticamente os dados quando a aplicação carrega
 * Use este componente no layout principal para garantir que os dados estejam sempre sincronizados
 *
 * Nota: A sincronização já é feita automaticamente pelo useSyncFiles hook,
 * então não precisamos chamar syncFiles() novamente aqui
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isSyncing, error } = useSyncFiles();

  // Log de sincronização (opcional, pode remover em produção)
  useEffect(() => {
    if (isSyncing) {
      console.log("🔄 Sincronizando workspaces e files...");
    }
  }, [isSyncing]);

  useEffect(() => {
    if (error) {
      console.error("❌ Erro ao sincronizar:", error);
    }
  }, [error]);

  return <>{children}</>;
}
