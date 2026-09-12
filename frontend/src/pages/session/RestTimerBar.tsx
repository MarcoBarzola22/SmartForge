import React, { useState, useEffect, useRef } from 'react';
import { cn } from 'cn';
import { Timer, ArrowRight, Plus, Minus, BellOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';

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
    // Si el atleta pulsa siguiente serie antes de agotar el tiempo:
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

  return (
    <div
      data-testid="rest-timer-bar"
      role="region"
      aria-label="Temporizador de descanso"
      className={cn(
        'w-full max-w-[390px] mx-auto p-4 rounded-2xl bg-surface-1 border transition-all duration-300 shadow-lg flex flex-col gap-3 select-none',
        isFinished
          ? 'border-status-success bg-status-success/5 shadow-status-success/10'
          : 'border-border-interactive/60',
        className
      )}
      {...props}
    >
      {/* Cabecera y Display de 32px */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-content-secondary">
          <Timer className={cn('w-5 h-5', isFinished ? 'text-status-success' : 'text-brand-primary')} />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {isFinished ? 'Descanso finalizado' : 'Tiempo de descanso'}
          </span>
        </div>

        {/* Ajustes rápidos de tiempo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Restar 15 segundos"
            onClick={() => handleAdjustTime(-15)}
            className="touch-target min-h-[48px] min-w-[48px] h-10 w-10 flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 text-content-secondary hover:text-content-primary text-xs font-bold transition-all"
          >
            -15
          </button>
          <button
            type="button"
            aria-label="Añadir 30 segundos"
            onClick={() => handleAdjustTime(30)}
            className="touch-target min-h-[48px] min-w-[48px] h-10 w-10 flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 text-content-secondary hover:text-content-primary text-xs font-bold transition-all"
          >
            +30
          </button>
        </div>
      </div>

      {/* Contador con Display 32px bold (DM Sans / Monoespaciado) */}
      <div className="flex items-center justify-center py-2">
        <span
          data-testid="timer-display"
          className={cn(
            'text-[32px] leading-none font-bold font-mono tracking-tight transition-colors',
            isFinished ? 'text-status-success animate-pulse' : 'text-content-primary'
          )}
        >
          {formatTime(secondsRemaining)}
        </span>
      </div>

      {/* Botón grande "Siguiente serie" de altura mínima >= 48px */}
      <div className="pt-1">
        <Button
          type="button"
          variant={isFinished ? 'primary' : 'secondary'}
          fullWidth
          onClick={handleNextSetEarly}
          className="min-h-[48px] touch-target text-sm font-semibold flex items-center justify-center gap-2"
        >
          <span>Siguiente serie</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Button>
      </div>
    </div>
  );
};

export default RestTimerBar;
