import React, { useState, useEffect } from 'react';
import { MobileLayout } from './components/layout/MobileLayout';
import { BottomNav, NavTabId } from './components/navigation/BottomNav';
import { useAuth } from './hooks/useAuth';
import { useOfflineSync } from './hooks/useOfflineSync';
import { offlineStore } from './stores/offlineStore';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { MesocyclePage } from './pages/mesocycle/MesocyclePage';
import { RoutineEditorPage } from './pages/routine/RoutineEditorPage';
import { SessionPage } from './pages/session/SessionPage';
import { CheckInModal } from './pages/session/CheckInModal';
import { ExerciseCatalogPage } from './pages/catalog/ExerciseCatalogPage';
import { ExerciseDetailPage } from './pages/catalog/ExerciseDetailPage';
import { apiClient } from './api/client';

import type {
  Exercise,
  SessionPlan,
  TrainingSession
} from './api';

import { Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Sub-view types for in-tab navigation (no react-router needed)
// ---------------------------------------------------------------------------

interface RoutineEditorSubView {
  kind: 'routineEditor';
  sessionPlanId: string;
  sessionPlan?: SessionPlan | null;
}

interface ActiveSessionSubView {
  kind: 'activeSession';
  session: TrainingSession;
  sessionPlan: SessionPlan;
}

interface ExerciseDetailSubView {
  kind: 'exerciseDetail';
  exercise?: Exercise;
  exerciseId?: string;
}

type SubView = RoutineEditorSubView | ActiveSessionSubView | ExerciseDetailSubView | null;

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export const App: React.FC = () => {
  const {
    isAuthenticated,
    isProfileComplete,
    isLoading: authLoading,
    user,
    restoreSession
  } = useAuth();

  const { isOnline } = useOfflineSync();

  const [activeTab, setActiveTab] = useState<NavTabId>('routine');
  const [subView, setSubView] = useState<SubView>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [activeSession, setActiveSession] = useState<{
    session: TrainingSession;
    sessionPlan: SessionPlan;
  } | null>(null);

  // Restore active in-progress session on initial mount (T-91, RF-04, RNF-03)
  useEffect(() => {
    offlineStore.getActiveSession().then((active) => {
      if (active && active.session?.status === 'in_progress' && active.sessionPlan) {
        setActiveSession(active);
      }
    });
  }, []);

  // ---- Auth loading splash ----
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando SmartForge…</p>
        </div>
      </div>
    );
  }

  // ---- Not authenticated → Login ----
  if (!isAuthenticated) {
    return (
      <LoginPage
        onNavigateToApp={() => restoreSession()}
        onNavigateToOnboarding={() => restoreSession()}
      />
    );
  }

  // ---- Authenticated but profile not created → Onboarding ----
  if (!isProfileComplete) {
    return (
      <ProfilePage
        mode="create"
        onProfileCreated={() => restoreSession()}
      />
    );
  }

  // ---- Helpers for cross-tab navigation ----

  const handleStartSession = async (sessionPlanId: string) => {
    setShowCheckIn(false);

    try {
      const session = await apiClient.sessions.start(sessionPlanId);

      // We need the sessionPlan details — fetch the current mesocycle to find it
      const mesocycle = await apiClient.mesocycles.getCurrent();
      let targetPlan: SessionPlan | undefined;

      for (const week of mesocycle.weeks) {
        for (const sp of week.sessions) {
          if (sp.id === sessionPlanId) {
            targetPlan = sp;
            break;
          }
        }
        if (targetPlan) break;
      }

      if (!targetPlan) {
        console.error('Session plan not found in mesocycle');
        return;
      }

      const activeData = { session, sessionPlan: targetPlan };
      setActiveSession(activeData);
      await offlineStore.saveActiveSession(session, targetPlan);

      // Show check-in modal first (it's mandatory per RF-04)
      setSubView({
        kind: 'activeSession',
        session,
        sessionPlan: targetPlan
      });
      setActiveTab('session');
      setShowCheckIn(true);
    } catch (err) {
      console.error('Error starting session:', err);
    }
  };

  const handleNavigateToRoutineEditor = (sessionPlanId: string) => {
    setSubView({ kind: 'routineEditor', sessionPlanId });
    setActiveTab('routine');
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setSubView({ kind: 'exerciseDetail', exercise });
  };

  const handleBackFromSubView = () => {
    setSubView(null);
  };

  const handleTabChange = (tab: NavTabId) => {
    // Clear non-session sub-views when switching tabs
    if (subView?.kind !== 'activeSession') {
      setSubView(null);
    }
    setShowCheckIn(false);
    setActiveTab(tab);
  };

  const handleFinishSession = () => {
    setActiveSession(null);
    setSubView(null);
    setActiveTab('routine');
  };

  // ---- Tab metadata ----

  const getTabMeta = (): { title: string; subtitle: string } => {
    if (subView && activeTab === 'session' && subView.kind === 'activeSession') {
      return { title: 'Sesión Activa', subtitle: 'Registro en vivo' };
    }
    if (subView && subView.kind !== 'activeSession') {
      switch (subView.kind) {
        case 'routineEditor':
          return { title: 'Editor de Rutina', subtitle: 'Revisar y modificar ejercicios' };
        case 'exerciseDetail':
          return {
            title: subView.exercise?.name ?? 'Detalle',
            subtitle: 'Ejercicio del catálogo'
          };
      }
    }

    const currentActive = activeSession || (subView?.kind === 'activeSession' ? subView : null);
    const defaults: Record<NavTabId, { title: string; subtitle: string }> = {
      routine: { title: 'Rutina', subtitle: 'Mesociclo Activo' },
      session: { title: 'Sesión', subtitle: currentActive ? 'Registro en Vivo' : 'Sin Sesión' },
      catalog: { title: 'Catálogo', subtitle: 'Biblioteca de Ejercicios' },
      profile: { title: 'Perfil', subtitle: 'Ajustes del Atleta' }
    };
    return defaults[activeTab];
  };

  const meta = getTabMeta();

  // ---- Has an active session in sub-view? ----
  const hasActiveSession = ((subView?.kind === 'activeSession') || !!activeSession) && activeTab === 'session';

  // ---- Render the active content ----

  const renderContent = () => {
    // Sub-views take precedence
    if (subView) {
      switch (subView.kind) {
        case 'routineEditor':
          return (
            <RoutineEditorPage
              sessionId={subView.sessionPlanId}
              sessionPlan={subView.sessionPlan}
              onBack={handleBackFromSubView}
              onStartSession={handleStartSession}
            />
          );

        case 'activeSession':
          if (activeTab === 'session') {
            return (
              <>
                <SessionPage
                  session={subView.session}
                  sessionPlan={subView.sessionPlan}
                  onFinishSession={handleFinishSession}
                  onBack={handleBackFromSubView}
                />
                {showCheckIn && (
                  <CheckInModal
                    isOpen={showCheckIn}
                    sessionId={subView.session.id}
                    onClose={() => setShowCheckIn(false)}
                    onCheckInSuccess={() => setShowCheckIn(false)}
                  />
                )}
              </>
            );
          }
          break;

        case 'exerciseDetail':
          return (
            <ExerciseDetailPage
              exercise={subView.exercise}
              exerciseId={subView.exerciseId}
              onBack={handleBackFromSubView}
            />
          );
      }
    }

    // Main tab content
    switch (activeTab) {
      case 'routine':
        return (
          <MesocyclePage
            onStartSession={handleStartSession}
            onNavigateToRoutineEditor={handleNavigateToRoutineEditor}
          />
        );

      case 'session': {
        const active = activeSession || (subView?.kind === 'activeSession' ? subView : null);
        if (active && active.sessionPlan) {
          return (
            <SessionPage
              session={active.session}
              sessionPlan={active.sessionPlan}
              onFinishSession={handleFinishSession}
              onBack={handleBackFromSubView}
            />
          );
        }

        // No active session → show prompt to start one from the routine tab
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Sin sesión activa</h2>
              <p className="text-sm text-zinc-400 max-w-[300px] mx-auto leading-relaxed">
                Andá a la pestaña <strong className="text-amber-400">Rutina</strong> y elegí una sesión para empezar a entrenar.
              </p>
            </div>
          </div>
        );
      }

      case 'catalog':
        return (
          <ExerciseCatalogPage
            onSelectExercise={handleSelectExercise}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            mode="edit"
            initialProfile={user}
            onProfileUpdated={() => restoreSession()}
          />
        );

      default:
        return null;
    }
  };

  return (
    <MobileLayout
      title={meta.title}
      subtitle={meta.subtitle}
      isOnline={isOnline}
      footer={
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasActiveSession={hasActiveSession}
        />
      }
    >
      {renderContent()}
    </MobileLayout>
  );
};

export default App;
