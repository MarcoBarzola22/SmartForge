import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type {
  SetLog,
  CreateSetLogRequest,
  UpdateSetLogRequest
} from '../../api';
import {
  Check,
  Trash2,
  Edit2,
  Flame,
  Target
} from 'lucide-react';

export interface SetLoggerProps {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetLoadKg: number;
  targetRir: number;
  completedSets?: SetLog[];
  onLogSet: (set: CreateSetLogRequest) => Promise<void> | void;
  onUpdateSet?: (setId: string, updates: UpdateSetLogRequest) => Promise<void> | void;
  onDeleteSet?: (setId: string) => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
}

export const SetLogger: React.FC<SetLoggerProps> = ({
  exerciseId,
  exerciseName,
  targetSets,
  targetReps,
  targetLoadKg,
  targetRir,
  completedSets = [],
  onLogSet,
  onUpdateSet,
  onDeleteSet,
  isLoading = false,
  className = ''
}) => {
  // Pre-load from previous set or targets (CA-05.2, CA-05.3)
  const lastSet = completedSets[completedSets.length - 1];
  const nextSetNumber = completedSets.length + 1;

  const [weightKg, setWeightKg] = useState<number>(
    lastSet ? lastSet.weight_kg : targetLoadKg
  );
  const [reps, setReps] = useState<number>(
    lastSet ? lastSet.reps_completed : targetReps
  );
  const [rir, setRir] = useState<number>(
    lastSet ? lastSet.rir : targetRir
  );

  const [editingSet, setEditingSet] = useState<SetLog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if targets or exercise change
  useEffect(() => {
    if (!lastSet) {
      setWeightKg(targetLoadKg);
      setReps(targetReps);
      setRir(targetRir);
    }
  }, [exerciseId, targetLoadKg, targetReps, targetRir, lastSet]);

  const adjustWeight = (delta: number) => {
    setWeightKg((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  const adjustReps = (delta: number) => {
    setReps((prev) => Math.max(1, prev + delta));
  };

  const handleConfirmSet = async () => {
    setIsSubmitting(true);
    try {
      if (editingSet && onUpdateSet) {
        await onUpdateSet(editingSet.id, {
          weight_kg: weightKg,
          reps_completed: reps,
          rir: rir,
          client_timestamp: new Date().toISOString()
        });
        setEditingSet(null);
      } else {
        await onLogSet({
          exercise_id: exerciseId,
          set_number: nextSetNumber,
          weight_kg: weightKg,
          reps_completed: reps,
          rir: rir,
          client_timestamp: new Date().toISOString()
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (set: SetLog) => {
    setEditingSet(set);
    setWeightKg(set.weight_kg);
    setReps(set.reps_completed);
    setRir(set.rir);
  };

  const handleCancelEdit = () => {
    setEditingSet(null);
    if (lastSet) {
      setWeightKg(lastSet.weight_kg);
      setReps(lastSet.reps_completed);
      setRir(lastSet.rir);
    } else {
      setWeightKg(targetLoadKg);
      setReps(targetReps);
      setRir(targetRir);
    }
  };

  const RIR_OPTIONS = [0, 1, 2, 3, 4];

  return (
    <div className={`flex flex-col gap-4 w-full min-w-0 ${className}`}>
      {/* Target Prescription Header (CA-05.1) */}
      <Card className="w-full min-w-0 bg-surface-1 border-line rounded-2xl shadow-lg shadow-brand/5">
        <div className="flex flex-col gap-2 w-full min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber truncate">
              Prescripción del Ejercicio
            </span>
            <Badge variant="amber" size="sm" className="shrink-0">
              Serie {editingSet ? editingSet.set_number : nextSetNumber} de {targetSets}
            </Badge>
          </div>

          <h3 className="text-base font-bold text-content leading-snug break-words">
            {exerciseName}
          </h3>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-content-2 w-full">
            <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1 rounded-xl border border-line shrink-0">
              <Target className="w-3.5 h-3.5 text-amber" />
              <span>
                Objetivo: {targetSets} × {targetReps} reps @ {targetLoadKg} kg
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 py-1 rounded-xl border border-line shrink-0">
              <Flame className="w-3.5 h-3.5 text-amber" />
              <span>RIR Objetivo: {targetRir}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Touch-Optimized Set Input Area (Lovable Stepper and RIR layout) */}
      <Card 
        title={editingSet ? `Editar Serie ${editingSet.set_number}` : `Registrar Serie ${nextSetNumber}`}
        className="w-full min-w-0 bg-surface-1 border-line rounded-2xl shadow-lg shadow-brand/5"
      >
        <div className="flex flex-col gap-4 pt-1 w-full min-w-0">
          {/* 1. Control de Carga (kg) con Stepper */}
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="rounded-xl bg-surface-2 p-3 text-left select-none w-full">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="set-weight"
                  className="text-[11px] font-semibold uppercase tracking-wider text-content-2"
                >
                  Peso (kg)
                </label>
                <span className="font-mono text-xs font-bold text-neon">
                  {weightKg} kg
                </span>
              </div>
              <div className="mt-2 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
                <button
                  type="button"
                  aria-label="Disminuir peso 1 kg"
                  onClick={() => adjustWeight(-1)}
                  className="press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content touch-target transition-all"
                >
                  <span className="text-xl font-bold">−</span>
                </button>
                <div className="flex items-center justify-center">
                  <input
                    id="set-weight"
                    type="number"
                    step="0.5"
                    min="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 text-center font-mono text-2xl font-bold text-content bg-transparent border-0 focus:outline-none"
                  />
                  <span className="ml-1 text-[11px] font-normal text-content-2">kg</span>
                </div>
                <button
                  type="button"
                  aria-label="Aumentar peso 1 kg"
                  onClick={() => adjustWeight(1)}
                  className="press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content touch-target transition-all"
                >
                  <span className="text-xl font-bold">+</span>
                </button>
              </div>
            </div>

            {/* Botones de ajuste rápido de peso */}
            <div className="grid grid-cols-4 gap-2 w-full">
              {[-5, -2.5, 2.5, 5].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  aria-label={`${delta > 0 ? '+' : ''}${delta} kg`}
                  onClick={() => adjustWeight(delta)}
                  className="press touch-target min-h-[48px] h-12 w-full py-1.5 rounded-xl bg-surface-2 border border-line text-xs font-bold text-content hover:border-line-strong active:scale-95 transition-all flex items-center justify-center"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Control de Repeticiones con Stepper */}
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="rounded-xl bg-surface-2 p-3 text-left select-none w-full">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="set-reps"
                  className="text-[11px] font-semibold uppercase tracking-wider text-content-2"
                >
                  Repeticiones
                </label>
                <span className="font-mono text-xs font-bold text-neon">
                  {reps} reps
                </span>
              </div>
              <div className="mt-2 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
                <button
                  type="button"
                  aria-label="Disminuir 1 repetición"
                  onClick={() => adjustReps(-1)}
                  className="press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content touch-target transition-all"
                >
                  <span className="text-xl font-bold">−</span>
                </button>
                <div className="flex items-center justify-center">
                  <input
                    id="set-reps"
                    type="number"
                    min="1"
                    value={reps}
                    onChange={(e) => setReps(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 text-center font-mono text-2xl font-bold text-content bg-transparent border-0 focus:outline-none"
                  />
                  <span className="ml-1 text-[11px] font-normal text-content-2">reps</span>
                </div>
                <button
                  type="button"
                  aria-label="Aumentar 1 repetición"
                  onClick={() => adjustReps(1)}
                  className="press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content touch-target transition-all"
                >
                  <span className="text-xl font-bold">+</span>
                </button>
              </div>
            </div>

            {/* Botones de ajuste rápido de reps */}
            <div className="grid grid-cols-4 gap-2 w-full">
              {[-2, -1, 1, 2].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  aria-label={`${delta > 0 ? '+' : ''}${delta} rep`}
                  onClick={() => adjustReps(delta)}
                  className="press touch-target min-h-[48px] h-12 w-full py-1.5 rounded-xl bg-surface-2 border border-line text-xs font-bold text-content hover:border-line-strong active:scale-95 transition-all flex items-center justify-center"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Selector de RIR (cuadrícula de 5 columnas con botones redondeados de Lovable) */}
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-content-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber" />
                RIR (reps en reserva)
              </span>
              <span className="font-mono text-xs font-bold text-amber">
                RIR {rir}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 w-full">
              {RIR_OPTIONS.map((val) => {
                const isSelected = rir === val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-label={`RIR ${val}`}
                    aria-pressed={isSelected}
                    onClick={() => setRir(val)}
                    className={`press touch-target min-h-[48px] h-12 rounded-full font-mono text-sm font-bold transition-all duration-200 flex items-center justify-center select-none ${
                      isSelected
                        ? 'bg-brand text-content shadow-lg shadow-brand/30 ring-2 ring-brand-focus'
                        : 'bg-surface-2 text-content-2 hover:text-content'
                    }`}
                  >
                    {val === 4 ? '4+' : val}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Botón Maestro Grande de Confirmación (estilo Lovable: bg-success text-ink font-extrabold shadow-success/30) */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-2 w-full min-w-0">
        <button
          type="button"
          disabled={isSubmitting || isLoading}
          onClick={handleConfirmSet}
          className="press flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-success text-ink font-extrabold shadow-lg shadow-success/30 touch-target select-none disabled:opacity-50"
        >
          <Check className="h-5 w-5 stroke-[3]" />
          <span>
            {editingSet
              ? `Guardar Serie ${editingSet.set_number}`
              : `Registrar Serie ${nextSetNumber}`}
          </span>
        </button>

        {editingSet && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={handleCancelEdit}
            className="min-h-[48px] h-12 w-full rounded-xl bg-surface-2 text-content-2 hover:text-content"
          >
            Cancelar edición
          </Button>
        )}
      </div>

      {/* Lista de Series Completadas (estilo Lovable: filas min-h-12 bg-success/10 con checkmark verde) */}
      {completedSets.length > 0 && (
        <Card
          title="Series Completadas"
          subtitle={`${completedSets.length} de ${targetSets} series`}
          className="w-full min-w-0 bg-surface-1 border-line rounded-2xl shadow-lg shadow-brand/5"
        >
          <div className="flex flex-col gap-2.5 pt-1 w-full min-w-0">
            {completedSets.map((set) => (
              <div
                key={set.id || set.set_number}
                className="animate-in fade-in slide-in-from-bottom-2 duration-200 flex min-h-12 items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-3.5 py-2 w-full min-w-0"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-success text-ink shrink-0 font-bold">
                  <Check className="h-4 w-4 stroke-[3]" />
                </span>

                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-content-2">
                    Serie {set.set_number}
                  </span>
                  <span className="font-mono text-sm font-bold text-content truncate">
                    {set.weight_kg} kg × {set.reps_completed} reps · RIR {set.rir}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  {onUpdateSet && (
                    <button
                      type="button"
                      aria-label={`Editar serie ${set.set_number}`}
                      onClick={() => handleStartEdit(set)}
                      className="press touch-target h-10 w-10 min-h-[40px] min-w-[40px] p-2 text-content-2 hover:text-amber transition-colors flex items-center justify-center rounded-xl hover:bg-surface-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {onDeleteSet && (
                    <button
                      type="button"
                      aria-label={`Eliminar serie ${set.set_number}`}
                      onClick={() => onDeleteSet(set.id)}
                      className="press touch-target h-10 w-10 min-h-[40px] min-w-[40px] p-2 text-content-2 hover:text-fatigue-text transition-colors flex items-center justify-center rounded-xl hover:bg-surface-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SetLogger;
