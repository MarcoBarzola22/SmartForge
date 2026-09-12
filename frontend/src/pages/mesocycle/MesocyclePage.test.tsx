import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MesocyclePage } from './MesocyclePage';
import { apiClient } from '../../api/client';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import type { MesocycleDetail, AthleteProfile } from '../../api';

describe('TASK-65: MesocyclePage Dashboard & Deload Notice (RF-02, RF-10, CA-10.2)', () => {
  const mockAthlete: AthleteProfile = {
    id: 'ath-301',
    google_id: 'goog-301',
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

  const mockMesocycle: MesocycleDetail = {
    id: 'meso-101',
    athlete_id: 'ath-301',
    name: 'Mesociclo de Hipertrofia Intermedio',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'ondulante',
    duration_weeks: 4,
    status: 'active',
    start_date: '2026-09-01',
    weeks: [
      {
        id: 'week-1',
        mesocycle_id: 'meso-101',
        week_number: 1,
        is_deload: false,
        sessions: [
          {
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
                  name: 'Remo con Barra',
                  movement_pattern: 'tiron',
                  primary_muscle: 'espalda',
                  secondary_muscles: ['biceps'],
                  equipment_id: 'barbell',
                  is_compound: true,
                  initial_load_ratio: 0.75,
                  video_url: 'https://smartforge.test/row',
                  video_fallback_url: 'https://fallback.test/row',
                  instructions: 'Tirar con codos.',
                  is_active: true
                },
                order_in_session: 2,
                target_sets: 4,
                target_reps: 10,
                target_rir: 2,
                target_load_kg: 70,
                is_swapped: false
              }
            ]
          },
          {
            id: 'sess-plan-2',
            week_plan_id: 'week-1',
            day_number: 2,
            name: 'Pierna Completa',
            exercise_assignments: [
              {
                id: 'assign-3',
                session_plan_id: 'sess-plan-2',
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
                  instructions: 'Romper paralelo con la cadera.',
                  is_active: true
                },
                order_in_session: 1,
                target_sets: 4,
                target_reps: 6,
                target_rir: 2,
                target_load_kg: 100,
                is_swapped: false
              }
            ]
          }
        ]
      },
      {
        id: 'week-2',
        mesocycle_id: 'meso-101',
        week_number: 2,
        is_deload: false,
        sessions: [
          {
            id: 'sess-plan-3',
            week_plan_id: 'week-2',
            day_number: 1,
            name: 'Torso Empuje y Tirón (Semana 2)',
            exercise_assignments: []
          }
        ]
      },
      {
        id: 'week-3',
        mesocycle_id: 'meso-101',
        week_number: 3,
        is_deload: false,
        sessions: []
      },
      {
        id: 'week-4',
        mesocycle_id: 'meso-101',
        week_number: 4,
        is_deload: true, // Deload week (CA-10.2)
        sessions: [
          {
            id: 'sess-plan-deload-1',
            week_plan_id: 'week-4',
            day_number: 1,
            name: 'Torso Descarga',
            exercise_assignments: [
              {
                id: 'assign-d1',
                session_plan_id: 'sess-plan-deload-1',
                exercise_id: 'ex-bench',
                exercise: {
                  id: 'ex-bench',
                  name: 'Press de Banca Plano con Barra',
                  movement_pattern: 'empuje',
                  primary_muscle: 'pecho',
                  secondary_muscles: ['triceps'],
                  equipment_id: 'barbell',
                  is_compound: true,
                  initial_load_ratio: 0.8,
                  video_url: 'https://smartforge.test/bench',
                  video_fallback_url: 'https://fallback.test/bench',
                  instructions: 'Descarga activa.',
                  is_active: true
                },
                order_in_session: 1,
                target_sets: 2, // -40% sets
                target_reps: 8,
                target_rir: 3,
                target_load_kg: 72, // -10% load
                is_swapped: false
              }
            ]
          }
        ]
      }
    ]
  };

  const renderComponent = (props = {}) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <MesocyclePage {...props} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should display loading skeleton while fetching active mesocycle', () => {
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockReturnValue(new Promise(() => {}));
    renderComponent();

    expect(screen.getByTestId('mesocycle-loading-state')).toBeInTheDocument();
  });

  it('should display empty state when there is no active mesocycle', async () => {
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockRejectedValue({
      status: 404,
      code: 'MESOCYCLE_NOT_FOUND',
      message: 'No active mesocycle'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No tenés un mesociclo activo/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generar Nuevo Mesociclo/i })).toBeInTheDocument();
    });
  });

  it('should render mesocycle header, badges, week navigation, and movement patterns (RF-02)', async () => {
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockMesocycle);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mesociclo de Hipertrofia Intermedio')).toBeInTheDocument();
      expect(screen.getByText('Ondulante')).toBeInTheDocument();
      expect(screen.getByText('4 semanas')).toBeInTheDocument();
    });

    // Week selector buttons
    expect(screen.getByRole('button', { name: /Semana 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Semana 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Semana 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Semana 4/i })).toBeInTheDocument();

    // Movement pattern distribution for selected week
    expect(screen.getByText(/Distribución de patrones/i)).toBeInTheDocument();
    expect(screen.getByText('Empuje')).toBeInTheDocument();
    expect(screen.getByText('Tirón')).toBeInTheDocument();
    expect(screen.getByText('Rodilla dominante')).toBeInTheDocument();

    // Sessions for week 1
    expect(screen.getByText('Torso Empuje y Tirón')).toBeInTheDocument();
    expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    expect(screen.getByText('Pierna Completa')).toBeInTheDocument();
    expect(screen.getByText('Sentadilla Trasera con Barra')).toBeInTheDocument();

    // Normal week 1 does not show deload banner
    expect(screen.queryByTestId('deload-banner')).not.toBeInTheDocument();
  });

  it('should switch sessions when clicking another week tab', async () => {
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockMesocycle);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Torso Empuje y Tirón')).toBeInTheDocument();
    });

    // Click Week 2
    fireEvent.click(screen.getByRole('button', { name: /Semana 2/i }));

    expect(screen.getByText('Torso Empuje y Tirón (Semana 2)')).toBeInTheDocument();
    expect(screen.queryByText('Pierna Completa')).not.toBeInTheDocument();
  });

  it('should show distinctive Deload banner when viewing the deload week (RF-10, CA-10.2)', async () => {
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockMesocycle);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mesociclo de Hipertrofia Intermedio')).toBeInTheDocument();
    });

    // Click Week 4 (Deload)
    fireEvent.click(screen.getByRole('button', { name: /Semana 4/i }));

    const deloadBanner = screen.getByTestId('deload-banner');
    expect(deloadBanner).toBeInTheDocument();
    expect(deloadBanner).toHaveTextContent(/Semana de Descarga/i);
    expect(deloadBanner).toHaveTextContent(/Reducción de volumen.*−40%.*intensidad.*−10%/i);

    // Shows deload session
    expect(screen.getByText('Torso Descarga')).toBeInTheDocument();
  });

  it('should trigger onSelectSession callback when clicking on a session card or action', async () => {
    const onSelectSession = vi.fn();
    vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(mockMesocycle);
    renderComponent({ onSelectSession });

    await waitFor(() => {
      expect(screen.getByText('Torso Empuje y Tirón')).toBeInTheDocument();
    });

    const sessionCard = screen.getByRole('button', { name: /Ver detalles de sesión Torso Empuje y Tirón/i });
    fireEvent.click(sessionCard);

    expect(onSelectSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sess-plan-1',
        name: 'Torso Empuje y Tirón'
      })
    );
  });
});
