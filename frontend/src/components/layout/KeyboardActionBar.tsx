import React from 'react';
import { cn } from 'cn';
import { Button } from '../ui/Button';

export interface KeyboardActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onSave?: () => void;
  onCancel?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  className?: string;
}

export const KeyboardActionBar: React.FC<KeyboardActionBarProps> = ({
  onSave,
  onCancel,
  primaryLabel = 'Guardar',
  secondaryLabel = 'Cancelar',
  isSubmitting = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div
      role="toolbar"
      aria-label="Acciones sobre el teclado"
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 w-full max-w-[390px] mx-auto h-16 min-h-[64px] bg-surface-1 border-t border-border-interactive px-4 flex items-center justify-between gap-3 shadow-lg select-none',
        className
      )}
      {...props}
    >
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 min-w-0 min-h-[48px] touch-target truncate"
        >
          {secondaryLabel}
        </Button>
      )}

      {onSave && (
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          isLoading={isSubmitting}
          disabled={disabled || isSubmitting}
          className="flex-1 min-w-0 min-h-[48px] touch-target truncate"
        >
          {primaryLabel}
        </Button>
      )}
    </div>
  );
};
