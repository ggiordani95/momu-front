"use client";

import { useEffect } from "react";
import { useSyncWorkspace } from "@/modules/workspace/hooks/useSyncWorkspaceFiles";

/**
 * Provider que sincroniza automaticamente os dados quando a aplicação carrega
 * Use este componente no layout principal para garantir que os dados estejam sempre sincronizados
 *
 * Nota: A sincronização já é feita automaticamente pelo useSyncWorkspaces hook,
 * então não precisamos chamar syncWorkspaces() novamente aqui
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { error } = useSyncWorkspace();

  useEffect(() => {
    if (error) {
      console.error("❌ Erro ao sincronizar:", error);
    }
  }, [error]);

  return <>{children}</>;
}
