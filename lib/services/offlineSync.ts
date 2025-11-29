/**
 * Offline Sync Service
 *
 * Gerencia sincronização offline usando localStorage:
 * - Salva operações pendentes localmente
 * - Sincroniza em batch ao carregar a aplicação
 * - Reduz chamadas ao backend
 */

export type PendingOperation =
  | {
      type: "CREATE";
      id: string; // temp ID
      workspaceId: string;
      data: {
        type: string;
        title: string;
        content?: string;
        youtube_url?: string;
        parent_id?: string | null;
        order_index?: number;
      };
      timestamp: number;
    }
  | {
      type: "UPDATE";
      id: string;
      workspaceId: string;
      field: "title" | "content";
      value: string;
      timestamp: number;
    }
  | {
      type: "DELETE";
      id: string;
      workspaceId: string;
      timestamp: number;
    }
  | {
      type: "UPDATE_ORDER";
      id: string;
      workspaceId: string;
      orderIndex: number;
      parentId?: string | null;
      timestamp: number;
    };

const STORAGE_KEY = "momu_pending_operations";
const STORAGE_VERSION = "1.0";

interface StoredOperations {
  version: string;
  operations: PendingOperation[];
  lastSync: number | null;
}

/**
 * Salva uma operação pendente no localStorage
 */
export function savePendingOperation(operation: PendingOperation): void {
  if (typeof window === "undefined") return;

  try {
    const stored = getStoredOperations();
    stored.operations.push(operation);
    // Manter apenas as últimas 1000 operações para evitar overflow
    if (stored.operations.length > 1000) {
      stored.operations = stored.operations.slice(-1000);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    console.log("💾 Saved pending operation:", operation.type, operation.id);
  } catch (error) {
    console.error("❌ Error saving pending operation:", error);
  }
}

/**
 * Remove uma operação pendente do localStorage
 */
export function removePendingOperation(operationId: string): void {
  if (typeof window === "undefined") return;

  try {
    const stored = getStoredOperations();
    stored.operations = stored.operations.filter(
      (op) => getOperationId(op) !== operationId
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    console.log("🗑️ Removed pending operation:", operationId);
  } catch (error) {
    console.error("❌ Error removing pending operation:", error);
  }
}

/**
 * Obtém todas as operações pendentes (opcionalmente filtradas por workspaceId)
 */
export function getPendingOperations(workspaceId?: string): PendingOperation[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = getStoredOperations();
    if (workspaceId) {
      return stored.operations.filter((op) => op.workspaceId === workspaceId);
    }
    return stored.operations;
  } catch (error) {
    console.error("❌ Error getting pending operations:", error);
    return [];
  }
}

/**
 * Limpa operações pendentes (opcionalmente filtradas por workspaceId)
 */
export function clearPendingOperations(workspaceId?: string): void {
  if (typeof window === "undefined") return;

  try {
    const stored = getStoredOperations();
    if (workspaceId) {
      // Remove apenas operações do workspace específico
      stored.operations = stored.operations.filter(
        (op) => op.workspaceId !== workspaceId
      );
      console.log(
        `🧹 Cleared pending operations for workspace: ${workspaceId}`
      );
    } else {
      // Remove todas as operações
      stored.operations = [];
      console.log("🧹 Cleared all pending operations");
    }
    stored.lastSync = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("❌ Error clearing pending operations:", error);
  }
}

/**
 * Obtém operações armazenadas do localStorage
 */
function getStoredOperations(): StoredOperations {
  if (typeof window === "undefined") {
    return {
      version: STORAGE_VERSION,
      operations: [],
      lastSync: null,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        version: STORAGE_VERSION,
        operations: [],
        lastSync: null,
      };
    }

    const parsed = JSON.parse(stored) as StoredOperations;
    // Migração de versão se necessário
    if (parsed.version !== STORAGE_VERSION) {
      return {
        version: STORAGE_VERSION,
        operations: [],
        lastSync: null,
      };
    }

    return parsed;
  } catch (error) {
    console.error("❌ Error parsing stored operations:", error);
    return {
      version: STORAGE_VERSION,
      operations: [],
      lastSync: null,
    };
  }
}

/**
 * Obtém um ID único para uma operação
 */
function getOperationId(operation: PendingOperation): string {
  if (operation.type === "CREATE") {
    return operation.id;
  }
  return `${operation.type}-${operation.id}-${operation.timestamp}`;
}

/**
 * Agrupa operações por tipo para processamento em batch
 */
export function groupOperationsByType(operations: PendingOperation[]): {
  creates: Extract<PendingOperation, { type: "CREATE" }>[];
  updates: Extract<PendingOperation, { type: "UPDATE" }>[];
  deletes: Extract<PendingOperation, { type: "DELETE" }>[];
  orderUpdates: Extract<PendingOperation, { type: "UPDATE_ORDER" }>[];
} {
  return {
    creates: operations.filter(
      (op): op is Extract<PendingOperation, { type: "CREATE" }> =>
        op.type === "CREATE"
    ),
    updates: operations.filter(
      (op): op is Extract<PendingOperation, { type: "UPDATE" }> =>
        op.type === "UPDATE"
    ),
    deletes: operations.filter(
      (op): op is Extract<PendingOperation, { type: "DELETE" }> =>
        op.type === "DELETE"
    ),
    orderUpdates: operations.filter(
      (op): op is Extract<PendingOperation, { type: "UPDATE_ORDER" }> =>
        op.type === "UPDATE_ORDER"
    ),
  };
}

/**
 * Obtém estatísticas das operações pendentes
 */
export function getPendingOperationsStats(): {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
  orderUpdates: number;
} {
  const operations = getPendingOperations();
  const grouped = groupOperationsByType(operations);
  return {
    total: operations.length,
    creates: grouped.creates.length,
    updates: grouped.updates.length,
    deletes: grouped.deletes.length,
    orderUpdates: grouped.orderUpdates.length,
  };
}
