import React, { useState, useEffect, useMemo } from 'react';
import { cn } from 'cn';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FilterBottomSheet, FilterState } from './FilterBottomSheet';
import { apiClient } from '../../api/client';
import type { Exercise, MovementPattern } from '../../api';
import { Search, Dumbbell, Filter, ChevronRight, BookOpen } from 'lucide-react';

export interface ExerciseCatalogPageProps {
  onSelectExercise?: (exercise: Exercise) => void;
  className?: string;
}

export const ExerciseCatalogPage: React.FC<ExerciseCatalogPageProps> = ({
  onSelectExercise,
  className = '',
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    muscle: 'all',
    pattern: 'all',
  });

  // Carga progresiva de ejercicios para mantener 60 FPS estables (T-22)
  const [visibleCount, setVisibleCount] = useState<number>(20);

  useEffect(() => {
    let isMounted = true;
    const fetchExercises = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.catalog.list();
        if (isMounted) {
          setExercises(data);
        }
      } catch (err: unknown) {
        console.error('Failed to load exercises catalog:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchExercises();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtrado instantáneo en memoria por nombre (T-88) y filtros biomecánicos
  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return exercises.filter((ex) => {
      if (query) {
        const nameMatch = ex.name.toLowerCase().includes(query);
        if (!nameMatch) {
          return false;
        }
      }

      if (filters.pattern !== 'all' && ex.movement_pattern !== filters.pattern) {
        return false;
      }

      if (filters.muscle !== 'all' && ex.primary_muscle !== filters.muscle) {
        return false;
      }

      return true;
    });
  }, [exercises, searchQuery, filters]);

  // Lista con carga progresiva para mantener rendimiento óptimo
  const visibleExercises = useMemo(() => {
    return filteredExercises.slice(0, visibleCount);
  }, [filteredExercises, visibleCount]);

  const hasActiveFilters = filters.muscle !== 'all' || filters.pattern !== 'all';

  const getPatternLabel = (pattern: MovementPattern): string => {
    switch (pattern) {
      case 'empuje':
        return 'Empuje';
      case 'tiron':
        return 'Tirón';
      case 'rodilla_dominante':
        return 'Rodilla dominante';
      case 'cadera_dominante':
        return 'Cadera dominante';
      case 'core':
        return 'Core';
      default:
        return pattern;
    }
  };

  return (
    <div
      data-testid="catalog-main"
      className={cn(
        'w-full max-w-[390px] mx-auto min-h-screen bg-surface-base text-content-primary flex flex-col overflow-x-hidden relative select-none pb-28',
        className
      )}
    >
      {/* Header Contextual Superior con Input de Búsqueda por Nombre (T-88) */}
      <header className="sticky top-0 z-20 bg-surface-1/95 backdrop-blur-md border-b border-border-subtle p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl border border-brand-primary/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-content-primary tracking-tight">
                Catálogo de Ejercicios
              </h1>
              <p className="text-xs text-content-secondary">
                Biblioteca biomecánica para entrenamiento
              </p>
            </div>
          </div>

          <Badge variant="default" className="text-xs font-mono shrink-0">
            {filteredExercises.length}
          </Badge>
        </div>

        {/* Input de búsqueda por texto superior (T-88) */}
        <div className="relative w-full">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ejercicio por nombre..."
            iconLeft={<Search className="w-4 h-4" />}
            className="w-full min-h-[48px] text-xs h-12 bg-surface-2 border-border-interactive"
          />
        </div>
      </header>

      {/* Lista Principal de Ejercicios Scrolleable */}
      <main className="flex-1 w-full p-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-content-secondary animate-pulse">
            <Dumbbell className="w-8 h-8 text-brand-primary/50" />
            <span className="text-sm font-medium">Cargando biblioteca de ejercicios...</span>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="py-16 text-center bg-surface-1 rounded-2xl border border-border-subtle p-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center text-content-secondary">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-content-primary">
                No se encontraron ejercicios
              </h3>
              <p className="text-xs text-content-secondary max-w-xs mx-auto">
                Probá buscando con otro término o abrí los filtros para cambiar la selección.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 w-full">
            {visibleExercises.map((exercise) => (
              <div
                key={exercise.id}
                data-testid="exercise-card"
                onClick={() => onSelectExercise?.(exercise)}
                className="group bg-surface-1 hover:bg-surface-2 border border-border-subtle hover:border-border-interactive rounded-2xl p-4 shadow-sm transition-all duration-150 cursor-pointer flex flex-col gap-2.5 active:scale-[0.99] touch-target min-h-[48px] w-full"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-content-primary group-hover:text-brand-primary transition-colors leading-snug">
                    {exercise.name}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-content-secondary group-hover:text-brand-primary transition-transform shrink-0 mt-0.5" />
                </div>

                <p className="text-xs text-content-secondary line-clamp-2 leading-relaxed">
                  {exercise.instructions || 'Instrucciones biomecánicas no disponibles.'}
                </p>

                {/* Badges de clasificación */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border-subtle/50 text-[11px]">
                  <Badge variant="brand" size="sm">
                    {getPatternLabel(exercise.movement_pattern)}
                  </Badge>
                  <Badge variant="default" size="sm" className="capitalize">
                    {exercise.primary_muscle}
                  </Badge>
                  <Badge variant="default" size="sm">
                    {exercise.is_compound ? 'Compuesto' : 'Monoarticular'}
                  </Badge>
                </div>
              </div>
            ))}

            {/* Botón de carga progresiva si quedan más ejercicios */}
            {visibleCount < filteredExercises.length && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="w-full min-h-[48px] touch-target text-xs font-semibold mt-2"
              >
                Cargar más ejercicios ({filteredExercises.length - visibleCount} restantes)
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Dock de Filtros en la Mitad Inferior (Sticky en zona de pulgar, RF-04, CF-06) */}
      <div
        data-testid="catalog-search-dock"
        className="fixed bottom-0 inset-x-0 z-30 w-full max-w-[390px] mx-auto p-3 bg-surface-1/95 backdrop-blur-md border-t border-border-interactive flex items-center gap-2 shadow-2xl pb-[calc(12px+env(safe-area-inset-bottom))]"
      >
        <Button
          type="button"
          variant={hasActiveFilters ? 'primary' : 'secondary'}
          onClick={() => setIsFilterSheetOpen(true)}
          aria-label="Filtrar catálogo"
          fullWidth
          className="touch-target min-h-[48px] h-12 px-4 flex items-center justify-center gap-2 rounded-xl font-semibold text-xs"
        >
          <Filter className="w-4 h-4" />
          <span>Filtrar catálogo</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-brand-contrast shrink-0" />
          )}
        </Button>
      </div>

      {/* Bottom Sheet de Filtros (RF-06, CF-08) */}
      <FilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        currentFilters={filters}
        onApplyFilters={setFilters}
      />
    </div>
  );
};

export default ExerciseCatalogPage;
