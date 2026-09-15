import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Target,
  Activity
} from 'lucide-react';
import type { MesocycleHistoryItem } from '../../api/generated/types';
import { ExerciseProgressionCard } from './ExerciseProgressionCard';

export interface MesocycleHistoryCardProps {
  item: MesocycleHistoryItem;
  defaultExpanded?: boolean;
  className?: string;
}

function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  completed: {
    label: 'Completado',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  deload_skipped: {
    label: 'Completado (Descarga omitida)',
    badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'bg-red-500/10 border-red-500/30 text-red-400',
    icon: <XCircle className="w-3.5 h-3.5" />
  }
};

export const MesocycleHistoryCard: React.FC<MesocycleHistoryCardProps> = ({
  item,
  defaultExpanded = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const statusInfo = STATUS_CONFIG[item.status] || {
    label: item.status,
    badgeClass: 'bg-zinc-800 border-zinc-700 text-zinc-300',
    icon: <AlertCircle className="w-3.5 h-3.5" />
  };

  const formattedStart = formatDateSpanish(item.startDate);
  const formattedEnd = item.endDate ? formatDateSpanish(item.endDate) : null;
  const dateRangeStr = formattedEnd
    ? `${formattedStart} — ${formattedEnd}`
    : `Iniciado el ${formattedStart}`;

  const progressions = item.exerciseProgressions || [];

  return (
    <div
      data-testid="mesocycle-history-card"
      className={`w-full max-w-[390px] mx-auto bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-xl text-zinc-100 overflow-hidden ${className}`}
    >
      {/* Header: Name, Status Badge, Goal */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <h3 className="text-base font-bold text-zinc-100 tracking-tight truncate">
              {item.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3 text-amber-400" />
                <span data-testid="mesocycle-goal" className="capitalize">
                  {item.goal}
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span>{dateRangeStr}</span>
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
          >
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </div>
        </div>

        {/* Adherence Bar & Details (RF-06 CA-06.1) */}
        <div className="flex flex-col gap-1 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Adherencia</span>
            </span>
            <span className="font-bold text-zinc-100">
              {item.adherencePercent}%
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                item.status === 'cancelled'
                  ? 'bg-gradient-to-r from-red-500 to-amber-500'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, item.adherencePercent))}%` }}
            />
          </div>

          {item.adherenceDetails && (
            <span className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
              {item.adherenceDetails}
            </span>
          )}
        </div>
      </div>

      {/* Accordion Toggle: Exercises List (RF-06 CA-06.4) */}
      <div className="pt-1 border-t border-zinc-800/80 flex flex-col gap-2.5">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="touch-target min-h-[48px] w-full px-3 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <span>
            {isExpanded
              ? `Ocultar comparativa de ejercicios (${progressions.length})`
              : `Ver comparativa de ejercicios (${progressions.length})`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* Stacked Vertical Cards (Card Layout ≤ 390px, cero scroll horizontal) */}
        {isExpanded && (
          <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
            {progressions.length > 0 ? (
              progressions.map((prog) => (
                <ExerciseProgressionCard
                  key={prog.exerciseId}
                  progression={prog}
                />
              ))
            ) : (
              <p className="text-xs text-zinc-400 text-center py-2 italic">
                No hay ejercicios registrados en este mesociclo.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
