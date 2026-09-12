import React from 'react';
import { SyncStatusBadge } from '../common/SyncStatusBadge';
import { SyncStatus } from '../../hooks/useOfflineSync';

export interface StatusBarProps {
  title?: string;
  subtitle?: string;
  isOnline?: boolean;
  syncStatus?: SyncStatus;
  pendingCount?: number;
  onSync?: () => void;
  rightAction?: React.ReactNode;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  title = 'SmartForge',
  subtitle,
  isOnline = true,
  syncStatus,
  pendingCount = 0,
  onSync,
  rightAction
}) => {
  const currentStatus: SyncStatus = syncStatus ?? (isOnline ? 'synced' : 'offline');

  return (
    <header
      data-testid="status-bar"
      className="w-full bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 sticky top-0 z-40 flex items-center justify-between"
    >
      <div className="flex flex-col">
        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <span className="text-xs text-zinc-400 font-medium">{subtitle}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SyncStatusBadge
          status={currentStatus}
          isOnline={isOnline}
          pendingCount={pendingCount}
          onSync={onSync}
        />

        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
};

export default StatusBar;
