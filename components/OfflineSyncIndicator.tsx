"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getPendingOperationsStats } from "@/lib/services/offlineSync";

interface OfflineSyncIndicatorProps {
  onSyncClick?: () => void;
  isSyncing?: boolean;
  lastSyncResult?: {
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
  } | null;
}

export function OfflineSyncIndicator({
  onSyncClick,
  isSyncing = false,
  lastSyncResult,
}: OfflineSyncIndicatorProps) {
  const [stats, setStats] = useState(getPendingOperationsStats());
  const [isOnline, setIsOnline] = useState(true);

  // Atualizar stats periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getPendingOperationsStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state in next tick to avoid synchronous setState
    if (typeof navigator !== "undefined") {
      setTimeout(() => setIsOnline(navigator.onLine), 0);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (stats.total === 0 && !isSyncing && !lastSyncResult) {
    return null; // Não mostrar nada se não houver operações pendentes
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Sincronizando...</span>
            </>
          ) : !isOnline ? (
            <>
              <CloudOff className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Offline</span>
            </>
          ) : stats.total > 0 ? (
            <>
              <Cloud className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {stats.total} pendente{stats.total !== 1 ? "s" : ""}
              </span>
            </>
          ) : lastSyncResult?.success ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Sincronizado</span>
            </>
          ) : lastSyncResult ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Erro na sincronização</span>
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Online</span>
            </>
          )}
        </div>

        {stats.total > 0 && (
          <div className="text-xs text-muted-foreground mb-2 space-y-1">
            {stats.creates > 0 && <div>Criar: {stats.creates}</div>}
            {stats.updates > 0 && <div>Atualizar: {stats.updates}</div>}
            {stats.deletes > 0 && <div>Excluir: {stats.deletes}</div>}
            {stats.orderUpdates > 0 && (
              <div>Reordenar: {stats.orderUpdates}</div>
            )}
          </div>
        )}

        {lastSyncResult && (
          <div className="text-xs mb-2">
            {lastSyncResult.success ? (
              <div className="text-green-500">
                ✅ {lastSyncResult.synced} sincronizado
                {lastSyncResult.synced !== 1 ? "s" : ""}
              </div>
            ) : (
              <div className="text-red-500">
                ❌ {lastSyncResult.failed} falhou
                {lastSyncResult.failed !== 1 ? "ram" : ""}
              </div>
            )}
          </div>
        )}

        {onSyncClick && stats.total > 0 && isOnline && !isSyncing && (
          <button
            onClick={onSyncClick}
            className="w-full mt-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sincronizar Agora
          </button>
        )}
      </div>
    </div>
  );
}
