import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type {
  Joint,
  BodySide,
  PainIntensity,
  CreatePainReportRequest
} from '../../api';
import {
  Check,
  Info
} from 'lucide-react';

export interface PainReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  onSubmit: (data: CreatePainReportRequest) => Promise<void> | void;
  isLoading?: boolean;
}

interface JointConfig {
  id: Joint;
  label: string;
  isBilateralOnly?: boolean;
}

const JOINTS_TAXONOMY: JointConfig[] = [
  { id: 'hombro', label: 'Hombro' },
  { id: 'codo', label: 'Codo' },
  { id: 'muneca', label: 'Muñeca' },
  { id: 'columna_lumbar', label: 'Columna lumbar', isBilateralOnly: true },
  { id: 'cadera', label: 'Cadera' },
  { id: 'rodilla', label: 'Rodilla' },
  { id: 'tobillo', label: 'Tobillo' }
];

const INTENSITY_OPTIONS: { id: PainIntensity; label: string; desc: string; variant: 'info' | 'warning' | 'danger' }[] = [
  {
    id: 'leve',
    label: 'Leve',
    desc: 'Molestia ligera, permite continuar el entrenamiento',
    variant: 'info'
  },
  {
    id: 'moderada',
    label: 'Moderada',
    desc: 'Altera la técnica o genera dolor perceptible',
    variant: 'warning'
  },
  {
    id: 'severa',
    label: 'Severa',
    desc: 'Dolor agudo o punzante, impide continuar',
    variant: 'danger'
  }
];

export const PainReportModal: React.FC<PainReportModalProps> = ({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  onSubmit,
  isLoading = false
}) => {
  const [selectedJoint, setSelectedJoint] = useState<Joint | null>(null);
  const [selectedSide, setSelectedSide] = useState<BodySide>('bilateral');
  const [selectedIntensity, setSelectedIntensity] = useState<PainIntensity>('moderada');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeJointConfig = JOINTS_TAXONOMY.find((j) => j.id === selectedJoint);
  const isBilateralOnly = activeJointConfig?.isBilateralOnly || false;

  const handleSelectJoint = (jointId: Joint) => {
    setSelectedJoint(jointId);
    const config = JOINTS_TAXONOMY.find((j) => j.id === jointId);
    if (config?.isBilateralOnly) {
      setSelectedSide('bilateral');
    }
  };

  const handleSubmit = async () => {
    if (!selectedJoint) return;

    const payload: CreatePainReportRequest = {
      exercise_id: exerciseId,
      joint: selectedJoint,
      side: isBilateralOnly ? 'bilateral' : selectedSide,
      intensity: selectedIntensity,
      ...(notes.trim() ? { notes: notes.trim() } : {})
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSelectedJoint(null);
    setSelectedSide('bilateral');
    setSelectedIntensity('moderada');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Reportar Molestia Articular"
      description={exerciseName}
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <Button
            variant="ghost"
            onClick={handleResetAndClose}
            disabled={isLoading || isSubmitting}
            className="min-h-[48px] text-zinc-400 hover:text-white"
          >
            Omitir
          </Button>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedJoint || isLoading || isSubmitting}
            isLoading={isLoading || isSubmitting}
            className="min-h-[48px] px-6 bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg shadow-red-950/50"
          >
            Guardar Reporte
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 py-1">
        {/* Info banner */}
        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            El reporte es <strong className="text-white">opcional</strong>. Nos permite adaptar automáticamente la sobrecarga o recomendar ejercicios alternativos en tu próxima sesión (RF-06, RF-08).
          </p>
        </div>

        {/* Step 1: Joint Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
            1. Selecciona la articulación afectada
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {JOINTS_TAXONOMY.map((j) => {
              const isSelected = selectedJoint === j.id;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => handleSelectJoint(j.id)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-all min-h-[48px] flex items-center justify-between ${
                    isSelected
                      ? 'bg-red-950/60 border-red-500/80 text-white shadow-md shadow-red-950/30'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <span>{j.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-red-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Body Side Selection (if applicable) */}
        {selectedJoint && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              2. Lado del cuerpo
            </label>
            {isBilateralOnly ? (
              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-400 font-medium">
                Zona axial (Bilateral)
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(['izquierda', 'derecha', 'bilateral'] as BodySide[]).map((side) => {
                  const isSelected = selectedSide === side;
                  const sideLabels: Record<BodySide, string> = {
                    izquierda: 'Izquierda',
                    derecha: 'Derecha',
                    bilateral: 'Bilateral'
                  };

                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setSelectedSide(side)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold capitalize transition-all min-h-[48px] flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-red-950/80 border-red-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {sideLabels[side]}
                      {isSelected && <Check className="w-3.5 h-3.5 text-red-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Intensity Selection */}
        {selectedJoint && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              3. Intensidad de la molestia
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {INTENSITY_OPTIONS.map((opt) => {
                const isSelected = selectedIntensity === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedIntensity(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all min-h-[48px] flex flex-col justify-between gap-1 ${
                      isSelected
                        ? opt.id === 'severa'
                          ? 'bg-red-950/90 border-red-500 text-white shadow-lg'
                          : opt.id === 'moderada'
                          ? 'bg-amber-950/90 border-amber-500 text-white shadow-lg'
                          : 'bg-sky-950/90 border-sky-500 text-white shadow-lg'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-bold text-white">{opt.label}</span>
                      <Badge variant={opt.variant} size="sm">
                        {opt.label}
                      </Badge>
                    </div>
                    <span className="text-[11px] opacity-80 leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Optional Notes */}
        {selectedJoint && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              4. Observaciones adicionales (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales de la molestia (ej: dolor al bloquear, rango final...)"
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-500 resize-none transition-colors"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
