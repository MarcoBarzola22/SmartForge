import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Dumbbell,
  Sparkles,
  AlertTriangle,
  Info,
  ShieldCheck,
  Check,
  Loader2,
  X
} from 'lucide-react';
import {
  routineConfigStore,
  useRoutineConfigStore,
  type SessionDurationMinutes,
  type ExercisesMode
} from '../../stores/routineConfig.store';
import type { GenerateMesocycleRequest, TrainingGoal } from '../../api';

export interface MesocycleWizardV2Props {
  isOpen?: boolean;
  onClose?: () => void;
  onGenerate?: (data: GenerateMesocycleRequest) => void | Promise<void>;
  onSubmit?: (data: GenerateMesocycleRequest) => void | Promise<void>;
  initialDays?: number;
  initialDuration?: SessionDurationMinutes;
  initialMode?: ExercisesMode;
  initialCustomCount?: number;
  initialGoal?: TrainingGoal;
  isSubmitting?: boolean;
}

const AVAILABLE_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const TIME_BLOCKS: SessionDurationMinutes[] = [30, 45, 60, 75, 90, 120];
const EXERCISE_COUNTS = [2, 3, 4, 5, 6, 7] as const;

export const MesocycleWizardV2: React.FC<MesocycleWizardV2Props> = ({
  isOpen = true,
  onClose,
  onGenerate,
  onSubmit,
  initialDays = 4,
  initialDuration = 60,
  initialMode = 'recommended',
  initialCustomCount,
  initialGoal,
  isSubmitting = false
}) => {
  const {
    selectedDuration,
    recommendedExercises,
    minExercises,
    maxExercises,
    viability
  } = useRoutineConfigStore();

  const [days, setDays] = useState<number>(initialDays);
  const [mode, setMode] = useState<ExercisesMode>(initialMode);
  const [customCount, setCustomCount] = useState<number>(
    initialCustomCount ?? 4
  );

  // Sync initial props on mount
  useEffect(() => {
    routineConfigStore.selectDuration(initialDuration);
    routineConfigStore.selectPreference({
      mode: initialMode,
      customCount: initialMode === 'manual' ? (initialCustomCount ?? 4) : undefined
    });
  }, [initialDuration, initialMode, initialCustomCount]);

  if (!isOpen) return null;

  const handleDaySelect = (day: number) => {
    setDays(day);
  };

  const handleDurationSelect = (dur: SessionDurationMinutes) => {
    routineConfigStore.selectDuration(dur);
  };

  const handleModeChange = (newMode: ExercisesMode) => {
    setMode(newMode);
    routineConfigStore.selectPreference({
      mode: newMode,
      customCount: newMode === 'manual' ? customCount : undefined
    });
  };

  const handleCountSelect = (count: number) => {
    setCustomCount(count);
    routineConfigStore.selectPreference({
      mode: 'manual',
      customCount: count
    });
  };

  const handleConfirm = () => {
    if (!viability.viable || isSubmitting) return;

    const payload: GenerateMesocycleRequest = {
      availableDays: days,
      sessionDurationMinutes: selectedDuration,
      exercisesPerSessionPreference: {
        mode,
        customCount: mode === 'manual' ? customCount : undefined
      },
      ...(initialGoal ? { target_goal: initialGoal } : {})
    };

    if (onGenerate) {
      onGenerate(payload);
    } else if (onSubmit) {
      onSubmit(payload);
    }
  };

  // Conditions for pedagogical notes
  const isDME = days * selectedDuration <= 120 || (selectedDuration === 30 && days <= 2);
  const currentExercises = mode === 'recommended' ? recommendedExercises : customCount;
  const isVolumeCeiling = days >= 6 && selectedDuration >= 90 && currentExercises >= 6;

  return (
    <div
      data-testid="mesocycle-wizard-v2"
      className="w-full max-w-[390px] mx-auto bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 text-zinc-100 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded bg-amber-500/10 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">
              Nuevo Mesociclo V2
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Parámetros temporales y homogeneidad de sesiones
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="touch-target min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Section 1: Días disponibles por semana (RF-03 CA-03.1) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Días disponibles por semana</span>
          </label>
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
            {days} {days === 1 ? 'día' : 'días'}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-tight">
          Sesiones secuenciales (Sesión 1 a {days}) sin anclaje forzado al calendario
        </p>

        <div className="grid grid-cols-7 gap-1 pt-1">
          {AVAILABLE_DAYS.map((d) => {
            const isSelected = days === d;
            return (
              <button
                key={d}
                type="button"
                aria-label={`${d} día${d > 1 ? 's' : ''}`}
                aria-pressed={isSelected}
                onClick={() => handleDaySelect(d)}
                className={`touch-target min-h-[48px] rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 font-black scale-105'
                    : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <span>{d}</span>
                <span className="text-[9px] font-normal opacity-70">
                  {d === 1 ? 'día' : 'd'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Bloques fijos uniformes (RF-03 CA-03.2) */}
      <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tiempo disponible por sesión</span>
          </label>
          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
            {selectedDuration} min
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-tight">
          Duración estándar uniforme para todas las sesiones
        </p>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {TIME_BLOCKS.map((duration) => {
            const isSelected = selectedDuration === duration;
            return (
              <button
                key={duration}
                type="button"
                aria-label={`${duration} min`}
                aria-pressed={isSelected}
                onClick={() => handleDurationSelect(duration)}
                className={`touch-target min-h-[48px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20 font-black'
                    : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                <span>{duration} min</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Cantidad de ejercicios por sesión (RF-03 CA-03.3, CA-03.4) */}
      <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
            <span>Ejercicios por día</span>
          </label>
          <span className="text-xs font-medium text-zinc-400">
            {currentExercises} ej/día
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            aria-pressed={mode === 'recommended'}
            onClick={() => handleModeChange('recommended')}
            className={`touch-target min-h-[48px] px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
              mode === 'recommended'
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-1 font-bold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Recomendado por SmartForge
            </span>
            <span className="text-[10px] text-zinc-400">
              ({recommendedExercises} ej/día)
            </span>
          </button>

          <button
            type="button"
            aria-pressed={mode === 'manual'}
            onClick={() => handleModeChange('manual')}
            className={`touch-target min-h-[48px] px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
              mode === 'manual'
                ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="font-bold">Manual</span>
            <span className="text-[10px] text-zinc-400">(2 a 7 ej/día)</span>
          </button>
        </div>

        {/* Manual Exercise Count Selector (RF-03 CA-03.3) */}
        {mode === 'manual' && (
          <div className="flex flex-col gap-1.5 pt-1 animate-in fade-in duration-150">
            <span className="text-[11px] text-zinc-400">
              Selecciona la cantidad de ejercicios para cada sesión:
            </span>
            <div className="grid grid-cols-6 gap-1">
              {EXERCISE_COUNTS.map((count) => {
                const isSelected = customCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    aria-label={`${count} ej`}
                    aria-pressed={isSelected}
                    onClick={() => handleCountSelect(count)}
                    className={`touch-target min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20 font-black'
                        : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span>{count} ej</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Alertas Pedagógicas de Inviabilidad (RF-04 CA-04.2, CA-04.3) */}
      {!viability.viable && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-200">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-red-300">
              {viability.reason ||
                `El número de ejercicios manual (${customCount}) excede el presupuesto para ${selectedDuration} minutos.`}
            </p>
            <p className="text-[11px] text-red-300/80">
              Para {selectedDuration} minutos recomendamos un máximo de {minExercises} a{' '}
              {maxExercises} ejercicios para garantizar descansos fisiológicos (60–180s) y series de calidad.
            </p>
          </div>
        </div>
      )}

      {/* Section 5: Notas Pedagógicas Contextuales (DME y Techo de Volumen) (RF-04 CA-04.4, CA-04.6) */}
      {viability.viable && isDME && (
        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-start gap-2 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-semibold text-amber-300">
              Rutina optimizada para tiempo reducido (Dosis mínima efectiva)
            </span>
            <span className="text-[11px] text-amber-300/80">
              Se priorizan 6–8 series de alta calidad con mayor proximidad al fallo (RIR 1-2).
            </span>
          </div>
        </div>
      )}

      {viability.viable && isVolumeCeiling && (
        <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-start gap-2 text-xs text-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-semibold text-blue-300">
              Volumen ajustado jerárquicamente al techo seguro (24 series/músculo/semana)
            </span>
            <span className="text-[11px] text-blue-300/80">
              Se preservan intactos los compuestos principales y se poda el volumen excedente.
            </span>
          </div>
        </div>
      )}

      {/* Footer CTA: Bottom button (Constitución Art. 2: Ergonómico a una mano ≥ 48px) */}
      <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-2">
        <button
          type="button"
          disabled={!viability.viable || isSubmitting}
          onClick={handleConfirm}
          className={`touch-target min-h-[48px] w-full rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            !viability.viable || isSubmitting
              ? 'bg-zinc-800 border border-zinc-700/60 text-zinc-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
              <span>Generando rutina...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generar mesociclo</span>
            </>
          )}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="touch-target min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};
