import React from 'react';
import { Calendar, PlayCircle, BookOpen, User } from 'lucide-react';

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
      className={`w-full bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1 select-none shadow-lg ${className}`}
    >
      <div
        role="tablist"
        aria-label="Pestañas principales"
        className="grid grid-cols-4 items-center justify-around gap-1 w-full"
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
              className={`touch-target min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/40 relative ${
                isActive
                  ? 'text-amber-500 font-bold bg-amber-500/10 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 font-medium'
              }`}
            >
              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110' : ''
                  }`}
                />

                {isSessionTab && hasActiveSession && (
                  <span
                    data-testid="active-session-dot"
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-zinc-900 animate-pulse"
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
