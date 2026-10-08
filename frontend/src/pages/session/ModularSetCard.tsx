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
    const val = parseFloat(e.target.value.replace(',', '.'));
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
      className={cn('w-full max-w-[390px] mx-auto p-4 flex flex-col gap-4 select-none bg-surface-1 border-line rounded-2xl shadow-lg shadow-brand/5', className)}
      {...props}
    >
      {/* FILA 1: Cabecera (N° set e historial previo con tap informativo) */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/30 text-brand-focus flex items-center justify-center font-bold text-sm font-mono">
            {setNumber}
          </span>
          <h3 className="text-base font-bold text-content">
            Serie {setNumber} <span className="text-xs font-normal text-content-2">de {totalSets}</span>
          </h3>
        </div>

        {previousHistory && (
          <button
            type="button"
            data-testid="history-trigger"
            onClick={() => setIsHistoryModalOpen(true)}
            aria-label="Ver detalle del historial previo"
            className="flex-1 min-w-0 max-w-[65%] truncate flex items-center justify-end gap-1 text-xs text-content-2 hover:text-content font-mono transition-colors text-right"
          >
            <span className="truncate">{previousHistory}</span>
            <Info className="w-3.5 h-3.5 shrink-0 text-brand-focus" />
          </button>
        )}
      </div>

      {/* FILA 2: Control de Peso (kg) con steppers de 48px y shrink-0 estilo Lovable */}
      <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2 p-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`weight-input-${setNumber}`}
            className="text-[11px] font-semibold uppercase tracking-wider text-content-2 flex items-center gap-1.5"
          >
            <Dumbbell className="w-3.5 h-3.5 text-brand-focus" />
            Carga de peso
          </label>
          <span className="font-mono text-xs font-bold text-neon">
            {weightKg} kg
          </span>
        </div>

        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 w-full">
          <Button
            type="button"
            variant="secondary"
            aria-label="Disminuir peso"
            onClick={() => handleWeightDelta(-1)}
            className="press shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl border border-line-strong bg-surface-1 text-content"
          >
            <Minus className="w-5 h-5 text-content" />
          </Button>

          <div className="flex items-center justify-center min-w-0">
            <Input
              id={`weight-input-${setNumber}`}
              type="text"
              inputMode="decimal"
              aria-label="Carga de peso"
              value={weightKg}
              onChange={handleWeightInputChange}
              normalizeDecimal={true}
              unit="kg"
              className="text-center font-mono font-bold text-2xl h-12 bg-transparent border-0 focus:outline-none"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            aria-label="Aumentar peso"
            onClick={() => handleWeightDelta(1)}
            className="press shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl border border-line-strong bg-surface-1 text-content"
          >
            <Plus className="w-5 h-5 text-content" />
          </Button>
        </div>
      </div>

      {/* FILA 3: Control de Repeticiones con steppers de 48px y shrink-0 estilo Lovable */}
      <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2 p-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`reps-input-${setNumber}`}
            className="text-[11px] font-semibold uppercase tracking-wider text-content-2 flex items-center gap-1.5"
          >
            <Repeat className="w-3.5 h-3.5 text-brand-focus" />
            Cantidad de repeticiones
          </label>
          <span className="font-mono text-xs font-bold text-neon">
            {reps} reps
          </span>
        </div>

        <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 w-full">
          <Button
            type="button"
            variant="secondary"
            aria-label="Disminuir repeticiones"
            onClick={() => handleRepsDelta(-1)}
            className="press shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl border border-line-strong bg-surface-1 text-content"
          >
            <Minus className="w-5 h-5 text-content" />
          </Button>

          <div className="flex items-center justify-center min-w-0">
            <Input
              id={`reps-input-${setNumber}`}
              type="number"
              inputMode="numeric"
              min="1"
              aria-label="Cantidad de repeticiones"
              value={reps}
              onChange={handleRepsInputChange}
              unit="reps"
              className="text-center font-mono font-bold text-2xl h-12 bg-transparent border-0 focus:outline-none"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            aria-label="Aumentar repeticiones"
            onClick={() => handleRepsDelta(1)}
            className="press shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl border border-line-strong bg-surface-1 text-content"
          >
            <Plus className="w-5 h-5 text-content" />
          </Button>
        </div>
      </div>

      {/* FILA 4: RIR + Botón Checkmark de completado (48×48px) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-line">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-content-2 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber" />
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
                    'press touch-target min-h-[48px] h-12 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center p-0.5 select-none shrink-0',
                    isSelected
                      ? 'bg-brand text-content border-brand shadow-lg shadow-brand/30'
                      : 'bg-surface-2 border-line text-content-2 hover:text-content hover:bg-surface-2/80'
                  )}
                >
                  <span className="text-sm font-mono font-bold leading-tight">{choice}</span>
                  <span className="text-[8px] font-normal leading-tight opacity-80">
                    {choice === 0 ? 'Fallo' : `RIR ${choice}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Checkmark de 48×48px con debounce estilo Lovable */}
        <div className="shrink-0 flex-shrink-0 self-end">
          <Button
            type="button"
            variant={isCompleted ? 'success' : 'primary'}
            aria-label="Completar serie"
            onClick={handleCompleteWithDebounce}
            isLoading={isLoading || isDebouncing}
            disabled={isCompleted || isLoading || isDebouncing}
            className={cn(
              'press shrink-0 flex-shrink-0 w-12 min-w-[48px] h-12 min-h-[48px] touch-target p-0 flex items-center justify-center rounded-xl shadow-lg transition-transform active:scale-95 select-none',
              isCompleted ? 'bg-success text-ink shadow-success/30' : 'bg-success text-ink shadow-success/30 hover:bg-success/90'
            )}
          >
            <Check className="w-6 h-6 stroke-[3]" />
          </Button>
        </div>
      </div>

      {/* Modal / Bottom Sheet informativo del historial previo */}
      <Sheet open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <SheetContent side="bottom" className="p-4 flex flex-col gap-3">
          <SheetHeader>
            <SheetTitle className="text-base font-bold text-content flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-focus" />
              Detalle del Historial Previo
            </SheetTitle>
          </SheetHeader>
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line text-xs font-mono text-content leading-relaxed break-words">
            {previousHistory}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default ModularSetCard;
