import React from 'react';
import { CheckCircle2, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { SyncStatus } from '../../hooks/useOfflineSync';

export interface SyncStatusBadgeProps {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount?: number;
  onSync?: () => void;
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  isOnline,
  pendingCount = 0,
  onSync,
  className = ''
}) => {
  // Offline State
  if (!isOnline || status === 'offline') {
    return (
      <button
        type="button"
        onClick={onSync}
        disabled={!isOnline}
        aria-label="Estado de conexión offline"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800/90 text-amber-400 border border-amber-500/40 shadow-sm ${className}`}
      >
        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Modo Offline</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 text-[10px] rounded-full font-bold">
            {pendingCount}
          </span>
        )}
      </button>
    );
  }

  // Syncing State
  if (status === 'syncing') {
    return (
      <div
        aria-label="Sincronizando datos"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-600/40 shadow-sm ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
        <span>Sincronizando...</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 text-[10px] rounded-full font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onSync}
        aria-label="Error de sincronización, haz clic para reintentar"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-600/50 hover:bg-rose-900/80 transition-colors shadow-sm cursor-pointer ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Error de sincronización</span>
        {pendingCount > 0 && (
          <span className="bg-rose-500/30 text-rose-200 px-1.5 py-0.2 text-[10px] rounded-full font-bold">
            {pendingCount}
          </span>
        )}
      </button>
    );
  }

  // Synced State (Default Online)
  return (
    <button
      type="button"
      onClick={onSync}
      disabled={pendingCount === 0}
      aria-label="Datos sincronizados con la nube y en línea"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-600/40 shadow-sm ${
        pendingCount > 0 ? 'cursor-pointer hover:bg-emerald-900/70' : 'cursor-default'
      } ${className}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span>En línea · Sincronizado</span>
      {pendingCount > 0 && (
        <span className="bg-emerald-500/20 text-emerald-200 px-1.5 py-0.2 text-[10px] rounded-full font-bold">
          {pendingCount}
        </span>
      )}
    </button>
  );
};
