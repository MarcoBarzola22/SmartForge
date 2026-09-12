import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoutineEditorPage } from './RoutineEditorPage';
import { apiClient } from '../../api/client';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import type { SessionPlan, MesocycleDetail, AthleteProfile } from '../../api';

describe('TASK-66: RoutineEditorPage - Exercise List & Swap Trigger (RF-03, CA-03.3)', () => {
  const mockAthlete: AthleteProfile = {
    id: 'ath-501',
    google_id: 'goog-501',
    email: 'atleta@smartforge.test',
    name: 'Carlos Ruiz',
    age: 26,
    weight_kg: 78,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 3,
    equipment: [{ id: 'barbell', name: 'Barra olímpica', category: 'free_weights' }],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z'
  };

  const mockAuthContext: AuthContextType = {
    user: mockAthlete,
    token: 'valid-token',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn()
  };

  const sampleSessionPlan: SessionPlan = {
    id: 'sess-plan-1',
    week_plan_id: 'week-1',
    day_number: 1,
    name: 'Torso Empuje y Tirón',
    exercise_assignments: [
      {
        id: 'assign-1',
        session_plan_id: 'sess-plan-1',
        exercise_id: 'ex-bench',
        exercise: {
          id: 'ex-bench',
          name: 'Press de Banca Plano con Barra',
          movement_pattern: 'empuje',
          primary_muscle: 'pecho',
          secondary_muscles: ['triceps', 'hombros'],
          equipment_id: 'barbell',
          is_compound: true,
          initial_load_ratio: 0.8,
          video_url: 'https://smartforge.test/bench',
          video_fallback_url: 'https://fallback.test/bench',
          instructions: 'Bajar controlado y empujar.',
          is_active: true
        },
        order_in_session: 1,
        target_sets: 4,
        target_reps: 8,
        target_rir: 2,
        target_load_kg: 80,
        is_swapped: false
      },
      {
        id: 'assign-2',
        session_plan_id: 'sess-plan-1',
        exercise_id: 'ex-row',
        exercise: {
          id: 'ex-row',
          name: 'Remo con Barra Pendlay',
          movement_pattern: 'tiron',
          primary_muscle: 'espalda',
          secondary_muscles: ['biceps'],
          equipment_id: 'barbell',
          is_compound: true,
          initial_load_ratio: 0.75,
          video_url: 'https://smartforge.test/row',
          video_fallback_url: 'https://fallback.test/row',
          instructions: 'Espalda neutra y tirar con codos.',
          is_active: true
        },
        order_in_session: 2,
        target_sets: 4,
        target_reps: 10,
        target_rir: 2,
        target_load_kg: 70,
        is_swapped: true
      }
    ]
  };

  const mockMesocycle: MesocycleDetail = {
    id: 'meso-101',
    athlete_id: 'ath-501',
    name: 'Mesociclo de Hipertrofia',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'lineal',
    duration_weeks: 4,
    status: 'active',
    start_date: '2026-09-01',
    weeks: [
      {
        id: 'week-1',
        mesocycle_id: 'meso-101',
        week_number: 1,
        is_deload: false,
        sessions: [sampleSessionPlan]
      }
    ]
  };

  const renderComponent = (props = {}) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <RoutineEditorPage sessionPlan={sampleSessionPlan} {...props} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render session title, day number and planned exercises list with target series, reps, load and RIR (RF-03, CA-03.3)', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Editor de Rutina/i })).toBeInTheDocument();
    expect(screen.getByText('Torso Empuje y Tirón')).toBeInTheDocument();
    expect(screen.getByText(/Día 1/i)).toBeInTheDocument();

    // Check exercise 1
    expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    expect(screen.getAllByText(/4 series/i)).toHaveLength(2);
    expect(screen.getByText(/8 reps/i)).toBeInTheDocument();
    expect(screen.getByText(/80 kg/i)).toBeInTheDocument();
    expect(screen.getAllByText(/RIR 2/i)).toHaveLength(2);

    // Check exercise 2
    expect(screen.getByText('Remo con Barra Pendlay')).toBeInTheDocument();
    expect(screen.getByText(/10 reps/i)).toBeInTheDocument();
    expect(screen.getByText(/70 kg/i)).toBeInTheDocument();

    // Badge for swapped exercise
    expect(screen.getByText('Reemplazado')).toBeInTheDocument();
  });

  it('should render "Cambiar ejercicio" buttons with accessible 48px touch targets for each assignment (CA-03.3)', () => {
    renderComponent();

    const swapButtons = screen.getAllByRole('button', { name: /Cambiar ejercicio/i });
    expect(swapButtons).toHaveLength(2);

    swapButtons.forEach((btn) => {
      expect(btn.className).toMatch(/min-h-\[48px\]|touch-target/);
    });
  });

  it('should trigger onSwapExercise callback with assignment when "Cambiar ejercicio" is clicked', async () => {
    vi.spyOn(apiClient.routine, 'getAlternatives').mockResolvedValue([]);
    const onSwapExercise = vi.fn();
    renderComponent({ onSwapExercise });

    const swapButtons = screen.getAllByRole('button', { name: /Cambiar ejercicio/i });
    expect(swapButtons[0]).toBeDefined();
    fireEvent.click(swapButtons[0] as HTMLElement);

    expect(onSwapExercise).toHaveBeenCalledTimes(1);
    expect(onSwapExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'assign-1',
        exercise_id: 'ex-bench'
      })
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should trigger onAcceptRoutine and onBack callbacks when action buttons are clicked', () => {
    const onAcceptRoutine = vi.fn();
    const onBack = vi.fn();
    renderComponent({ onAcceptRoutine, onBack });

    const acceptBtn = screen.getByRole('button', { name: /Aceptar Rutina/i });
    fireEvent.click(acceptBtn);
    expect(onAcceptRoutine).toHaveBeenCalledTimes(1);

    const backBtn = screen.getByRole('button', { name: /Volver al Mesociclo/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should fetch active mesocycle session if sessionPlan prop is not provided but sessionId is given', async () => {
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockMesocycle);

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <RoutineEditorPage sessionId="sess-plan-1" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Torso Empuje y Tirón')).toBeInTheDocument();
      expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    });
  });

  it('should display empty state if no session plan is found', async () => {
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue({
      ...mockMesocycle,
      weeks: []
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <RoutineEditorPage sessionId="non-existing-session" />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /Sesión no encontrada/i })
      ).toBeInTheDocument();
    });
  });

  describe('T-24: RoutineEditorPage con tarjetas modulares apiladas y acciones en mitad inferior (RF-04, RF-11, RF-14, Constitución R2)', () => {
    const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/;

    it('apila los ejercicios planificados en tarjetas modulares individuales sin scroll horizontal', () => {
      const { container } = renderComponent();

      const exerciseCards = container.querySelectorAll('[data-testid="modular-exercise-card"]');
      expect(exerciseCards.length).toBe(2);

      // Cero scroll horizontal
      const horizontalScrollers = container.querySelectorAll('.overflow-x-auto');
      expect(horizontalScrollers.length).toBe(0);
    });

    it('ancla las acciones de la rutina en la mitad inferior fija/sticky apiladas verticalmente con dianas >= 48px (RF-04, RF-14)', () => {
      const { container } = renderComponent({
        onStartSession: vi.fn(),
        onAcceptRoutine: vi.fn(),
        onBack: vi.fn()
      });

      const bottomDock = container.querySelector('[data-testid="routine-bottom-actions"]');
      expect(bottomDock).toBeInTheDocument();
      expect(bottomDock?.className).toContain('flex-col');

      const startBtn = screen.getByRole('button', { name: /Iniciar Sesión/i });
      expect(startBtn).toBeInTheDocument();
      expect(startBtn.className).toMatch(TOUCH_TARGET_REGEX);

      const acceptBtn = screen.getByRole('button', { name: /Aceptar Rutina/i });
      expect(acceptBtn).toBeInTheDocument();
      expect(acceptBtn.className).toMatch(TOUCH_TARGET_REGEX);

      const backBtn = screen.getByRole('button', { name: /Volver al Mesociclo/i });
      expect(backBtn).toBeInTheDocument();
      expect(backBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });
  });
});
