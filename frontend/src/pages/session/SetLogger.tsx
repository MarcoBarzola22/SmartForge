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
  Plus,
  Minus,
  CheckCircle2,
  Trash2,
  Edit2,
  Dumbbell,
  Repeat,
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

  const RIR_OPTIONS = [
    { value: 0, label: '0 (Fallo)', desc: 'Sin reps de reserva' },
    { value: 1, label: '1', desc: '1 rep en recámara' },
    { value: 2, label: '2', desc: '2 reps en recámara' },
    { value: 3, label: '3', desc: '3 reps en recámara' },
    { value: 4, label: '4', desc: '4 reps en recámara' },
    { value: 5, label: '5', desc: '5+ reps' }
  ];

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Target Prescription Header (CA-05.1) */}
      <Card>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Prescripción del Ejercicio
            </span>
            <Badge variant="amber" size="sm">
              Serie {editingSet ? editingSet.set_number : nextSetNumber} de {targetSets}
            </Badge>
          </div>

          <h3 className="text-base font-bold text-zinc-100 leading-snug">
            {exerciseName}
          </h3>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Objetivo: {targetSets} × {targetReps} reps @ {targetLoadKg} kg
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>RIR Objetivo: {targetRir}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Touch-Optimized Set Input Area (RNF-01, CA-05.2, CA-05.5) */}
      <Card title={editingSet ? `Editar Serie ${editingSet.set_number}` : `Registrar Serie ${nextSetNumber}`}>
        <div className="flex flex-col gap-4 pt-1">
          {/* 1. Control de Peso (kg) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="set-weight"
                className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"
              >
                <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                Peso (kg)
              </label>
              <span className="text-xs font-mono font-bold text-amber-300">
                {weightKg} kg
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Disminuir peso 1 kg"
                onClick={() => adjustWeight(-1)}
                className="touch-target min-h-[48px] min-w-[48px] rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:bg-zinc-900 active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                id="set-weight"
                type="number"
                step="0.5"
                min="0"
                value={weightKg}
                onChange={(e) => setWeightKg(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 h-12 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-lg font-bold text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />

              <button
                type="button"
                aria-label="Aumentar peso 1 kg"
                onClick={() => adjustWeight(1)}
                className="touch-target min-h-[48px] min-w-[48px] rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:bg-zinc-900 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Botones de ajuste rápido de peso */}
            <div className="grid grid-cols-4 gap-1.5">
              {[-5, -2.5, 2.5, 5].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  aria-label={`${delta > 0 ? '+' : ''}${delta} kg`}
                  onClick={() => adjustWeight(delta)}
                  className="touch-target min-h-[48px] py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white active:scale-95 transition-all"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Control de Repeticiones */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="set-reps"
                className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"
              >
                <Repeat className="w-3.5 h-3.5 text-amber-400" />
                Repeticiones
              </label>
              <span className="text-xs font-mono font-bold text-amber-300">
                {reps} reps
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Disminuir 1 repetición"
                onClick={() => adjustReps(-1)}
                className="touch-target min-h-[48px] min-w-[48px] rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:bg-zinc-900 active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                id="set-reps"
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 h-12 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-lg font-bold text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />

              <button
                type="button"
                aria-label="Aumentar 1 repetición"
                onClick={() => adjustReps(1)}
                className="touch-target min-h-[48px] min-w-[48px] rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:bg-zinc-900 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Botones de ajuste rápido de reps */}
            <div className="grid grid-cols-4 gap-1.5">
              {[-2, -1, 1, 2].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  aria-label={`${delta > 0 ? '+' : ''}${delta} rep`}
                  onClick={() => adjustReps(delta)}
                  className="touch-target min-h-[48px] py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white active:scale-95 transition-all"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Selector de RIR (0 a 5) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                RIR (Repeticiones en reserva)
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                RIR {rir}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1">
              {RIR_OPTIONS.map((opt) => {
                const isSelected = rir === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-label={`RIR ${opt.value}`}
                    aria-pressed={isSelected}
                    onClick={() => setRir(opt.value)}
                    className={`touch-target min-h-[48px] p-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-sm">{opt.value}</span>
                    <span className="text-[8px] font-normal leading-tight">
                      {opt.value === 0 ? 'Fallo' : `RIR ${opt.value}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Botón Grande de Confirmación (1 toque si acepta pre-carga, CA-05.2) */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting || isLoading}
          onClick={handleConfirmSet}
          iconLeft={<CheckCircle2 className="w-5 h-5" />}
          className="shadow-2xl min-h-[52px]"
        >
          {editingSet
            ? `Guardar Serie ${editingSet.set_number}`
            : `Registrar Serie ${nextSetNumber}`}
        </Button>

        {editingSet && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={handleCancelEdit}
          >
            Cancelar edición
          </Button>
        )}
      </div>

      {/* Lista de Series Completadas (CA-05.4) */}
      {completedSets.length > 0 && (
        <Card title="Series Completadas" subtitle={`${completedSets.length} de ${targetSets} series`}>
          <div className="flex flex-col gap-2 pt-1">
            {completedSets.map((set) => (
              <div
                key={set.id || set.set_number}
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {set.set_number}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">
                      Serie {set.set_number}
                    </span>
                    <span className="font-bold text-zinc-100 font-mono">
                      {set.weight_kg} kg × {set.reps_completed} reps
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      RIR {set.rir}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onUpdateSet && (
                    <button
                      type="button"
                      aria-label={`Editar serie ${set.set_number}`}
                      onClick={() => handleStartEdit(set)}
                      className="touch-target min-h-[48px] min-w-[48px] p-2 text-zinc-400 hover:text-amber-400 transition-colors flex items-center justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {onDeleteSet && (
                    <button
                      type="button"
                      aria-label={`Eliminar serie ${set.set_number}`}
                      onClick={() => onDeleteSet(set.id)}
                      className="touch-target min-h-[48px] min-w-[48px] p-2 text-zinc-400 hover:text-red-400 transition-colors flex items-center justify-center"
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
