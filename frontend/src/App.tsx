import React, { useState } from 'react';
import { MobileLayout } from './components/layout/MobileLayout';
import { BottomNav, NavTabId } from './components/navigation/BottomNav';
import { ShieldCheck, Zap, Calendar, PlayCircle, BookOpen, User } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('routine');

  const tabTitles: Record<NavTabId, { title: string; subtitle: string }> = {
    routine: { title: 'Rutina', subtitle: 'Mesociclo Activo' },
    session: { title: 'Sesión', subtitle: 'Registro en Vivo' },
    catalog: { title: 'Catálogo', subtitle: 'Biblioteca de Ejercicios' },
    profile: { title: 'Perfil', subtitle: 'Ajustes del Atleta' }
  };

  const currentMeta = tabTitles[activeTab];

  return (
    <MobileLayout
      title={currentMeta.title}
      subtitle={currentMeta.subtitle}
      isOnline={true}
      footer={
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasActiveSession={activeTab === 'session'}
        />
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-2 space-y-6">
        {activeTab === 'routine' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
              <Calendar className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Rutina del Día
              </h2>
              <p className="text-sm text-zinc-400 max-w-[320px] mx-auto leading-relaxed">
                Visualizá tus ejercicios asignados, series objetivo y alternativas disponibles.
              </p>
            </div>
          </>
        )}

        {activeTab === 'session' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5 animate-pulse">
              <PlayCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Sesión de Entrenamiento
              </h2>
              <p className="text-sm text-zinc-400 max-w-[320px] mx-auto leading-relaxed">
                Completá el check-in pre-sesión y registrá cada serie en ≤ 4 toques.
              </p>
            </div>
          </>
        )}

        {activeTab === 'catalog' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
              <BookOpen className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Catálogo de Ejercicios
              </h2>
              <p className="text-sm text-zinc-400 max-w-[320px] mx-auto leading-relaxed">
                Explorá más de 200 ejercicios con demostraciones en video y variantes seguras.
              </p>
            </div>
          </>
        )}

        {activeTab === 'profile' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
              <User className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Perfil del Atleta
              </h2>
              <p className="text-sm text-zinc-400 max-w-[320px] mx-auto leading-relaxed">
                Gestioná tu nivel de experiencia, objetivo y equipamiento disponible.
              </p>
            </div>
          </>
        )}

        <div className="w-full space-y-3 pt-4">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">Mobile-First ≤ 390px</div>
              <div className="text-[11px] text-zinc-400">Touch targets ≥ 48px y cero scroll horizontal</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">Modo Offline Resiliente</div>
              <div className="text-[11px] text-zinc-400">Sincronización Last-Write-Wins en reconexión</div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default App;
