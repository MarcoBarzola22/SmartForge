import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncStatusBadge } from './SyncStatusBadge';

describe('TASK-76: SyncStatusBadge Component (RNF-03)', () => {
  it('should render "Sincronizado" when status is synced and online', () => {
    render(<SyncStatusBadge status="synced" isOnline={true} pendingCount={0} />);
    expect(screen.getByText(/Sincronizado/i)).toBeInTheDocument();
  });

  it('should render "Sin conexión" or "Modo Offline" when offline', () => {
    render(<SyncStatusBadge status="offline" isOnline={false} pendingCount={2} />);
    expect(screen.getByText(/Offline|Sin conexión/i)).toBeInTheDocument();
    expect(screen.getByText(/2/i)).toBeInTheDocument();
  });

  it('should render "Sincronizando..." with animated spinner when status is syncing', () => {
    render(<SyncStatusBadge status="syncing" isOnline={true} pendingCount={3} />);
    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument();
  });

  it('should render "Error de sincronización" and call onSync when clicked on error', () => {
    const handleSync = vi.fn();
    render(
      <SyncStatusBadge
        status="error"
        isOnline={true}
        pendingCount={1}
        onSync={handleSync}
      />
    );

    const badge = screen.getByRole('button');
    expect(badge).toBeInTheDocument();
    expect(screen.getByText(/Error|Reintentar/i)).toBeInTheDocument();

    fireEvent.click(badge);
    expect(handleSync).toHaveBeenCalledTimes(1);
  });
});
