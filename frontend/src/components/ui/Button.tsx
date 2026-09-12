import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  iconLeft,
  iconRight,
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none touch-target min-h-[48px]';

  const variantClasses = {
    primary:
      'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-500/10 active:bg-amber-600',
    secondary:
      'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 shadow-sm active:bg-zinc-850',
    outline:
      'bg-transparent hover:bg-zinc-900 text-amber-400 border border-amber-500/40 hover:border-amber-500 active:bg-amber-950/20',
    danger:
      'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/10 active:bg-red-700',
    ghost:
      'bg-transparent hover:bg-zinc-800/60 text-zinc-300 hover:text-white active:bg-zinc-800'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs min-h-[48px] min-w-[48px]',
    md: 'px-4 py-2.5 text-sm min-h-[48px] min-w-[48px]',
    lg: 'px-6 py-3.5 text-base min-h-[52px] min-w-[48px]',
    icon: 'p-3 min-h-[48px] min-w-[48px] rounded-xl'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span
          data-testid="loading-spinner"
          className="inline-flex items-center gap-2"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          {children && <span>{children}</span>}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          {iconLeft && <span className="shrink-0">{iconLeft}</span>}
          {children && <span>{children}</span>}
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </span>
      )}
    </button>
  );
};
