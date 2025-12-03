"use client";

import { WifiOff, Wifi, Loader2 } from "lucide-react";
import { useOfflineQueue } from "@/modules/files/hooks/useOfflineQueue";

/**
 * Indicador visual de status offline/online
 */
export function OfflineIndicator() {
  const { isOnline, isProcessing, queueLength } = useOfflineQueue();

  if (isOnline && queueLength === 0) {
    return null; // Não mostrar quando tudo está ok
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
          ${
            !isOnline
              ? "bg-yellow-500/90 text-yellow-900"
              : isProcessing
              ? "bg-blue-500/90 text-blue-900"
              : "bg-green-500/90 text-green-900"
          }
        `}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline</span>
            {queueLength > 0 && (
              <span className="text-xs">
                ({queueLength} pendente{queueLength > 1 ? "s" : ""})
              </span>
            )}
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Sincronizando...</span>
          </>
        ) : queueLength > 0 ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">
              {queueLength} operação{queueLength > 1 ? "ões" : ""} pendente
              {queueLength > 1 ? "s" : ""}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
