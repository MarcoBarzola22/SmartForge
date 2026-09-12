import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../api/client';
import type {
  Exercise,
  MovementPattern,
  MuscleGroup
} from '../../api';
import {
  Search,
  Dumbbell,
  Filter,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export interface ExerciseCatalogPageProps {
  onSelectExercise?: (exercise: Exercise) => void;
  className?: string;
}

const PATTERNS: { id: MovementPattern | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'empuje', label: 'Empuje' },
  { id: 'tiron', label: 'Tirón' },
  { id: 'rodilla_dominante', label: 'Rodilla dominante' },
  { id: 'cadera_dominante', label: 'Cadera dominante' },
  { id: 'core', label: 'Core' }
];

const MUSCLE_GROUPS: { id: MuscleGroup | 'all'; label: string }[] = [
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
  { id: 'core', label: 'Core' }
];

export const ExerciseCatalogPage: React.FC<ExerciseCatalogPageProps> = ({
  onSelectExercise,
  className = ''
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<MovementPattern | 'all'>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'compound' | 'isolation'>('all');

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

  // Filter exercises interactively with instant responsiveness (< 100ms)
  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return exercises.filter((ex) => {
      // Search filter (name, primary muscle, secondary muscles)
      if (query) {
        const nameMatch = ex.name.toLowerCase().includes(query);
        const muscleMatch = ex.primary_muscle.toLowerCase().includes(query);
        const secondariesMatch = (ex.secondary_muscles || []).some((m) =>
          m.toLowerCase().includes(query)
        );
        if (!nameMatch && !muscleMatch && !secondariesMatch) {
          return false;
        }
      }

      // Movement pattern filter
      if (selectedPattern !== 'all' && ex.movement_pattern !== selectedPattern) {
        return false;
      }

      // Muscle group filter
      if (selectedMuscle !== 'all' && ex.primary_muscle !== selectedMuscle) {
        return false;
      }

      // Compound / Isolation filter
      if (selectedType === 'compound' && !ex.is_compound) {
        return false;
      }
      if (selectedType === 'isolation' && ex.is_compound) {
        return false;
      }

      return true;
    });
  }, [exercises, searchQuery, selectedPattern, selectedMuscle, selectedType]);

  const getPatternBadgeVariant = (pattern: MovementPattern) => {
    switch (pattern) {
      case 'empuje':
        return 'success';
      case 'tiron':
        return 'info';
      case 'rodilla_dominante':
      case 'cadera_dominante':
        return 'amber';
      case 'core':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPatternLabel = (pattern: MovementPattern) => {
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
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col ${className}`}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Catálogo de Ejercicios
                </h1>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Biblioteca biomecánica con variantes y demostraciones
                </p>
              </div>
            </div>

            <Badge variant="default" className="text-xs font-mono">
              {filteredExercises.length} {filteredExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
            </Badge>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ejercicio por nombre o músculo..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/80 transition-colors min-h-[48px]"
            />
          </div>

          {/* Movement Pattern Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {PATTERNS.map((p) => {
              const isSelected = selectedPattern === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPattern(p.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap touch-target min-h-[48px] transition-all border ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800/80 hover:text-neutral-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Catalog View */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Secondary Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800/80">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label htmlFor="muscle-select" className="text-xs text-neutral-400 font-medium whitespace-nowrap flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Músculo:</span>
            </label>
            <select
              id="muscle-select"
              aria-label="Filtrar por músculo"
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value as MuscleGroup | 'all')}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80 capitalize flex-1 touch-target min-h-[48px]"
            >
              {MUSCLE_GROUPS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            {(['all', 'compound', 'isolation'] as const).map((type) => {
              const labels = {
                all: 'Todos',
                compound: 'Compuestos',
                isolation: 'Monoarticulares'
              };
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all touch-target min-h-[48px] ${
                    isSelected
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercise Cards List */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-500 animate-pulse">
            <Dumbbell className="w-8 h-8 text-amber-500/50" />
            <span className="text-sm font-medium">Cargando biblioteca de ejercicios...</span>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="py-16 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800/80 p-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 flex items-center justify-center text-neutral-500">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-300">
                No se encontraron ejercicios con los filtros seleccionados
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Probá buscando con otro término o seleccioná diferentes patrones musculares.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredExercises.map((exercise) => {
              const patternVariant = getPatternBadgeVariant(exercise.movement_pattern);
              const patternLabel = getPatternLabel(exercise.movement_pattern);

              return (
                <div
                  key={exercise.id}
                  data-testid="exercise-card"
                  onClick={() => onSelectExercise?.(exercise)}
                  className="group bg-neutral-900/80 hover:bg-neutral-850 border border-neutral-800/90 hover:border-neutral-700/80 rounded-2xl p-4 shadow-lg transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 active:scale-[0.99] min-h-[48px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-neutral-100 group-hover:text-amber-400 transition-colors leading-snug">
                        {exercise.name}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>

                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {exercise.instructions || 'Instrucciones biomecánicas no disponibles.'}
                    </p>
                  </div>

                  {/* Badges and metadata footer */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800/60 text-[11px]">
                    <Badge variant={patternVariant} size="sm">
                      {patternLabel}
                    </Badge>
                    <Badge variant="default" size="sm" className="capitalize">
                      {exercise.primary_muscle}
                    </Badge>
                    <Badge variant="default" size="sm">
                      {exercise.is_compound ? 'Compuesto' : 'Monoarticular'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
