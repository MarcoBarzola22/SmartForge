import React, { useState } from 'react';
import { Minus, Plus, Check, Info, Dumbbell, Repeat, Flame } from 'lucide-react';
import { cn } from 'cn';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/Sheet';

export interface ModularSetCardProps extends React.HTMLAttributes<HTMLDivElement> {
  setNumber: number;
  totalSets: number;
  previousHistory?: string;
  weightKg: number;
  reps: number;
  rir: number;
  isCompleted?: boolean;
  isLoading?: boolean;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onRirChange: (rir: number) => void;
  onCompleteSet: () => void;
  className?: string;
}

export const ModularSetCard: React.FC<ModularSetCardProps> = ({
  setNumber,
  totalSets,
  previousHistory,
  weightKg,
  reps,
  rir,
  isCompleted = false,
  isLoading = false,
  onWeightChange,
  onRepsChange,
  onRirChange,
  onCompleteSet,
  className = '',
  ...props
}) => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const handleWeightDelta = (delta: number) => {
    const next = Math.max(0, Math.round((weightKg + delta) * 10) / 10);
    onWeightChange(next);
  };

  const handleRepsDelta = (delta: number) => {
    const next = Math.max(1, reps + delta);
    onRepsChange(next);
  };

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onWeightChange(isNaN(val) ? 0 : Math.max(0, val));
  };

  const handleRepsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onRepsChange(isNaN(val) ? 1 : Math.max(1, val));
  };

  const handleCompleteWithDebounce = () => {
    if (isDebouncing || isCompleted || isLoading) return;
    setIsDebouncing(true);
    onCompleteSet();
    setTimeout(() => {
      setIsDebouncing(false);
    }, 400);
  };

  const RIR_CHOICES = [0, 1, 2, 3, 4, 5];

  return (
    <Card
      role="region"
      aria-label={`Serie ${setNumber} de ${totalSets}`}
      className={cn('w-full max-w-[390px] mx-auto p-4 flex flex-col gap-4 select-none', className)}
      {...props}
    >
      {/* FILA 1: Cabecera (N° set e historial previo con tap informativo) */}
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-sm">
            {setNumber}
          </span>
          <h3 className="text-base font-bold text-content-primary">
            Serie {setNumber} <span className="text-xs font-normal text-content-secondary">de {totalSets}</span>
          </h3>
        </div>

        {previousHistory && (
          <button
            type="button"
            data-testid="history-trigger"
            onClick={() => setIsHistoryModalOpen(true)}
            aria-label="Ver detalle del historial previo"
            className="flex-1 min-w-0 max-w-[65%] truncate flex items-center justify-end gap-1 text-xs text-content-secondary hover:text-content-primary font-mono transition-colors text-right"
          >
            <span className="truncate">{previousHistory}</span>
            <Info className="w-3.5 h-3.5 shrink-0 text-brand-primary/80" />
          </button>
        )}
      </div>

      {/* FILA 2: Control de Peso (kg) con steppers de 48px y shrink-0 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`weight-input-${setNumber}`}
          className="text-xs font-semibold text-content-secondary flex items-center gap-1.5"
        >
          <Dumbbell className="w-3.5 h-3.5 text-brand-primary" />
          Peso (kg)
        </label>

        <div className="flex items-center gap-2 w-full">
          <Button
            type="button"
            variant="secondary"
            aria-label="Disminuir peso"
            onClick={() => handleWeightDelta(-1)}
            className="shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl"
          >
            <Minus className="w-5 h-5 text-content-primary" />
          </Button>

          <div className="flex-1 min-w-0">
            <Input
              id={`weight-input-${setNumber}`}
              type="text"
              inputMode="decimal"
              aria-label="Carga de peso"
              value={weightKg}
              onChange={handleWeightInputChange}
              normalizeDecimal={true}
              unit="kg"
              className="text-center font-mono font-bold text-lg h-12"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            aria-label="Aumentar peso"
            onClick={() => handleWeightDelta(1)}
            className="shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl"
          >
            <Plus className="w-5 h-5 text-content-primary" />
          </Button>
        </div>
      </div>

      {/* FILA 3: Control de Repeticiones con steppers de 48px y shrink-0 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`reps-input-${setNumber}`}
          className="text-xs font-semibold text-content-secondary flex items-center gap-1.5"
        >
          <Repeat className="w-3.5 h-3.5 text-brand-primary" />
          Repeticiones
        </label>

        <div className="flex items-center gap-2 w-full">
          <Button
            type="button"
            variant="secondary"
            aria-label="Disminuir repeticiones"
            onClick={() => handleRepsDelta(-1)}
            className="shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl"
          >
            <Minus className="w-5 h-5 text-content-primary" />
          </Button>

          <div className="flex-1 min-w-0">
            <Input
              id={`reps-input-${setNumber}`}
              type="number"
              inputMode="numeric"
              min="1"
              aria-label="Cantidad de repeticiones"
              value={reps}
              onChange={handleRepsInputChange}
              unit="reps"
              className="text-center font-mono font-bold text-lg h-12"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            aria-label="Aumentar repeticiones"
            onClick={() => handleRepsDelta(1)}
            className="shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl"
          >
            <Plus className="w-5 h-5 text-content-primary" />
          </Button>
        </div>
      </div>

      {/* FILA 4: RIR + Botón Checkmark de completado (48×48px) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-content-secondary flex items-center gap-1">
            <Flame className="w-3 h-3 text-status-warning" />
            RIR (Reserva)
          </span>

          <div className="grid grid-cols-6 gap-1 w-full">
            {RIR_CHOICES.map((choice) => {
              const isSelected = rir === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-label={`RIR ${choice}`}
                  aria-pressed={isSelected}
                  onClick={() => onRirChange(choice)}
                  className={cn(
                    'touch-target min-h-[48px] h-12 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center p-0.5',
                    isSelected
                      ? 'bg-brand-primary text-brand-primary-text border-brand-primary shadow-sm'
                      : 'bg-surface-2 border-border-interactive text-content-secondary hover:text-content-primary'
                  )}
                >
                  <span className="text-sm leading-tight">{choice}</span>
                  <span className="text-[8px] font-normal leading-tight opacity-80">
                    {choice === 0 ? 'Fallo' : `RIR ${choice}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Checkmark de 48×48px con debounce */}
        <div className="shrink-0 flex-shrink-0 self-end">
          <Button
            type="button"
            variant={isCompleted ? 'success' : 'primary'}
            aria-label="Completar serie"
            onClick={handleCompleteWithDebounce}
            isLoading={isLoading || isDebouncing}
            disabled={isCompleted || isLoading || isDebouncing}
            className={cn(
              'shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl shadow-md transition-transform active:scale-95',
              isCompleted && 'bg-status-success text-white'
            )}
          >
            <Check className="w-6 h-6 stroke-[2.5]" />
          </Button>
        </div>
      </div>

      {/* Modal informativo de historial previo */}
      <Sheet open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Historial de la Serie</SheetTitle>
          </SheetHeader>
          <div className="py-4 text-sm text-content-secondary leading-relaxed font-mono">
            {previousHistory}
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsHistoryModalOpen(false)}
              className="min-h-[48px] touch-target"
            >
              Cerrar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default ModularSetCard;
