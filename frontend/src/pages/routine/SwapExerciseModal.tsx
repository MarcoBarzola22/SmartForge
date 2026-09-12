import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import type {
  ExerciseAssignment,
  ExerciseAlternative,
  SwapReason
} from '../../api';
import {
  Check,
  AlertTriangle,
  RefreshCw,
  Dumbbell,
  Sparkles,
  HeartCrack,
  ThumbsDown,
  Layers
} from 'lucide-react';

export interface SwapExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: ExerciseAssignment | null;
  onSwapSuccess?: (updatedAssignment: ExerciseAssignment) => void;
}

export const SwapExerciseModal: React.FC<SwapExerciseModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onSwapSuccess
}) => {
  const [alternatives, setAlternatives] = useState<ExerciseAlternative[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [reason, setReason] = useState<SwapReason>('preferencia_personal');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !assignment) {
      setAlternatives([]);
      setSelectedExerciseId(null);
      setError(null);
      return;
    }

    const fetchAlternatives = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.routine.getAlternatives(assignment.exercise_id);
        setAlternatives(data);
        if (data.length > 0 && data[0]) {
          setSelectedExerciseId(data[0].alternative_exercise.id);
        } else {
          setSelectedExerciseId(null);
        }
      } catch (err: any) {
        setError(
          err?.data?.error?.message ||
          err?.message ||
          'Error al cargar ejercicios alternativos'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlternatives();
  }, [isOpen, assignment]);

  const handleConfirmSwap = async () => {
    if (!assignment || !selectedExerciseId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await apiClient.routine.swapExercise(assignment.id, {
        new_exercise_id: selectedExerciseId,
        reason,
        notes: notes.trim() || undefined
      });

      onSwapSuccess?.(updated);
      onClose();
    } catch (err: any) {
      setError(
        err?.data?.error?.message ||
        err?.message ||
        'Error al sustituir el ejercicio'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const swapReasons: { id: SwapReason; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'falta_equipamiento', label: 'Falta de equipamiento', icon: Dumbbell },
    { id: 'preferencia_personal', label: 'Preferencia personal', icon: ThumbsDown },
    { id: 'molestia_articular', label: 'Molestia articular', icon: HeartCrack }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar ejercicio"
      description="Selección de alternativas compatibles"
      footer={
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!selectedExerciseId || alternatives.length === 0}
            isLoading={isSubmitting}
            onClick={handleConfirmSwap}
            iconLeft={<RefreshCw className="w-5 h-5" />}
          >
            Confirmar Cambio
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <Toast
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {/* Ejercicio Actual */}
        {assignment && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Ejercicio actual
            </span>
            <h4 className="text-sm font-bold text-zinc-200 mt-0.5">
              {assignment.exercise?.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 text-zinc-400">
              <span>{assignment.exercise?.primary_muscle}</span>
              <span>•</span>
              <span className="capitalize">{assignment.exercise?.movement_pattern?.replace('_', ' ')}</span>
            </div>
          </div>
        )}

        {/* Lista de Alternativas (CA-03.1, CA-03.2) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Alternativas compatibles con tu equipamiento
          </span>

          {isLoading ? (
            <div className="flex flex-col gap-2 animate-pulse py-2">
              <div className="h-14 bg-zinc-800/60 rounded-xl border border-zinc-700/50" />
              <div className="h-14 bg-zinc-800/60 rounded-xl border border-zinc-700/50" />
            </div>
          ) : alternatives.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {alternatives.map((alt) => {
                const isSelected = selectedExerciseId === alt.alternative_exercise.id;
                const compatibilityPercent = Math.round(alt.similarity_score * 100);

                return (
                  <button
                    key={alt.alternative_exercise.id}
                    type="button"
                    aria-label={`Seleccionar ${alt.alternative_exercise.name}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedExerciseId(alt.alternative_exercise.id)}
                    className={`touch-target min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-zinc-100 shadow-sm'
                        : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col gap-1 pr-2 overflow-hidden">
                      <span className="text-xs font-bold truncate">
                        {alt.alternative_exercise.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <span>{alt.alternative_exercise.primary_muscle}</span>
                        <span>•</span>
                        <Badge variant="amber" size="sm">
                          {compatibilityPercent}% compatible
                        </Badge>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-zinc-950'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* CA-03.2 Mensaje de no alternativa disponible */
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">No se encontró alternativa con tu equipamiento</span>
                <span className="text-amber-200/80 text-[11px]">
                  No hay otro ejercicio del mismo patrón compatible con los implementos registrados en tu perfil.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selector de Motivo de Cambio (CA-03.4) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Motivo del cambio
          </span>

          <div className="grid grid-cols-3 gap-1.5">
            {swapReasons.map((item) => {
              const isSelected = reason === item.id;
              const IconComp = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReason(item.id)}
                  className={`touch-target min-h-[48px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-sm'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <IconComp className="w-4 h-4 mb-1 shrink-0" />
                  <span className="text-[10px] leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notas Adicionales (Opcional) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="swap-notes" className="text-[11px] font-medium text-zinc-400">
            Notas u observaciones (opcional)
          </label>
          <input
            id="swap-notes"
            type="text"
            placeholder="Ej. Pequeña molestia en hombro al bajar"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>
    </Modal>
  );
};

export default SwapExerciseModal;
