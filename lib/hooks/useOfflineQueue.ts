/**
 * Hook para gerenciar fila de operações offline
 * Quando offline, salva operações em uma fila
 * Quando volta online, processa a fila automaticamente
 */

import { useEffect, useState, useCallback } from "react";
import { fileService } from "@/modules/files";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import type { CreateFileDto, UpdateFileDto } from "@/lib/types";

export type OfflineOperation =
  | {
      type: "CREATE";
      id: string; // temp ID
      workspaceId: string;
      data: CreateFileDto;
      timestamp: number;
    }
  | {
      type: "UPDATE";
      id: string;
      workspaceId: string;
      data: Partial<UpdateFileDto>;
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

const QUEUE_KEY = "offline_queue";

/**
 * Salvar operação na fila offline
 */
export function saveToOfflineQueue(operation: OfflineOperation): void {
  if (typeof window === "undefined") return;

  try {
    const queue = getOfflineQueue();
    queue.push(operation);
    // Manter apenas as últimas 100 operações para evitar overflow
    const limitedQueue = queue.slice(-100);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(limitedQueue));
    console.log(
      `💾 [OFFLINE] Saved operation to queue:`,
      operation.type,
      operation.id
    );
  } catch (error) {
    console.error("❌ [OFFLINE] Failed to save to queue:", error);
  }
}

/**
 * Obter fila de operações offline
 */
export function getOfflineQueue(): OfflineOperation[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("❌ [OFFLINE] Failed to read queue:", error);
    return [];
  }
}

/**
 * Limpar fila de operações offline
 */
export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(QUEUE_KEY);
    console.log("✅ [OFFLINE] Queue cleared");
  } catch (error) {
    console.error("❌ [OFFLINE] Failed to clear queue:", error);
  }
}

/**
 * Remover operação específica da fila
 */
export function removeFromOfflineQueue(operationId: string): void {
  if (typeof window === "undefined") return;

  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter((op) => op.id !== operationId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    console.log(`🗑️ [OFFLINE] Removed operation from queue:`, operationId);
  } catch (error) {
    console.error("❌ [OFFLINE] Failed to remove from queue:", error);
  }
}

/**
 * Hook para gerenciar sincronização offline
 */
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const { syncFiles } = useWorkspaceStore();

  // Detectar mudanças de status online/offline
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("🌐 [OFFLINE] Back online!");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("📴 [OFFLINE] Went offline");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /**
   * Processar fila de operações quando voltar online
   */
  const processQueue = useCallback(async () => {
    if (!isOnline || isProcessing) return;

    const queue = getOfflineQueue();
    if (queue.length === 0) {
      console.log("✅ [OFFLINE] Queue is empty");
      return;
    }

    console.log(`🔄 [OFFLINE] Processing ${queue.length} queued operations...`);
    setIsProcessing(true);

    try {
      // Processar operações em ordem
      for (const operation of queue) {
        try {
          if (operation.type === "CREATE") {
            await fileService.create(operation.workspaceId, operation.data);
            removeFromOfflineQueue(operation.id);
            console.log(`✅ [OFFLINE] Created:`, operation.id);
          } else if (operation.type === "UPDATE") {
            await fileService.update(operation.id, operation.data);
            removeFromOfflineQueue(operation.id);
            console.log(`✅ [OFFLINE] Updated:`, operation.id);
          } else if (operation.type === "DELETE") {
            await fileService.delete(operation.id);
            removeFromOfflineQueue(operation.id);
            console.log(`✅ [OFFLINE] Deleted:`, operation.id);
          } else if (operation.type === "UPDATE_ORDER") {
            await fileService.updateOrder(
              operation.id,
              operation.orderIndex,
              operation.parentId
            );
            removeFromOfflineQueue(operation.id);
            console.log(`✅ [OFFLINE] Updated order:`, operation.id);
          }
        } catch (error) {
          console.error(
            `❌ [OFFLINE] Failed to process operation:`,
            operation,
            error
          );
          // Continuar processando outras operações mesmo se uma falhar
        }
      }

      // Após processar todas as operações, sincronizar dados completos
      console.log("🔄 [OFFLINE] Syncing all data...");
      await syncFiles();

      console.log("✅ [OFFLINE] Queue processed successfully");
    } catch (error) {
      console.error("❌ [OFFLINE] Failed to process queue:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, isProcessing, syncFiles]);

  // Processar fila automaticamente quando voltar online
  useEffect(() => {
    if (isOnline && !isProcessing) {
      // Pequeno delay para garantir que a conexão está estável
      const timer = setTimeout(() => {
        processQueue();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, isProcessing, processQueue]);

  return {
    isOnline,
    isProcessing,
    queueLength: getOfflineQueue().length,
    processQueue,
  };
}
