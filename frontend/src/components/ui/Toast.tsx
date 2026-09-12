import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from 'cn';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  title?: string;
  type?: 'success' | 'warning' | 'danger' | 'error' | 'info';
  onClose?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ToastAction;
  isFloating?: boolean;
  autoDismiss?: boolean;
  duration?: number;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  title,
  type = 'info',
  onClose,
  onRetry,
  retryLabel,
  action,
  isFloating = false,
  autoDismiss = false,
  duration = 4000,
  className = '',
  ...props
}) => {
  React.useEffect(() => {
    if (!autoDismiss || !onClose) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [autoDismiss, duration, onClose]);

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-status-success shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-status-warning shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-status-error-text shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-status-error-text shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-primary shrink-0" />
  };

  const styleMap = {
    success: 'bg-surface-1 border-status-success/40 text-content-primary',
    warning: 'bg-surface-1 border-status-warning/50 text-content-primary',
    danger: 'bg-surface-1 border-status-error-bg/60 text-content-primary',
    error: 'bg-surface-1 border-status-error-bg/60 text-content-primary',
    info: 'bg-surface-1 border-border-interactive text-content-primary'
  };

  const retryHandler = action?.onClick || onRetry;
  const actionText = action?.label || retryLabel || 'Reintentar';

  return (
    <div
      role={type === 'error' || type === 'danger' ? 'alert' : 'status'}
      aria-live="polite"
      className={cn(
        "w-full max-w-[360px] mx-auto rounded-xl border p-3.5 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 pointer-events-auto",
        styleMap[type],
        isFloating && "fixed bottom-[76px] inset-x-0 z-50 w-[calc(100%-32px)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {iconMap[type]}
        <div className="flex flex-col text-left overflow-hidden">
          {title && (
            <span className="text-xs font-bold text-content-primary truncate">
              {title}
            </span>
          )}
          <p className="text-xs font-semibold leading-snug break-words">
            {message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {retryHandler && (
          <button
            type="button"
            onClick={retryHandler}
            className="touch-target min-h-[48px] px-3 py-2 text-xs font-bold rounded-lg shrink-0 bg-surface-2 hover:bg-surface-2/80 text-brand-primary border border-brand-primary/40 transition-colors focus-visible:ring-2 focus-visible:ring-brand-focus select-none"
          >
            {actionText}
          </button>
        )}

        {onClose && (
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={onClose}
            className="touch-target min-h-[48px] min-w-[48px] inline-flex items-center justify-center p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-2 transition-colors select-none shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export interface ToastContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const ToastContainer = React.forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="toast-container"
        data-testid="toast-container"
        className={cn(
          "fixed bottom-[76px] inset-x-0 z-50 pointer-events-none flex flex-col items-center gap-2 px-4 w-full max-w-[390px] mx-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ToastContainer.displayName = "ToastContainer";
