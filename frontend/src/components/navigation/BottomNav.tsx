import React from 'react';
import { Calendar, PlayCircle, BookOpen, User } from 'lucide-react';
import { cn } from 'cn';

export type NavTabId = 'routine' | 'session' | 'catalog' | 'profile';

export interface NavItemConfig {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface BottomNavProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  hasActiveSession?: boolean;
  className?: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'routine',
    label: 'Rutina',
    icon: Calendar
  },
  {
    id: 'session',
    label: 'Sesión',
    icon: PlayCircle
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    icon: BookOpen
  },
  {
    id: 'profile',
    label: 'Perfil',
    icon: User
  }
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  hasActiveSession = false,
  className = ''
}) => {
  const activeIndex = NAV_ITEMS.findIndex((item) => item.id === activeTab);
  const leftPosition = activeIndex >= 0 ? `${(activeIndex * 100) / NAV_ITEMS.length}%` : '0%';

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'glass bg-surface-1/90 fixed bottom-0 left-0 right-0 w-full z-50 max-w-[390px] mx-auto h-16 min-h-[64px] border-t border-border-subtle px-2 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] select-none shadow-lg relative grid grid-cols-4 items-center shrink-0',
        className
      )}
    >
      <span
        data-testid="bottom-nav-indicator"
        className="absolute top-0 h-0.5 w-1/4 bg-brand shadow-lg shadow-brand/50 transition-all duration-200"
        style={{ left: leftPosition }}
      />
      <div
        role="tablist"
        aria-label="Pestañas principales"
        className="contents"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;
          const isSessionTab = item.id === 'session';

          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              aria-label={item.label}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'press touch-target min-h-[48px] min-w-[48px] min-h-12 w-full flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 relative shrink-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus',
                isActive
                  ? 'text-brand-primary font-bold'
                  : 'text-content-3 text-content-secondary hover:text-content-primary hover:bg-surface-2 font-medium'
              )}
            >
              <div className="relative flex items-center justify-center">
                <IconComponent
                  className={cn(
                    'w-5 h-5 transition-transform duration-200 shrink-0',
                    isActive ? 'scale-110 text-brand-focus' : 'text-content-3'
                  )}
                />

                {isSessionTab && hasActiveSession && (
                  <span
                    data-testid="active-session-dot"
                    className="absolute -top-1 -right-1 size-2 bg-brand rounded-full ring-2 ring-surface-1 animate-pulse"
                  />
                )}
              </div>

              <span className="text-[11px] leading-none tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
