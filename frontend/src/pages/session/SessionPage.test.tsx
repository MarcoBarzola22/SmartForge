import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionPage } from './SessionPage';
import { apiClient } from '../../api/client';
import { queryClient } from '../../api/query-client';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import { offlineStore } from '../../stores/offlineStore';
import type {
  TrainingSession,
  SessionPlan,
  ProgressionSuggestion,
  AthleteProfile
} from '../../api';

describe('TASK-70: SessionPage - Progressive Overload & Fatigue/Pain Adjustments (RF-07, RF-08, CA-07.1, CA-08.3)', () => {
  const mockAthlete: AthleteProfile = {
    id: 'ath-601',
    google_id: 'goog-601',
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
    id: 'plan-101',
    week_plan_id: 'week-1',
    day_number: 1,
    name: 'Torso Empuje y Tirón',
    exercise_assignments: [
      {
        id: 'assign-1',
        session_plan_id: 'plan-101',
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
        session_plan_id: 'plan-101',
        exercise_id: 'ex-squat',
        exercise: {
          id: 'ex-squat',
          name: 'Sentadilla Trasera con Barra',
          movement_pattern: 'rodilla_dominante',
          primary_muscle: 'cuadriceps',
          secondary_muscles: ['gluteos'],
          equipment_id: 'barbell',
          is_compound: true,
          initial_load_ratio: 0.85,
          video_url: 'https://smartforge.test/squat',
          video_fallback_url: 'https://fallback.test/squat',
          instructions: 'Romper paralelo.',
          is_active: true
        },
        order_in_session: 2,
        target_sets: 4,
        target_reps: 6,
        target_rir: 2,
        target_load_kg: 100,
        is_swapped: false
      }
    ]
  };

  const activeTrainingSession: TrainingSession = {
    id: 'sess-active-1',
    athlete_id: 'ath-601',
    session_plan_id: 'plan-101',
    status: 'in_progress',
    started_at: '2026-09-12T10:00:00Z',
    checkin: {
      id: 'chk-1',
      session_id: 'sess-active-1',
      fatigue_level: 3,
      joint_pains: [],
      created_at: '2026-09-12T10:00:00Z'
    },
    set_logs: []
  };

  const progressionSuggestion: ProgressionSuggestion = {
    assignment_id: 'assign-1',
    exercise_name: 'Press de Banca Plano con Barra',
    current_load_kg: 80,
    suggestion: {
      action: 'increase_load',
      suggested_load_kg: 82.5,
      suggested_reps: 8,
      reason_es: 'Racha de 2 sesiones cumplidas con RIR objetivo: incremento sugerido de +2.5 kg.'
    },
    streak_count: 2,
    window_sessions: 2
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <SessionPage
          session={activeTrainingSession}
          sessionPlan={sampleSessionPlan}
          {...props}
        />
      </AuthContext.Provider>
    );
  };

  it('should render session header and load dynamic progressive overload suggestion for active exercise (RF-07, CA-07.1)', async () => {
    const progressionSpy = vi
      .spyOn(apiClient.progression, 'getSuggestion')
      .mockResolvedValue(progressionSuggestion);

    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /Sesión en Curso/i })).toBeInTheDocument();
    expect(screen.getByText('Torso Empuje y Tirón')).toBeInTheDocument();

    await waitFor(() => {
      expect(progressionSpy).toHaveBeenCalledWith('assign-1');
      const card = screen.getByTestId('progression-suggestion-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent(/Sobrecarga Progresiva Sugerida/i);
      expect(card).toHaveTextContent(/Incrementar Carga/i);
      expect(card).toHaveTextContent(/82\.5 kg/i);
      expect(card).toHaveTextContent(
        /Racha de 2 sesiones cumplidas con RIR objetivo: incremento sugerido de \+2\.5 kg\./i
      );
    });
  });

  it('should display light pain tracking notice without reducing loads when check-in reported light pain (RF-08, CA-08.3)', async () => {
    vi.spyOn(apiClient.progression, 'getSuggestion').mockResolvedValue(progressionSuggestion);

    const sessionWithLightPain: TrainingSession = {
      ...activeTrainingSession,
      checkin: {
        id: 'chk-light',
        session_id: 'sess-active-1',
        fatigue_level: 3,
        joint_pains: [
          {
            joint: 'hombro',
            side: 'derecha',
            intensity: 'leve'
          }
        ],
        created_at: '2026-09-12T10:00:00Z'
      }
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SessionPage
          session={sessionWithLightPain}
          sessionPlan={sampleSessionPlan}
        />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('pain-adjustment-banner')).toBeInTheDocument();
      expect(screen.getByText(/Molestia leve en hombro \(derecha\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Se mantiene la carga planificada para seguimiento/i)
      ).toBeInTheDocument();
    });
  });

  it('should display moderate/severe pain warning banner when check-in reported moderate or severe pain on exercise joint (RF-08, CA-08.1, CA-08.2)', async () => {
    vi.spyOn(apiClient.progression, 'getSuggestion').mockResolvedValue(progressionSuggestion);

    const sessionWithSeverePain: TrainingSession = {
      ...activeTrainingSession,
      checkin: {
        id: 'chk-severe',
        session_id: 'sess-active-1',
        fatigue_level: 4,
        joint_pains: [
          {
            joint: 'hombro',
            side: 'bilateral',
            intensity: 'severa'
          }
        ],
        created_at: '2026-09-12T10:00:00Z'
      }
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SessionPage
          session={sessionWithSeverePain}
          sessionPlan={sampleSessionPlan}
        />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      const banner = screen.getByTestId('pain-adjustment-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/Alerta de dolor severo en hombro/i);
      expect(banner).toHaveTextContent(/Se recomienda sustituir este ejercicio/i);
    });
  });

  it('should allow switching between planned exercises and update progression suggestion accordingly', async () => {
    const progressionSpy = vi
      .spyOn(apiClient.progression, 'getSuggestion')
      .mockImplementation(async (assignId: string) => {
        if (assignId === 'assign-2') {
          return {
            assignment_id: 'assign-2',
            exercise_name: 'Sentadilla Trasera con Barra',
            current_load_kg: 100,
            suggestion: {
              action: 'maintain',
              suggested_load_kg: 100,
              suggested_reps: 6,
              reason_es: 'Mantener carga para consolidar técnica.'
            },
            streak_count: 1,
            window_sessions: 2
          };
        }
        return progressionSuggestion;
      });

    renderComponent();

    await waitFor(() => {
      expect(progressionSpy).toHaveBeenCalledWith('assign-1');
    });

    // Switch to exercise 2: Sentadilla
    const squatTab = screen.getByRole('button', { name: /2\. Sentadilla/i });
    fireEvent.click(squatTab);

    await waitFor(() => {
      expect(progressionSpy).toHaveBeenCalledWith('assign-2');
      const card = screen.getByTestId('progression-suggestion-card');
      expect(card).toHaveTextContent(/Mantener Carga/i);
      expect(card).toHaveTextContent(/Mantener carga para consolidar técnica\./i);
    });
  });

  it('should log a set via SetLogger and trigger apiClient.sessions.logSet', async () => {
    vi.spyOn(apiClient.progression, 'getSuggestion').mockResolvedValue(progressionSuggestion);
    const logSetSpy = vi.spyOn(apiClient.sessions, 'logSet').mockResolvedValue({
      id: 'set-1',
      session_id: 'sess-active-1',
      exercise_id: 'ex-bench',
      set_number: 1,
      weight_kg: 80,
      reps_completed: 8,
      rir: 2,
      client_timestamp: '2026-09-12T10:05:00Z',
      created_at: '2026-09-12T10:05:00Z'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Registrar Serie 1/i })).toBeInTheDocument();
    });

    const confirmSetBtn = screen.getByRole('button', { name: /Registrar Serie 1/i });
    fireEvent.click(confirmSetBtn);

    await waitFor(() => {
      expect(logSetSpy).toHaveBeenCalledWith('sess-active-1', expect.objectContaining({
        exercise_id: 'ex-bench',
        set_number: 1,
        weight_kg: 82.5,
        reps_completed: 8,
        rir: 2
      }));
    });
  });

  it('should open PainReportModal and submit pain report via apiClient.sessions.reportPain (RF-06, CA-06.1, CA-06.2)', async () => {
    vi.spyOn(apiClient.progression, 'getSuggestion').mockResolvedValue(progressionSuggestion);
    const reportPainSpy = vi.spyOn(apiClient.sessions, 'reportPain').mockResolvedValue({
      id: 'pain-1',
      session_id: 'sess-active-1',
      exercise_id: 'ex-bench',
      joint: 'hombro',
      side: 'derecha',
      intensity: 'moderada',
      notes: 'Dolor en fase concéntrica',
      created_at: '2026-09-12T10:10:00Z'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reportar Molestia/i })).toBeInTheDocument();
    });

    // Open Pain Report Modal
    fireEvent.click(screen.getByRole('button', { name: /Reportar Molestia/i }));

    expect(screen.getByRole('heading', { level: 2, name: /Reportar Molestia Articular/i })).toBeInTheDocument();

    // Select joint: Hombro
    fireEvent.click(screen.getByRole('button', { name: /Hombro/i }));
    // Select side: Derecha
    fireEvent.click(screen.getByRole('button', { name: /Derecha/i }));
    // Select intensity: Moderada
    fireEvent.click(screen.getByRole('button', { name: /Moderada/i }));

    // Submit report
    fireEvent.click(screen.getByRole('button', { name: /Guardar Reporte/i }));

    await waitFor(() => {
      expect(reportPainSpy).toHaveBeenCalledWith('sess-active-1', expect.objectContaining({
        exercise_id: 'ex-bench',
        joint: 'hombro',
        side: 'derecha',
        intensity: 'moderada'
      }));
    });
  });

  it('should complete training session via apiClient.sessions.complete and display performance summary (RF-05, RF-06)', async () => {
    vi.spyOn(apiClient.progression, 'getSuggestion').mockResolvedValue(progressionSuggestion);
    const completeSessionSpy = vi.spyOn(apiClient.sessions, 'complete').mockResolvedValue({
      ...activeTrainingSession,
      status: 'completed',
      completed_at: '2026-09-12T11:00:00Z',
      set_logs: [
        {
          id: 'set-1',
          session_id: 'sess-active-1',
          exercise_id: 'ex-bench',
          set_number: 1,
          weight_kg: 80,
          reps_completed: 8,
          rir: 2,
          client_timestamp: '2026-09-12T10:05:00Z',
          created_at: '2026-09-12T10:05:00Z'
        },
        {
          id: 'set-2',
          session_id: 'sess-active-1',
          exercise_id: 'ex-squat',
          set_number: 1,
          weight_kg: 100,
          reps_completed: 6,
          rir: 2,
          client_timestamp: '2026-09-12T10:20:00Z',
          created_at: '2026-09-12T10:20:00Z'
        }
      ]
    });

    const onFinishSpy = vi.fn();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SessionPage
          session={{
            ...activeTrainingSession,
            set_logs: [
              {
                id: 'set-1',
                session_id: 'sess-active-1',
                exercise_id: 'ex-bench',
                set_number: 1,
                weight_kg: 80,
                reps_completed: 8,
                rir: 2,
                client_timestamp: '2026-09-12T10:05:00Z',
                created_at: '2026-09-12T10:05:00Z'
              },
              {
                id: 'set-2',
                session_id: 'sess-active-1',
                exercise_id: 'ex-squat',
                set_number: 1,
                weight_kg: 100,
                reps_completed: 6,
                rir: 2,
                client_timestamp: '2026-09-12T10:20:00Z',
                created_at: '2026-09-12T10:20:00Z'
              }
            ]
          }}
          sessionPlan={sampleSessionPlan}
          onFinishSession={onFinishSpy}
        />
      </AuthContext.Provider>
    );

    const finishBtn = screen.getByRole('button', { name: /Finalizar Sesión/i });
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(completeSessionSpy).toHaveBeenCalledWith('sess-active-1');
      expect(invalidateSpy).toHaveBeenCalled();
      expect(onFinishSpy).toHaveBeenCalled();
      expect(screen.getByTestId('session-summary-view')).toBeInTheDocument();
      expect(screen.getByText(/¡Sesión Completada!/i)).toBeInTheDocument();
      expect(screen.getByText(/Resumen de Rendimiento/i)).toBeInTheDocument();
      // Total volume: 80*8 + 100*6 = 640 + 600 = 1,240 kg
      expect(screen.getByText(/1,240 kg|1240 kg/i)).toBeInTheDocument();
    });
  });

  it('should resume active session in_progress from offline store on mount and restore marked sets (T-91, RF-04, RNF-03)', async () => {
    const activeStoredSession: TrainingSession = {
      ...activeTrainingSession,
      status: 'in_progress',
      set_logs: [
        {
          id: 'set-restored-1',
          session_id: 'sess-active-1',
          exercise_id: 'ex-bench',
          set_number: 1,
          weight_kg: 85,
          reps_completed: 10,
          rir: 1,
          client_timestamp: '2026-09-12T10:05:00Z',
          created_at: '2026-09-12T10:05:00Z'
        }
      ]
    };

    vi.spyOn(offlineStore, 'getActiveSession').mockResolvedValue({
      session: activeStoredSession,
      sessionPlan: sampleSessionPlan
    });

    // Mount SessionPage with empty set_logs in props (simulating returning to tab)
    const initialSessionWithoutSets: TrainingSession = {
      ...activeTrainingSession,
      set_logs: []
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <SessionPage
          session={initialSessionWithoutSets}
          sessionPlan={sampleSessionPlan}
        />
      </AuthContext.Provider>
    );

    // Wait for the restore effect to populate the set logs
    await waitFor(() => {
      expect(screen.getByText(/85 kg/i)).toBeInTheDocument();
      expect(screen.getByText(/10 reps/i)).toBeInTheDocument();
      expect(screen.getByText(/1 \/ 8/i)).toBeInTheDocument();
    });
  });
});

