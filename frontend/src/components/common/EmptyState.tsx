import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '../ui/Button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'w-full max-w-[360px] mx-auto flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-surface-1/60 border border-border-subtle/60 gap-3 my-auto',
        className
      )}
      {...props}
    >
      <div className="size-14 rounded-full bg-surface-2 flex items-center justify-center text-content-secondary shrink-0 mb-1">
        {icon || <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>

      <div className="flex flex-col gap-1 max-w-[280px]">
        <h3 className="text-base font-bold text-content-primary leading-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs font-medium text-content-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {children}

      {actionLabel && onAction && (
        <div className="mt-2 w-full flex justify-center">
          <Button
            variant="primary"
            onClick={onAction}
            className="min-h-[48px] touch-target"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
