import React, { useState, useEffect } from 'react';
import { cn } from 'cn';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Filter, Check, RotateCcw } from 'lucide-react';
import type { MovementPattern, MuscleGroup } from '../../api';

export interface FilterState {
  muscle: MuscleGroup | 'all';
  pattern: MovementPattern | 'all';
}

export interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
}

export const MUSCLE_OPTIONS: { id: MuscleGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos los músculos' },
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'cuadriceps', label: 'Cuádriceps' },
  { id: 'isquiosurales', label: 'Isquiosurales' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'pantorrillas', label: 'Pantorrillas' },
  { id: 'core', label: 'Core' },
];

export const PATTERN_OPTIONS: { id: MovementPattern | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos los patrones' },
  { id: 'empuje', label: 'Empuje' },
  { id: 'tiron', label: 'Tirón' },
  { id: 'rodilla_dominante', label: 'Rodilla dominante' },
  { id: 'cadera_dominante', label: 'Cadera dominante' },
  { id: 'core', label: 'Core' },
];

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
}) => {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    currentFilters.muscle
  );
  const [selectedPattern, setSelectedPattern] = useState<MovementPattern | 'all'>(
    currentFilters.pattern
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedMuscle(currentFilters.muscle);
      setSelectedPattern(currentFilters.pattern);
    }
  }, [isOpen, currentFilters]);

  const handleApply = () => {
    onApplyFilters({
      muscle: selectedMuscle,
      pattern: selectedPattern,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedMuscle('all');
    setSelectedPattern('all');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] flex flex-col p-0 overflow-hidden bg-surface-1 border-t border-border-interactive select-none"
      >
        {/* Header del Sheet */}
        <SheetHeader className="p-4 border-b border-border-subtle flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-primary" />
            <SheetTitle className="text-base font-bold text-content-primary">
              Filtros de Catálogo
            </SheetTitle>
          </div>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Restablecer filtros"
            className="text-xs text-content-secondary hover:text-content-primary flex items-center gap-1 touch-target min-h-[48px] px-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </SheetHeader>

        {/* Lista vertical scrolleable (Cero scroll horizontal) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-5 w-full">
          {/* Sección 1: Grupos Musculares */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider">
              Grupo Muscular
            </span>
            <div className="flex flex-col gap-2 w-full">
              {MUSCLE_OPTIONS.map((opt) => {
                const isSelected = selectedMuscle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid="filter-chip-muscle"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedMuscle(opt.id)}
                    className={cn(
                      'w-full touch-target min-h-[48px] px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between text-left select-none',
                      isSelected
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-sm'
                        : 'bg-surface-2 border-border-interactive text-content-primary hover:bg-surface-3'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sección 2: Patrones de Movimiento */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider">
              Patrón de Movimiento
            </span>
            <div className="flex flex-col gap-2 w-full">
              {PATTERN_OPTIONS.map((opt) => {
                const isSelected = selectedPattern === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid="filter-chip-pattern"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedPattern(opt.id)}
                    className={cn(
                      'w-full touch-target min-h-[48px] px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between text-left select-none',
                      isSelected
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-sm'
                        : 'bg-surface-2 border-border-interactive text-content-primary hover:bg-surface-3'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Zona Inferior Fija de Acción (Mitad inferior de pantalla) */}
        <div className="p-4 border-t border-border-subtle bg-surface-1 flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 min-h-[48px] touch-target"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleApply}
            className="flex-1 min-h-[48px] touch-target font-bold"
          >
            Aplicar filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FilterBottomSheet;
