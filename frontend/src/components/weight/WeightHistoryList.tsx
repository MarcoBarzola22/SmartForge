import React, { useMemo } from 'react';
import {
  Scale,
  Calendar,
  Plus,
  Edit2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { WeightLogItem } from '../../api/generated/types';

export interface WeightHistoryListProps {
  logs: WeightLogItem[];
  onEditLog?: (log: WeightLogItem) => void;
  onLogRetroactive?: (suggestedDate?: string) => void;
  onAddNewLog?: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
  showMissingWeeks?: boolean;
  className?: string;
}

interface MissingWeekItem {
  isMissing: true;
  calendar_week_start: string;
}

type TimelineItem =
  | { isMissing: false; log: WeightLogItem; calendar_week_start: string }
  | MissingWeekItem;

const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

/**
 * Formatea una fecha YYYY-MM-DD al formato legible en español (ej. "10 sep 2026").
 */
function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1] || '1', 10) - 1;
  const day = parseInt(parts[2] || '1', 10);
  const monthName = MONTH_NAMES[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

/**
 * Agrega N días a una fecha en formato YYYY-MM-DD.
 */
function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + days);
  const resY = date.getUTCFullYear();
  const resM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(date.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

export const WeightHistoryList: React.FC<WeightHistoryListProps> = ({
  logs = [],
  onEditLog,
  onLogRetroactive,
  onAddNewLog,
  isLoading = false,
  emptyMessage = 'No tienes pesajes registrados aún',
  showMissingWeeks = true,
  className = ''
}) => {
  // Construir línea de tiempo cronológica inversa (con semanas vacías si showMissingWeeks = true)
  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (logs.length === 0) return [];

    // Ordenar de más reciente a más antigua
    const sortedLogs = [...logs].sort((a, b) => b.logged_date.localeCompare(a.logged_date));

    if (!showMissingWeeks) {
      return sortedLogs.map((l) => ({
        isMissing: false,
        log: l,
        calendar_week_start: l.calendar_week_start
      }));
    }

    // Identificar semanas mínima y máxima
    const weekStarts = sortedLogs.map((l) => l.calendar_week_start).filter(Boolean);
    if (weekStarts.length === 0) {
      return sortedLogs.map((l) => ({
        isMissing: false,
        log: l,
        calendar_week_start: l.calendar_week_start
      }));
    }

    const minWeek = weekStarts.reduce((min, cur) => (cur < min ? cur : min), weekStarts[0]!);
    const maxWeek = weekStarts.reduce((max, cur) => (cur > max ? cur : max), weekStarts[0]!);

    const registeredWeeksMap = new Map<string, WeightLogItem>();
    sortedLogs.forEach((l) => {
      if (l.calendar_week_start) {
        registeredWeeksMap.set(l.calendar_week_start, l);
      }
    });

    const items: TimelineItem[] = [];
    let curWeek = maxWeek;

    while (curWeek >= minWeek) {
      const existing = registeredWeeksMap.get(curWeek);
      if (existing) {
        items.push({
          isMissing: false,
          log: existing,
          calendar_week_start: curWeek
        });
      } else {
        items.push({
          isMissing: true,
          calendar_week_start: curWeek
        });
      }
      curWeek = addDaysToDate(curWeek, -7);
    }

    return items;
  }, [logs, showMissingWeeks]);

  if (isLoading) {
    return (
      <div
        data-testid="weight-history-loading"
        className={`w-full max-w-[390px] mx-auto p-6 flex flex-col items-center justify-center gap-3 text-zinc-400 ${className}`}
      >
        <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
        <p className="text-xs font-medium">Cargando historial de pesajes...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div
        data-testid="weight-history-list"
        className={`w-full max-w-[390px] mx-auto p-6 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex flex-col items-center text-center gap-4 ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Scale className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-200">Evolución de peso corporal</h3>
          <p className="text-xs text-zinc-400 mt-1">{emptyMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => (onAddNewLog ? onAddNewLog() : onLogRetroactive?.())}
          className="touch-target min-h-[48px] w-full px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:translate-y-px"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar primer pesaje</span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="weight-history-list"
      className={`w-full max-w-[390px] mx-auto flex flex-col gap-3 overflow-hidden ${className}`}
    >
      {/* Barra superior de acción rápida */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">Historial de peso</h3>
          <p className="text-[11px] text-zinc-400">Mediciones semanales y tendencia</p>
        </div>

        <button
          type="button"
          onClick={() => (onAddNewLog ? onAddNewLog() : onLogRetroactive?.())}
          className="touch-target min-h-[48px] px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo pesaje</span>
        </button>
      </div>

      {/* Listado de tarjetas verticales sin scroll horizontal (Constitución Art. 2) */}
      <div className="flex flex-col gap-2.5">
        {timelineItems.map((item) => {
          if (item.isMissing) {
            // Tarjeta de semana pendiente/vacía para carga retroactiva (RF-02 CA-02.2)
            return (
              <div
                key={`missing-${item.calendar_week_start}`}
                className="w-full p-3.5 bg-zinc-900/40 border border-dashed border-zinc-700/80 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-500/80" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-300">
                      Semana sin registro
                    </span>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      Semana del {formatDateSpanish(item.calendar_week_start)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onLogRetroactive?.(item.calendar_week_start)}
                  aria-label={`Cargar pesaje retroactivo para la semana del ${item.calendar_week_start}`}
                  className="touch-target min-h-[48px] px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 text-xs font-medium border border-zinc-700 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cargar pesaje</span>
                </button>
              </div>
            );
          }

          // Tarjeta de pesaje registrado (RF-02 CA-02.1)
          const { log } = item;
          const delta = log.delta_kg;

          return (
            <div
              key={log.id}
              className="w-full p-3.5 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-xl flex items-center justify-between gap-3 shadow-sm transition-all"
            >
              {/* Información principal: Peso y Fecha */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-amber-400 shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-zinc-100 tracking-tight">
                      {log.weight_kg.toFixed(1)} kg
                    </span>

                    {/* Variación delta respecto a semana previa */}
                    {delta !== null && delta !== undefined ? (
                      <span
                        className={`text-xs font-semibold flex items-center gap-0.5 ${
                          delta > 0
                            ? 'text-amber-400'
                            : delta < 0
                            ? 'text-cyan-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {delta > 0 ? (
                          <>
                            <TrendingUp className="w-3 h-3" />
                            <span>+{delta.toFixed(1)} kg</span>
                          </>
                        ) : delta < 0 ? (
                          <>
                            <TrendingDown className="w-3 h-3" />
                            <span>{delta.toFixed(1)} kg</span>
                          </>
                        ) : (
                          <>
                            <Minus className="w-3 h-3" />
                            <span>0.0 kg</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">Inicial</span>
                    )}
                  </div>

                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    {formatDateSpanish(log.logged_date)}
                  </span>
                </div>
              </div>

              {/* Botón de edición con touch-target >= 48px */}
              <button
                type="button"
                onClick={() => onEditLog?.(log)}
                aria-label={`Editar pesaje del ${log.logged_date}`}
                className="touch-target min-h-[48px] min-w-[48px] p-2.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
