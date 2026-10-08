import React, { useState, useEffect } from 'react';
import {
  History,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../../api/client';
import type { MesocycleHistoryItem } from '../../api/generated/types';
import { MesocycleHistoryCard } from '../../components/mesocycle/MesocycleHistoryCard';

export interface RoutineHistoryPageProps {
  onBack?: () => void;
  onSelectMesocycle?: (mesocycleId: string) => void;
  initialHistory?: MesocycleHistoryItem[];
  className?: string;
}

type StatusFilter = 'all' | 'completed' | 'deload_skipped' | 'cancelled';

export const RoutineHistoryPage: React.FC<RoutineHistoryPageProps> = ({
  onBack,
  onSelectMesocycle,
  initialHistory,
  className = ''
}) => {
  const [history, setHistory] = useState<MesocycleHistoryItem[]>(initialHistory ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.mesocycles.getHistory();
      setHistory(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el historial de mesociclos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialHistory) {
      fetchHistory();
    } else {
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  // Orden cronológico inverso (el más reciente primero)
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = a.startDate || '';
    const dateB = b.startDate || '';
    return dateB.localeCompare(dateA);
  });

  // Filtrado por estado
  const filteredHistory = sortedHistory.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'completed') {
      return item.status === 'completed' || item.status === 'deload_skipped';
    }
    return item.status === activeFilter;
  });

  return (
    <div
      data-testid="routine-history-container"
      className={`w-full max-w-[390px] mx-auto flex flex-col gap-4 pb-8 overflow-x-hidden text-content ${className}`}
    >
      {/* Top Header */}
      <header className="flex items-center gap-3 pt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="press touch-target min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-surface-1 border border-line text-content-2 hover:text-content hover:bg-surface-2 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber shrink-0" />
            <h1 className="text-lg font-extrabold text-content tracking-tight truncate">
              Historial de Mesociclos
            </h1>
          </div>
          <span className="text-xs text-content-3 font-medium truncate">
            Evolución y registro histórico de cargas
          </span>
        </div>
      </header>

      {/* Filter Tabs (Constitución Art. 2: Touch targets >= 48px) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`press touch-target min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all ${
            activeFilter === 'all'
              ? 'bg-amber text-ink border-amber shadow-lg shadow-amber/30'
              : 'bg-surface-1 text-content-2 border border-line hover:border-line/80'
          }`}
        >
          Todos ({history.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('completed')}
          className={`press touch-target min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-1.5 ${
            activeFilter === 'completed'
              ? 'bg-emerald-500 text-ink border-emerald-400 shadow-lg shadow-emerald-500/30'
              : 'bg-surface-1 text-content-2 border border-line hover:border-line/80'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Completados</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('cancelled')}
          className={`press touch-target min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-1.5 ${
            activeFilter === 'cancelled'
              ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30'
              : 'bg-surface-1 text-content-2 border border-line hover:border-line/80'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span>Cancelados</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-fatigue/15 border border-fatigue/30 text-fatigue-text text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-fatigue-text shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton state */}
      {isLoading ? (
        <div
          data-testid="history-loading-state"
          className="flex flex-col gap-3 animate-pulse"
        >
          <div className="h-32 bg-surface-1 rounded-2xl border border-line" />
          <div className="h-32 bg-surface-1 rounded-2xl border border-line" />
          <div className="h-32 bg-surface-1 rounded-2xl border border-line" />
        </div>
      ) : filteredHistory.length === 0 ? (
        /* Empty state */
        <div
          data-testid="history-empty-state"
          className="w-full p-8 rounded-2xl bg-surface-1 border border-line flex flex-col items-center text-center gap-3 shadow-lg shadow-brand/5"
        >
          <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-content-3">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-content">
              Sin mesociclos en el historial
            </h3>
            <p className="text-xs text-content-2 mt-1 max-w-xs leading-relaxed">
              {activeFilter === 'all'
                ? 'Aún no has completado ni cancelado ningún mesociclo. Tus ciclos finalizados aparecerán aquí.'
                : 'No hay mesociclos registrados para este filtro.'}
            </p>
          </div>
        </div>
      ) : (
        /* Stacked Vertical Cards List (RF-06, Constitución Art. 2) */
        <div
          data-testid="history-list"
          className="flex flex-col gap-3.5 w-full"
        >
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectMesocycle?.(item.id)}
              className="w-full"
            >
              <MesocycleHistoryCard item={item} defaultExpanded={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoutineHistoryPage;
