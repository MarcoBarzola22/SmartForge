import React, { useState, useEffect, useRef } from 'react';
import { cn } from 'cn';

export interface RestTimerBarProps extends React.HTMLAttributes<HTMLDivElement> {
  initialSeconds?: number;
  onFinish?: () => void;
  onNextSet?: () => void;
  onCancelNotification?: () => void;
  className?: string;
}

export const RestTimerBar: React.FC<RestTimerBarProps> = ({
  initialSeconds = 90,
  onFinish,
  onNextSet,
  onCancelNotification,
  className = '',
  ...props
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isFinished, setIsFinished] = useState<boolean>(initialSeconds <= 0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    setSecondsRemaining(initialSeconds);
    setIsFinished(initialSeconds <= 0);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      if (!isFinished) {
        setIsFinished(true);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        onFinishRef.current?.();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, isFinished]);

  const handleNextSetEarly = () => {
    // Si el atleta pulsa siguiente serie / saltar antes de agotar el tiempo:
    // 1. Detener a 0
    setSecondsRemaining(0);
    setIsFinished(true);
    // 2. Cancelar formalmente las notificaciones web pendientes
    onCancelNotification?.();
    // 3. Notificar siguiente serie
    onNextSet?.();
  };

  const handleAdjustTime = (delta: number) => {
    setSecondsRemaining((prev) => Math.max(0, prev + delta));
    if (secondsRemaining + delta > 0) {
      setIsFinished(false);
    }
  };

  // Formato MM:SS
  const formatTime = (totalSec: number): string => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = initialSeconds > 0 ? initialSeconds : 90;
  const progressRatio = Math.min(100, Math.max(0, (secondsRemaining / totalTime) * 100));

  return (
    <div
      data-testid="rest-timer-bar"
      role="region"
      aria-label="Temporizador de descanso"
      className={cn(
        'glass animate-in slide-in-from-bottom-4 duration-200 border-t border-white/5 px-4 py-3 w-full max-w-[390px] mx-auto rounded-2xl border select-none transition-all shadow-xl',
        isFinished
          ? 'border-status-success bg-status-success/10 shadow-status-success/20'
          : 'border-line/40 bg-surface-1/90',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {/* Visualizador de tiempo regresivo */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-content-2">
            {isFinished ? 'Descanso finalizado' : 'Descanso'}
          </p>
          <p
            data-testid="timer-display"
            className={cn(
              'font-mono text-3xl font-bold leading-none tracking-tight transition-colors',
              isFinished ? 'text-status-success animate-pulse' : 'text-content'
            )}
          >
            {formatTime(secondsRemaining)}
          </p>
        </div>

        {/* Botones de ajuste de tiempo: -15s y +30s */}
        <button
          type="button"
          aria-label="Restar 15 segundos"
          onClick={() => handleAdjustTime(-15)}
          className="press min-h-12 min-w-12 rounded-xl bg-surface-2 px-2.5 font-mono text-xs font-bold text-content touch-target shrink-0 flex items-center justify-center border border-line"
        >
          -15s
        </button>

        <button
          type="button"
          aria-label="Añadir 30 segundos"
          onClick={() => handleAdjustTime(30)}
          className="press min-h-12 min-w-12 rounded-xl bg-surface-2 px-3 font-mono text-sm font-bold text-content touch-target shrink-0 flex items-center justify-center border border-line"
        >
          +30s
        </button>

        {/* Botón Saltar / Siguiente serie */}
        <button
          type="button"
          aria-label="Siguiente serie"
          onClick={handleNextSetEarly}
          className="press min-h-12 rounded-xl bg-amber px-4 text-sm font-bold text-ink shadow-lg shadow-amber/30 touch-target shrink-0 flex items-center justify-center font-sans"
        >
          Saltar
        </button>
      </div>

      {/* Barra de progreso inferior en ámbar */}
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isFinished ? 'bg-status-success' : 'bg-amber'
          )}
          style={{ width: `${progressRatio}%` }}
        />
      </div>
    </div>
  );
};

export default RestTimerBar;
