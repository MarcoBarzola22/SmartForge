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
  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'fixed bottom-0 left-0 right-0 w-full z-50 max-w-[390px] mx-auto h-16 min-h-[64px] pb-[env(safe-area-inset-bottom)] bg-surface-1 border-t border-border-subtle select-none shadow-lg px-2 flex items-center shrink-0',
        className
      )}
    >
      <div
        role="tablist"
        aria-label="Pestañas principales"
        className="grid grid-cols-4 items-center justify-around gap-1 w-full h-full"
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
                'touch-target min-h-[48px] min-w-[48px] h-12 w-full flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus relative shrink-0',
                isActive
                  ? 'text-brand-primary font-bold bg-brand-primary/10 shadow-sm'
                  : 'text-content-secondary hover:text-content-primary hover:bg-surface-2 font-medium'
              )}
            >
              <div className="relative flex items-center justify-center">
                <IconComponent
                  className={cn(
                    'w-6 h-6 transition-transform duration-150 shrink-0',
                    isActive ? 'scale-110 text-brand-primary' : 'text-content-secondary'
                  )}
                />

                {isSessionTab && hasActiveSession && (
                  <span
                    data-testid="active-session-dot"
                    className="absolute -top-1 -right-1 size-2.5 bg-brand-primary rounded-full ring-2 ring-surface-1 animate-pulse"
                  />
                )}
              </div>

              <span className="text-xs leading-none tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
