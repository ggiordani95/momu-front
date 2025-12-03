/**
 * Service para operações offline-first
 * Quando offline, salva na fila. Quando online, chama diretamente o backend.
 */

import { fileService } from "./fileService";
import {
  saveToOfflineQueue,
  getOfflineQueue,
} from "../../modules/files/hooks/useOfflineQueue";
import type { CreateFileDto, UpdateFileDto } from "@/lib/types";

/**
 * Verificar se está online
 */
function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

/**
 * Criar arquivo (offline-first)
 */
export async function createFileOfflineFirst(
  workspaceId: string,
  data: CreateFileDto
): Promise<{ id: string; isQueued: boolean }> {
  if (!isOnline()) {
    // Offline: salvar na fila
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    saveToOfflineQueue({
      type: "CREATE",
      id: tempId,
      workspaceId,
      data,
      timestamp: Date.now(),
    });
    return { id: tempId, isQueued: true };
  }

  // Online: chamar diretamente
  try {
    const created = await fileService.create(workspaceId, data);
    return { id: created.id, isQueued: false };
  } catch (error) {
    // Se falhar, salvar na fila como fallback
    console.warn("⚠️ [OFFLINE] Create failed, saving to queue:", error);
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    saveToOfflineQueue({
      type: "CREATE",
      id: tempId,
      workspaceId,
      data,
      timestamp: Date.now(),
    });
    return { id: tempId, isQueued: true };
  }
}

/**
 * Atualizar arquivo (offline-first)
 */
export async function updateFileOfflineFirst(
  fileId: string,
  workspaceId: string,
  data: Partial<UpdateFileDto>
): Promise<{ success: boolean; isQueued: boolean }> {
  if (!isOnline()) {
    // Offline: salvar na fila
    saveToOfflineQueue({
      type: "UPDATE",
      id: fileId,
      workspaceId,
      data,
      timestamp: Date.now(),
    });
    return { success: true, isQueued: true };
  }

  // Online: chamar diretamente
  try {
    await fileService.update(fileId, data);
    return { success: true, isQueued: false };
  } catch (error) {
    // Se falhar, salvar na fila como fallback
    console.warn("⚠️ [OFFLINE] Update failed, saving to queue:", error);
    saveToOfflineQueue({
      type: "UPDATE",
      id: fileId,
      workspaceId,
      data,
      timestamp: Date.now(),
    });
    return { success: true, isQueued: true };
  }
}

/**
 * Deletar arquivo (offline-first)
 */
export async function deleteFileOfflineFirst(
  fileId: string,
  workspaceId: string
): Promise<{ success: boolean; isQueued: boolean }> {
  if (!isOnline()) {
    // Offline: salvar na fila
    saveToOfflineQueue({
      type: "DELETE",
      id: fileId,
      workspaceId,
      timestamp: Date.now(),
    });
    return { success: true, isQueued: true };
  }

  // Online: chamar diretamente
  try {
    await fileService.delete(fileId);
    return { success: true, isQueued: false };
  } catch (error) {
    // Se falhar, salvar na fila como fallback
    console.warn("⚠️ [OFFLINE] Delete failed, saving to queue:", error);
    saveToOfflineQueue({
      type: "DELETE",
      id: fileId,
      workspaceId,
      timestamp: Date.now(),
    });
    return { success: true, isQueued: true };
  }
}

/**
 * Atualizar ordem (offline-first)
 */
export async function updateOrderOfflineFirst(
  fileId: string,
  workspaceId: string,
  orderIndex: number,
  parentId?: string | null
): Promise<{ success: boolean; isQueued: boolean }> {
  if (!isOnline()) {
    // Offline: salvar na fila
    saveToOfflineQueue({
      type: "UPDATE_ORDER",
      id: fileId,
      workspaceId,
      orderIndex,
      parentId,
      timestamp: Date.now(),
    });
    return { success: true, isQueued: true };
  }

  // Online: chamar diretamente
  try {
    await fileService.updateOrder(fileId, orderIndex, parentId);
    return { success: true, isQueued: false };
  } catch (error) {
    // Se falhar, salvar na fila como fallback
    console.warn("⚠️ [OFFLINE] Update order failed, saving to queue:", error);
    saveToOfflineQueue({
      type: "UPDATE_ORDER",
      id: fileId,
      workspaceId,
      orderIndex,
      parentId,
      timestamp: Date.now(),
    });
    return { success: true, isQueued: true };
  }
}

/**
 * Obter status da fila
 */
export function getQueueStatus() {
  const queue = getOfflineQueue();
  return {
    length: queue.length,
    hasPending: queue.length > 0,
    operations: queue,
  };
}
