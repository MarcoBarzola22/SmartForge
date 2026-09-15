import React from 'react';
import { TrendingUp, TrendingDown, Minus, Dumbbell, ShieldAlert, Award } from 'lucide-react';
import type { ExerciseProgressionItem } from '../../api/generated/types';

export interface ExerciseProgressionCardProps {
  progression: ExerciseProgressionItem & { muscleGroup?: string };
  muscleGroup?: string;
  className?: string;
}

const LOAD_TYPE_LABELS: Record<string, string> = {
  bodyweight: 'Peso corporal',
  bodyweight_loadable: 'Corporal con lastre',
  assisted_bodyweight: 'Calisténico asistido',
  external_load: 'Carga externa'
};

export const ExerciseProgressionCard: React.FC<ExerciseProgressionCardProps> = ({
  progression,
  muscleGroup,
  className = ''
}) => {
  const effectiveMuscle = muscleGroup || progression.muscleGroup || 'General';
  const isExecuted = progression.final?.executed ?? true;
  const progress = progression.progress;

  // Format progression delta
  const hasProgress = isExecuted && progress !== undefined;
  const deltaKg = progress?.deltaKg ?? 0;
  const deltaPercent = progress?.deltaPercent ?? 0;
  const isPositive = deltaKg > 0;
  const isNegative = deltaKg < 0;

  const deltaKgStr = isPositive
    ? `+${deltaKg.toFixed(1)}`
    : `${deltaKg.toFixed(1)}`;
  const deltaPercentStr = isPositive
    ? `+${deltaPercent.toFixed(1)}%`
    : `${deltaPercent.toFixed(1)}%`;

  return (
    <div
      data-testid="exercise-progression-card"
      className={`w-full max-w-[390px] mx-auto bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700/80 rounded-xl p-3.5 flex flex-col gap-3 shadow-sm transition-all text-zinc-100 overflow-hidden ${className}`}
    >
      {/* Exercise Header: Name, Muscle Group, Load Type */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <h4 className="text-sm font-bold text-zinc-100 tracking-tight truncate">
              {progression.exerciseName}
            </h4>
          </div>
          <span className="text-[11px] font-medium text-zinc-400 mt-0.5">
            {effectiveMuscle} • {LOAD_TYPE_LABELS[progression.loadType] || progression.loadType}
          </span>
        </div>

        {/* 1RM Delta Badge */}
        {hasProgress ? (
          <div
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${
              isPositive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isNegative
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            {isPositive && <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />}
            {isNegative && <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />}
            {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>
              {deltaKgStr} kg ({deltaPercentStr} 1RM est.)
            </span>
          </div>
        ) : (
          <div className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-zinc-800/80 border border-zinc-700/60 text-zinc-400">
            0 kg / Sin variación
          </div>
        )}
      </div>

      {/* Comparison Grid: Punto de partida vs Carga final (RF-06 CA-06.4) */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/70">
        {/* Punto de Partida */}
        <div className="flex flex-col gap-0.5 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            Punto de partida
          </span>
          <span className="text-xs font-bold text-zinc-200 truncate">
            {progression.baseline?.loadText || 'Sin datos'}
          </span>
          <span className="text-[10px] text-zinc-400">
            1RM est.: <strong className="text-zinc-300 font-semibold">{progression.baseline?.e1rmKg?.toFixed(1) ?? '0.0'} kg</strong>
          </span>
        </div>

        {/* Carga Final Alcanzada */}
        <div className="flex flex-col gap-0.5 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-400" />
            Carga final alcanzada
          </span>
          {isExecuted ? (
            <>
              <span className="text-xs font-bold text-zinc-100 truncate">
                {progression.final?.loadText || 'Sin datos'}
              </span>
              <span className="text-[10px] text-zinc-400">
                1RM est.: <strong className="text-amber-300 font-semibold">{progression.final?.e1rmKg?.toFixed(1) ?? '0.0'} kg</strong>
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mt-1">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>No ejecutado (Ciclo cancelado)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
