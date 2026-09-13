import React from 'react';
import { cn } from 'cn';

export interface SegmentedSubNavItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedSubNavProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: SegmentedSubNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SegmentedSubNav: React.FC<SegmentedSubNavProps> = ({
  items,
  activeId,
  onChange,
  className = '',
  ...props
}) => {
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    if (items.length === 0) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % items.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    }

    const nextItem = items[nextIndex];
    if (nextIndex !== currentIndex && nextItem && !nextItem.disabled) {
      onChange(nextItem.id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Sub-navegación interna"
      className={cn(
        'w-full max-w-[390px] mx-auto bg-surface-2 p-1 rounded-2xl flex items-center gap-1 border border-border-subtle select-none shrink-0',
        className
      )}
      {...props}
    >
      {items.map((item, index) => {
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            id={`subtab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`subpanel-${item.id}`}
            aria-disabled={item.disabled}
            disabled={item.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'flex-1 min-w-0 touch-target min-h-[48px] h-12 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-center text-center outline-none focus-visible:ring-2 focus-visible:ring-brand-focus select-none',
              isActive
                ? 'bg-surface-1 text-brand-primary font-bold shadow-sm border border-border-interactive/30'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-3/50',
              item.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span className="truncate w-full">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
