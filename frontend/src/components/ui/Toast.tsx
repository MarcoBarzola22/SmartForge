import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'warning' | 'danger' | 'error' | 'info';
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  className = ''
}) => {
  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />
  };

  const styleMap = {
    success: 'bg-emerald-950/95 border-emerald-800 text-emerald-200',
    warning: 'bg-amber-950/95 border-amber-800 text-amber-200',
    danger: 'bg-red-950/95 border-red-800 text-red-200',
    error: 'bg-red-950/95 border-red-800 text-red-200',
    info: 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
  };

  return (
    <div
      role={type === 'error' || type === 'danger' ? 'alert' : 'status'}
      aria-live="polite"
      className={`w-full max-w-[360px] mx-auto rounded-xl border p-3.5 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 ${styleMap[type]} ${className}`}
    >
      <div className="flex items-center gap-3">
        {iconMap[type]}
        <p className="text-xs font-semibold leading-snug">{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          aria-label="Cerrar notificación"
          onClick={onClose}
          className="touch-target min-h-[48px] min-w-[48px] inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-black/30 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
