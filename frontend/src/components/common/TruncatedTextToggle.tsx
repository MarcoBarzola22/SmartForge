import React, { useState, useRef } from 'react';
import { cn } from 'cn';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface TruncatedTextToggleProps extends React.HTMLAttributes<HTMLButtonElement> {
  text: string;
  maxLines?: 1 | 2;
  className?: string;
  showIcon?: boolean;
}

export const TruncatedTextToggle: React.FC<TruncatedTextToggleProps> = ({
  text,
  maxLines = 1,
  className = '',
  showIcon = false,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    // Si se expande, ejecutar auto-scroll suave para evitar que controles salgan de la vista (RF-15)
    if (nextState && containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  };

  const lineClampClass = maxLines === 1 ? 'line-clamp-1 truncate' : 'line-clamp-2';

  return (
    <button
      ref={containerRef}
      type="button"
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Contraer texto' : 'Expandir texto completo'}
      onClick={handleToggle}
      className={cn(
        'w-full text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-focus rounded-lg cursor-pointer select-none group',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-1.5 w-full">
        <span
          className={cn(
            'flex-1 min-w-0 transition-all duration-150 leading-snug',
            !isExpanded && lineClampClass
          )}
        >
          {text}
        </span>

        {showIcon && (
          <span className="shrink-0 pt-0.5 text-content-secondary group-hover:text-content-primary transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </div>
    </button>
  );
};

export default TruncatedTextToggle;
