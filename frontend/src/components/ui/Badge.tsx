import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'brand' | 'neon' | 'surface' | 'fatigue';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-surface-2 text-content-2 border-border-subtle',
    surface: 'bg-surface-2 text-content-2 border-border-subtle',
    success: 'bg-success/15 text-success border-success/30 shadow-lg shadow-success/20 font-bold',
    warning: 'bg-amber/15 text-amber border-amber/30 font-bold',
    amber: 'bg-amber/15 text-amber border-amber/30 font-bold',
    danger: 'bg-fatigue/15 text-fatigue-text border-fatigue/30 font-bold',
    fatigue: 'bg-fatigue/15 text-fatigue-text border-fatigue/30 font-bold',
    info: 'bg-brand/15 text-brand-focus border-brand/30 font-semibold',
    brand: 'bg-brand/15 text-brand-focus border-brand/30 font-bold',
    neon: 'bg-neon/15 text-neon border-neon/30 shadow-lg shadow-neon/20 font-bold'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border shadow-sm select-none ${variantClasses[variant] || variantClasses.default} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
