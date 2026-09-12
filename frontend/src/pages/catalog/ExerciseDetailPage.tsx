import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import type {
  Exercise,
  MovementPattern
} from '../../api';
import {
  ArrowLeft,
  VideoOff,
  ExternalLink,
  Dumbbell,
  FileText,
  Activity,
  AlertCircle,
  Play
} from 'lucide-react';

export interface ExerciseDetailPageProps {
  exercise?: Exercise;
  exerciseId?: string;
  onBack?: () => void;
  className?: string;
}

const extractYouTubeId = (url?: string): string | null => {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match && match[1] ? match[1] : null;
};

export const ExerciseDetailPage: React.FC<ExerciseDetailPageProps> = ({
  exercise: initialExercise,
  exerciseId,
  onBack,
  className = ''
}) => {
  const [exercise, setExercise] = useState<Exercise | null>(initialExercise || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialExercise && Boolean(exerciseId));
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);

  useEffect(() => {
    if (initialExercise) {
      setExercise(initialExercise);
      return;
    }

    if (exerciseId) {
      let isMounted = true;
      setIsLoading(true);
      apiClient.catalog
        .getById(exerciseId)
        .then((data) => {
          if (isMounted) setExercise(data);
        })
        .catch((err) => {
          console.error('Failed to load exercise detail:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [initialExercise, exerciseId]);

  const youtubeId = exercise ? extractYouTubeId(exercise.video_url) : null;
  const showVideo = Boolean(youtubeId) && !hasVideoError;

  const getPatternBadgeVariant = (pattern?: MovementPattern) => {
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

  const getPatternLabel = (pattern?: MovementPattern) => {
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
        return pattern || '';
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-neutral-400 animate-pulse">
          <Dumbbell className="w-8 h-8 text-amber-500/60" />
          <p className="text-sm font-medium">Cargando detalle del ejercicio...</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="max-w-sm text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Ejercicio no encontrado</h2>
          <p className="text-xs text-neutral-400">
            No se pudo recuperar la información del ejercicio solicitado.
          </p>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="min-h-[48px]">
              Volver al catálogo
            </Button>
          )}
        </div>
      </div>
    );
  }

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    exercise.name
  )}`;

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col ${className}`}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Volver"
                className="p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center border border-neutral-700/60"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight line-clamp-1">
                {exercise.name}
              </h1>
              <p className="text-xs text-neutral-400 font-medium">
                Metadatos Biomecánicos y Guía Técnica
              </p>
            </div>
          </div>

          <Badge variant={getPatternBadgeVariant(exercise.movement_pattern)} size="sm">
            {getPatternLabel(exercise.movement_pattern)}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col gap-5">
        {/* Video Player or Fallback Card (RF-09, CA-09.3, CL-14) */}
        <section className="overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl">
          {showVideo ? (
            <div className="relative w-full aspect-video bg-black">
              <iframe
                title={`Demostración de ${exercise.name}`}
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&mute=1&loop=1&playlist=${youtubeId}&controls=1&modestbranding=1&rel=0`}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => setHasVideoError(true)}
              />
            </div>
          ) : (
            <div
              data-testid="video-fallback-card"
              className="p-6 sm:p-8 flex flex-col items-center text-center gap-4 bg-gradient-to-b from-neutral-900 to-neutral-950"
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-800/90 border border-neutral-700 flex items-center justify-center text-amber-400 shadow-lg">
                <VideoOff className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-bold text-white">Video no disponible</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  No se pudo cargar la demostración en video para <strong className="text-neutral-200">{exercise.name}</strong>. Podés realizar el movimiento siguiendo las instrucciones biomecánicas o buscar demostraciones alternativas.
                </p>
              </div>

              <a
                href={youtubeSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 text-red-300 hover:text-white text-xs font-semibold transition-all min-h-[48px] shadow-sm"
              >
                <Play className="w-4 h-4 text-red-400" />
                <span>Buscar demostración en YouTube</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          )}
        </section>

        {/* Biomechanical Details Card */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-3">
            <Activity className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Análisis Biomecánico
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium block">Patrón Biomecánico</span>
              <span className="font-semibold text-white capitalize">{getPatternLabel(exercise.movement_pattern)}</span>
            </div>

            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium block">Músculo Primario</span>
              <span className="font-semibold text-emerald-400 capitalize">{exercise.primary_muscle}</span>
            </div>

            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-1">
              <span className="text-[11px] text-neutral-400 font-medium block">Tipo de Ejercicio</span>
              <span className="font-semibold text-white">
                {exercise.is_compound ? 'Compuesto (Multiarticular)' : 'Monoarticular'}
              </span>
            </div>

            {exercise.initial_load_ratio && (
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-1">
                <span className="text-[11px] text-neutral-400 font-medium block">Ratio de Carga Inicial</span>
                <span className="font-mono font-semibold text-amber-400">
                  {Math.round(exercise.initial_load_ratio * 100)}% de referencia
                </span>
              </div>
            )}
          </div>

          {/* Secondary Muscles */}
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-xs text-neutral-400 font-medium block">
                Músculos Secundarios / Sinérgicos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary_muscles.map((muscle) => (
                  <Badge key={muscle} variant="default" size="sm" className="capitalize">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Step-by-step Technical Instructions */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-3">
            <FileText className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Instrucciones Técnicas de Ejecución
            </h2>
          </div>

          <div className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line space-y-2 bg-neutral-950/40 p-4 rounded-2xl border border-neutral-800/60">
            {exercise.instructions || 'Instrucciones no detalladas. Mantener postura neutral y control de tempo en fase excéntrica.'}
          </div>
        </section>
      </main>
    </div>
  );
};
