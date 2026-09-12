import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from 'cn';

export interface CentralizedSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CentralizedSpinner: React.FC<CentralizedSpinnerProps> = ({
  message = 'Cargando…',
  fullScreen = true,
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'w-full flex flex-col items-center justify-center p-6 text-center gap-3',
        fullScreen ? 'min-h-[50vh] flex-1' : 'min-h-[160px]',
        className
      )}
      {...props}
    >
      <Loader2
        className={cn(
          'animate-spin text-brand-primary shrink-0',
          sizeMap[size]
        )}
        aria-hidden="true"
      />
      {message && (
        <p className="text-xs font-semibold text-content-secondary tracking-wide select-none">
          {message}
        </p>
      )}
    </div>
  );
};
