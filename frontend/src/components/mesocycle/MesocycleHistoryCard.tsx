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
    badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  deload_skipped: {
    label: 'Completado (Descarga omitida)',
    badgeClass: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'bg-red-500/15 border-red-500/30 text-red-400',
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
    badgeClass: 'bg-surface-2 border-line text-content-2',
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
      className={`w-full max-w-[390px] mx-auto bg-surface-1 border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg shadow-brand/5 text-content overflow-hidden ${className}`}
    >
      {/* Header: Name, Status Badge, Goal */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <h3 className="text-base font-bold text-content tracking-tight truncate">
              {item.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-content-2">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3 text-amber" />
                <span data-testid="mesocycle-goal" className="capitalize">
                  {item.goal}
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px] text-content-3">
                <Calendar className="w-3 h-3" />
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
        <div className="flex flex-col gap-1.5 bg-surface-2 p-3 rounded-xl border border-line">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-content-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand-focus" />
              <span>Adherencia</span>
            </span>
            <span className="font-bold text-content font-mono">
              {item.adherencePercent}%
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-2 bg-surface-1 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                item.status === 'cancelled'
                  ? 'bg-gradient-to-r from-red-500 to-amber-500'
                  : 'progress-gradient'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, item.adherencePercent))}%` }}
            />
          </div>

          {item.adherenceDetails && (
            <span className="text-[10px] text-content-3 mt-0.5 leading-tight">
              {item.adherenceDetails}
            </span>
          )}
        </div>
      </div>

      {/* Accordion Toggle: Exercises List (RF-06 CA-06.4) */}
      <div className="pt-1 border-t border-line flex flex-col gap-2.5">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="press touch-target min-h-[48px] w-full px-3 py-2 rounded-xl bg-surface-2/60 hover:bg-surface-2 border border-line flex items-center justify-between text-xs font-semibold text-content-2 hover:text-content transition-colors"
        >
          <span>
            {isExpanded
              ? `Ocultar comparativa de ejercicios (${progressions.length})`
              : `Ver comparativa de ejercicios (${progressions.length})`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-content-3" />
          ) : (
            <ChevronDown className="w-4 h-4 text-content-3" />
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
              <p className="text-xs text-content-3 text-center py-2 italic">
                No hay ejercicios registrados en este mesociclo.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MesocycleHistoryCard;
