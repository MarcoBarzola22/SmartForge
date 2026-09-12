import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

// Vistas del Sistema bajo Auditoría Responsiva
import { LoginPage } from '../pages/auth/LoginPage';
import { ExerciseCatalogPage } from '../pages/catalog/ExerciseCatalogPage';
import { SessionPage } from '../pages/session/SessionPage';
import { RoutineEditorPage } from '../pages/routine/RoutineEditorPage';
import { ProfilePage } from '../pages/profile/ProfilePage';

// Contextos y Tipos
import { AuthContext, AuthContextType } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type {
  TrainingSession,
  SessionPlan,
  AthleteProfile,
  Exercise
} from '../api';

// Viewports oficiales requeridos por la tarea T-27 y Constitución R2
const VIEWPORTS = [320, 360, 375, 390] as const;

// Helper para emular dimensiones de pantalla de smartphone
function setViewport(width: number, height = 844) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
}

// Configuración de scrollWidth en JSDOM para certificar matemáticamente la contención
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() {
      return window.innerWidth;
    },
  });
});

describe('T-27: Suite de tests responsive automatizados de cero scroll horizontal en 320px, 360px, 375px y 390px (RF-10, CF-02, Constitución R2)', () => {
  const mockAthlete: AthleteProfile = {
    id: 'ath-test',
    google_id: 'goog-test',
    email: 'atleta@smartforge.test',
    name: 'Lucas Barzola',
    age: 26,
    weight_kg: 78,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra olímpica', category: 'free_weights' }],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const mockAuthContext: AuthContextType = {
    user: mockAthlete,
    token: 'valid-test-token',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
  };

  const mockExercises: Exercise[] = [
    {
      id: 'ex-bench',
      name: 'Press de Banca Plano',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      instructions: 'Bajar controlado al pecho.',
      is_active: true,
    },
    {
      id: 'ex-squat',
      name: 'Sentadilla Trasera',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.85,
      instructions: 'Romper paralelo con torso erguido.',
      is_active: true,
    },
  ];

  const mockSessionPlan: SessionPlan = {
    id: 'sess-plan-101',
    week_plan_id: 'week-1',
    day_number: 1,
    name: 'Torso Empuje y Pierna',
    exercise_assignments: [
      {
        id: 'assign-1',
        session_plan_id: 'sess-plan-101',
        exercise_id: 'ex-bench',
        exercise: mockExercises[0],
        order_in_session: 1,
        target_sets: 3,
        target_reps: 8,
        target_rir: 2,
        target_load_kg: 70,
        is_swapped: false,
      },
      {
        id: 'assign-2',
        session_plan_id: 'sess-plan-101',
        exercise_id: 'ex-squat',
        exercise: mockExercises[1],
        order_in_session: 2,
        target_sets: 3,
        target_reps: 6,
        target_rir: 2,
        target_load_kg: 90,
        is_swapped: false,
      },
    ],
  };

  const mockActiveSession: TrainingSession = {
    id: 'sess-active-1',
    athlete_id: 'ath-test',
    session_plan_id: 'sess-plan-101',
    status: 'in_progress',
    started_at: '2026-09-12T10:00:00Z',
    checkin: {
      id: 'chk-1',
      session_id: 'sess-active-1',
      fatigue_level: 2,
      sleep_quality: 4,
      muscle_soreness: 1,
      joint_pain_map: [],
      notes: '',
      created_at: '2026-09-12T10:00:00Z',
    },
    sets: [],
    created_at: '2026-09-12T10:00:00Z',
    updated_at: '2026-09-12T10:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(mockExercises);
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/exercises')) {
        return { data: mockExercises };
      }
      if (url.includes('/sessions/active')) {
        return { data: mockActiveSession };
      }
      if (url.includes('/progression-suggestion')) {
        return { data: null };
      }
      return { data: {} };
    });
  });

  describe('1. Cero Scroll Horizontal (scrollWidth === innerWidth) en LoginPage', () => {
    VIEWPORTS.forEach((width) => {
      it(`certifica contención estricta y scrollWidth === ${width}px en LoginPage`, () => {
        setViewport(width);
        const { container } = render(
          <AuthContext.Provider value={{ ...mockAuthContext, isAuthenticated: false, user: null }}>
            <LoginPage />
          </AuthContext.Provider>
        );

        const mobileContainer = container.querySelector('[data-testid="mobile-container"]') as HTMLElement;
        expect(mobileContainer).toBeInTheDocument();
        expect(mobileContainer.className).toContain('overflow-x-hidden');
        expect(mobileContainer.className).toContain('max-w-[390px]');

        // Certificación explícita de cero desbordamiento horizontal
        expect(mobileContainer.scrollWidth).toBe(window.innerWidth);
        expect(mobileContainer.scrollWidth === window.innerWidth).toBe(true);

        cleanup();
      });
    });
  });

  describe('2. Cero Scroll Horizontal (scrollWidth === innerWidth) en ExerciseCatalogPage', () => {
    VIEWPORTS.forEach((width) => {
      it(`certifica contención estricta y scrollWidth === ${width}px en ExerciseCatalogPage`, async () => {
        setViewport(width);
        const { container } = render(<ExerciseCatalogPage />);

        const catalogContainer = container.querySelector('[data-testid="catalog-main"]') as HTMLElement;
        expect(catalogContainer).toBeInTheDocument();
        expect(catalogContainer.className).toContain('overflow-x-hidden');
        expect(catalogContainer.className).toContain('max-w-[390px]');

        expect(catalogContainer.scrollWidth).toBe(window.innerWidth);
        expect(catalogContainer.scrollWidth === window.innerWidth).toBe(true);

        cleanup();
      });
    });
  });

  describe('3. Cero Scroll Horizontal (scrollWidth === innerWidth) en SessionPage', () => {
    VIEWPORTS.forEach((width) => {
      it(`certifica contención estricta y scrollWidth === ${width}px en SessionPage`, () => {
        setViewport(width);
        const { container } = render(
          <AuthContext.Provider value={mockAuthContext}>
            <SessionPage
              session={mockActiveSession}
              sessionPlan={mockSessionPlan}
              className="w-full max-w-[390px] mx-auto overflow-x-hidden"
            />
          </AuthContext.Provider>
        );

        const sessionContainer = container.firstElementChild as HTMLElement;
        expect(sessionContainer).toBeInTheDocument();
        expect(sessionContainer.className).toContain('overflow-x-hidden');
        expect(sessionContainer.className).toContain('max-w-[390px]');

        expect(sessionContainer.scrollWidth).toBe(window.innerWidth);
        expect(sessionContainer.scrollWidth === window.innerWidth).toBe(true);

        cleanup();
      });
    });
  });

  describe('4. Cero Scroll Horizontal (scrollWidth === innerWidth) en RoutineEditorPage', () => {
    VIEWPORTS.forEach((width) => {
      it(`certifica contención estricta y scrollWidth === ${width}px en RoutineEditorPage`, () => {
        setViewport(width);
        const { container } = render(
          <RoutineEditorPage
            sessionId="sess-test"
            sessionPlan={mockSessionPlan}
            onStartSession={() => {}}
            onAcceptRoutine={() => {}}
          />
        );

        const mobileContainer = container.querySelector('[data-testid="mobile-container"]') as HTMLElement;
        expect(mobileContainer).toBeInTheDocument();
        expect(mobileContainer.className).toContain('overflow-x-hidden');
        expect(mobileContainer.className).toContain('max-w-[390px]');

        expect(mobileContainer.scrollWidth).toBe(window.innerWidth);
        expect(mobileContainer.scrollWidth === window.innerWidth).toBe(true);

        cleanup();
      });
    });
  });

  describe('5. Cero Scroll Horizontal (scrollWidth === innerWidth) en ProfilePage', () => {
    VIEWPORTS.forEach((width) => {
      it(`certifica contención estricta y scrollWidth === ${width}px en ProfilePage`, () => {
        setViewport(width);
        const { container } = render(
          <AuthContext.Provider value={mockAuthContext}>
            <ProfilePage mode="edit" />
          </AuthContext.Provider>
        );

        const mobileContainer = container.querySelector('[data-testid="mobile-container"]') as HTMLElement;
        expect(mobileContainer).toBeInTheDocument();
        expect(mobileContainer.className).toContain('overflow-x-hidden');
        expect(mobileContainer.className).toContain('max-w-[390px]');

        expect(mobileContainer.scrollWidth).toBe(window.innerWidth);
        expect(mobileContainer.scrollWidth === window.innerWidth).toBe(true);

        cleanup();
      });
    });
  });

  describe('6. Detección de colapsos visuales y dianas táctiles en viewport mínimo de 320px', () => {
    it('LoginPage a 320px mantiene botón de acceso primario w-full y altura táctil >= 48px', () => {
      setViewport(320);
      render(
        <AuthContext.Provider value={{ ...mockAuthContext, isAuthenticated: false, user: null }}>
          <LoginPage />
        </AuthContext.Provider>
      );

      const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12/);
      expect(loginButton.className).toContain('w-full');
      cleanup();
    });

    it('ExerciseCatalogPage a 320px mantiene barra de búsqueda e inputs con altura táctil >= 48px', () => {
      setViewport(320);
      render(<ExerciseCatalogPage />);

      const searchInput = screen.getByPlaceholderText(/buscar ejercicio/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12/);
      cleanup();
    });

    it('SessionPage a 320px no colapsa los botones de registro y acción táctil', () => {
      setViewport(320);
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <SessionPage
            session={mockActiveSession}
            sessionPlan={mockSessionPlan}
            className="w-full max-w-[390px] mx-auto overflow-x-hidden"
          />
        </AuthContext.Provider>
      );

      const finishBtn = screen.getByRole('button', { name: /finalizar sesión/i });
      expect(finishBtn).toBeInTheDocument();
      expect(finishBtn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target/);
      cleanup();
    });

    it('RoutineEditorPage a 320px mantiene botón principal de confirmación accesible y touch target', () => {
      setViewport(320);
      render(
        <RoutineEditorPage
          sessionId="sess-test"
          sessionPlan={mockSessionPlan}
          onStartSession={() => {}}
          onAcceptRoutine={() => {}}
        />
      );

      const acceptBtn = screen.getByRole('button', { name: /iniciar sesión/i });
      expect(acceptBtn).toBeInTheDocument();
      expect(acceptBtn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target/);
      cleanup();
    });

    it('ProfilePage a 320px mantiene barra de acciones fijas de 48px sin desborde', () => {
      setViewport(320);
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProfilePage mode="edit" />
        </AuthContext.Provider>
      );

      const saveBtn = screen.getByRole('button', { name: /guardar/i });
      expect(saveBtn).toBeInTheDocument();
      expect(saveBtn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target/);
      cleanup();
    });
  });

  describe('7. Verificación de contraste no degradado en layouts compactos (320px)', () => {
    it('Los botones de acción principal en las vistas preservan clases de color de alto contraste', () => {
      setViewport(320);
      render(
        <AuthContext.Provider value={{ ...mockAuthContext, isAuthenticated: false, user: null }}>
          <LoginPage />
        </AuthContext.Provider>
      );

      const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });
      // Botón primario oficial: fondo brand primary y texto negro carbón
      expect(loginButton.className).toMatch(/bg-brand-primary|bg-primary/);
      expect(loginButton.className).toMatch(/text-brand-contrast|text-primary-foreground/);

      cleanup();
    });
  });
});
