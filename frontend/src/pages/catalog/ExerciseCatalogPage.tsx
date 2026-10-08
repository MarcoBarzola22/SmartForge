import React, { useState, useEffect, useMemo } from 'react';
import { cn } from 'cn';
import { Button } from '../../components/ui/Button';
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
        'w-full max-w-[390px] mx-auto min-h-screen bg-shell text-content flex flex-col overflow-x-hidden relative select-none pb-28',
        className
      )}
    >
      {/* Header Contextual Superior con Buscador Redondeado (T-18) */}
      <header className="sticky top-0 z-20 bg-surface-1/95 backdrop-blur-md border-b border-line p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand/15 text-brand-focus rounded-xl border border-brand/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-content tracking-tight">
                Catálogo de Ejercicios
              </h1>
              <p className="text-xs text-content-3">
                Biblioteca biomecánica para entrenamiento
              </p>
            </div>
          </div>

          <span className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1 text-xs font-mono font-bold text-content-2">
            {filteredExercises.length}
          </span>
        </div>

        {/* Barra de búsqueda redondeada con diana >= 48px (T-18) */}
        <div className="relative w-full">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-content-3">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ejercicio por nombre..."
            className="w-full min-h-[48px] h-12 pl-10 pr-4 rounded-2xl bg-surface-2 border border-line text-xs font-medium text-content placeholder:text-content-3 focus:outline-none focus:ring-2 focus:ring-brand-focus transition-all"
          />
        </div>
      </header>

      {/* Lista Principal de Ejercicios en Cards Horizontales (T-18) */}
      <main className="flex-1 w-full p-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-content-3 animate-pulse">
            <Dumbbell className="w-8 h-8 text-brand/50" />
            <span className="text-sm font-medium">Cargando biblioteca de ejercicios...</span>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="py-16 text-center bg-surface-1 rounded-2xl border border-line p-6 flex flex-col items-center gap-3 shadow-lg shadow-brand/5">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center text-content-3">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-content">
                No se encontraron ejercicios
              </h3>
              <p className="text-xs text-content-2 max-w-xs mx-auto">
                Probá buscando con otro término o abrí los filtros para cambiar la selección.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 w-full">
            {visibleExercises.map((exercise) => (
              <article
                key={exercise.id}
                data-testid="exercise-card"
                onClick={() => onSelectExercise?.(exercise)}
                className="press touch-target min-h-[48px] group bg-surface-1 hover:bg-surface-2 border border-line hover:border-line/80 rounded-2xl p-4 shadow-lg shadow-brand/5 transition-all duration-150 cursor-pointer flex flex-col gap-2.5 w-full"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-content group-hover:text-brand-focus transition-colors leading-snug">
                    {exercise.name}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-content-3 group-hover:text-brand-focus transition-transform shrink-0 mt-0.5" />
                </div>

                <p className="text-xs text-content-2 line-clamp-2 leading-relaxed">
                  {exercise.instructions || 'Instrucciones biomecánicas no disponibles.'}
                </p>

                {/* Badges de clasificación en bg-surface-2 text-content-2 (T-18) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-line/60 text-[11px]">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-content-2">
                    {getPatternLabel(exercise.movement_pattern)}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-content-2 capitalize">
                    {exercise.primary_muscle}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-content-3">
                    {exercise.is_compound ? 'Compuesto' : 'Monoarticular'}
                  </span>
                </div>
              </article>
            ))}

            {/* Botón de carga progresiva si quedan más ejercicios */}
            {visibleCount < filteredExercises.length && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="press w-full min-h-[48px] touch-target text-xs font-semibold mt-2 rounded-xl"
              >
                Cargar más ejercicios ({filteredExercises.length - visibleCount} restantes)
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Dock de Filtros en la Mitad Inferior (Sticky/Fixed, RF-04, CF-06, T-18) */}
      <div
        data-testid="catalog-search-dock"
        className="fixed bottom-0 inset-x-0 z-30 w-full max-w-[390px] mx-auto p-3 glass border-t border-line flex items-center gap-2 shadow-2xl pb-[calc(12px+env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(true)}
          aria-label="Filtrar catálogo"
          className={cn(
            'press touch-target min-h-[48px] h-12 px-4 w-full flex items-center justify-center gap-2 rounded-xl font-bold text-xs transition-all shadow-lg',
            hasActiveFilters
              ? 'bg-amber text-ink shadow-amber/30'
              : 'bg-brand text-content shadow-brand/30'
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Filtrar catálogo</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-ink shrink-0 animate-pulse" />
          )}
        </button>
      </div>

      {/* Bottom Sheet de Filtros (RF-06, CF-08, T-18) */}
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
