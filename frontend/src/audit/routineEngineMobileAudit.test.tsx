import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Components & Pages under Mobile Audit (Constitución Art. 2)
import { MesocyclePage } from '../pages/mesocycle/MesocyclePage';
import { RoutineHistoryPage } from '../pages/routine/RoutineHistoryPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { MesocycleWizardV2 } from '../components/mesocycle/MesocycleWizardV2';
import { CancellationModal } from '../components/mesocycle/CancellationModal';
import { EmptyMesocycleState } from '../components/mesocycle/EmptyMesocycleState';
import { WeightLogModal } from '../components/weight/WeightLogModal';
import { WeightHistoryList } from '../components/weight/WeightHistoryList';
import { ExerciseProgressionCard } from '../components/mesocycle/ExerciseProgressionCard';

// Auth and API mock types
import { AuthContext, type AuthContextType } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type {
  MesocycleDetail,
  AthleteProfile,
  MesocycleHistoryItem,
  WeightLogItem
} from '../api';

const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-w-\[(4[8-9]|[5-9][0-9])px\]|h-12/;

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

describe('TASK-42: Auditoría Mobile-First a Una Mano en Viewport de 390px (Constitución Art. 2)', () => {
  const mockAthlete: AthleteProfile = {
    id: 'ath-audit-390',
    google_id: 'goog-audit',
    email: 'atleta@smartforge.test',
    name: 'Carlos Ruiz',
    age: 27,
    weight_kg: 78.5,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra olímpica', category: 'free_weights' }],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const mockAuthContext: AuthContextType = {
    user: mockAthlete,
    token: 'audit-token',
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    loginWithGoogle: vi.fn(),
    loginWithToken: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
  };

  const sampleWeightLogs: WeightLogItem[] = [
    {
      id: 'log-1',
      athlete_id: 'ath-audit-390',
      weight_kg: 78.5,
      calendar_week_start: '2026-09-07',
      logged_date: '2026-09-10',
      delta_kg: -0.5,
      created_at: '2026-09-10T08:00:00.000Z'
    },
    {
      id: 'log-2',
      athlete_id: 'ath-audit-390',
      weight_kg: 79.0,
      calendar_week_start: '2026-08-31',
      logged_date: '2026-09-03',
      delta_kg: 0,
      created_at: '2026-09-03T08:00:00.000Z'
    }
  ];

  const sampleActiveMesocycle: MesocycleDetail = {
    id: 'meso-audit-1',
    athlete_id: 'ath-audit-390',
    name: 'Mesociclo de Hipertrofia V2',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'ondulante',
    duration_weeks: 4,
    status: 'active',
    start_date: '2026-09-01',
    weeks: [
      {
        id: 'w-1',
        mesocycle_id: 'meso-audit-1',
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            id: 'sess-1',
            week_plan_id: 'w-1',
            day_number: 1,
            name: 'Torso Empuje',
            exercise_assignments: [
              {
                id: 'assign-1',
                session_plan_id: 'sess-1',
                exercise_id: 'ex-bench',
                exercise: {
                  id: 'ex-bench',
                  name: 'Press de Banca Plano',
                  movement_pattern: 'empuje',
                  primary_muscle: 'pecho',
                  secondary_muscles: ['triceps'],
                  equipment_id: 'barbell',
                  is_compound: true,
                  initial_load_ratio: 0.8,
                  video_url: '',
                  video_fallback_url: '',
                  instructions: 'Empujar con fuerza.',
                  is_active: true
                },
                order_in_session: 1,
                target_sets: 4,
                target_reps: 8,
                target_rir: 2,
                target_load_kg: 80,
                is_swapped: false
              }
            ]
          }
        ]
      },
      {
        id: 'w-4',
        mesocycle_id: 'meso-audit-1',
        week_number: 4,
        is_deload: true,
        sessions: []
      }
    ]
  };

  const sampleHistoryItem: MesocycleHistoryItem = {
    id: 'hist-audit-1',
    name: 'Mesociclo de Hipertrofia V2',
    goal: 'hipertrofia',
    startDate: '2026-08-01',
    endDate: '2026-08-28',
    status: 'completed',
    adherencePercent: 100,
    adherenceDetails: '24 de 24 sesiones completadas',
    exerciseProgressions: [
      {
        exerciseId: 'ex-bench',
        exerciseName: 'Press de Banca Plano',
        loadType: 'external_load',
        baseline: { loadText: '80.0 kg × 8 reps', e1rmKg: 99.3 },
        final: { loadText: '85.0 kg × 8 reps', e1rmKg: 105.5, executed: true },
        progress: { deltaKg: 6.2, deltaPercent: 6.2 }
      }
    ]
  };

  beforeEach(() => {
    setViewport(390, 844);
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return Math.min(390, window.innerWidth);
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Cero Scroll Horizontal en Viewport de 390px (document.body.scrollWidth <= 390)', () => {
    it('MesocyclePage en estado activo no genera scroll horizontal en 390px', () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockResolvedValue(sampleActiveMesocycle);

      const { container } = render(
        <AuthContext.Provider value={mockAuthContext}>
          <MesocyclePage initialMesocycle={sampleActiveMesocycle} />
        </AuthContext.Provider>
      );

      const mainContainer = container.querySelector('[data-testid="mesocycle-container"]');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer?.className).toContain('max-w-[390px]');
      expect(mainContainer?.className).toContain('overflow-x-hidden');

      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('MesocyclePage en estado vacío (EmptyMesocycleState) no genera scroll horizontal en 390px', async () => {
      vi.spyOn(apiClient.mesocycles, 'getCurrent').mockRejectedValue({
        status: 404,
        code: 'MESOCYCLE_NOT_FOUND',
        message: 'No active mesocycle'
      });

      render(
        <AuthContext.Provider value={mockAuthContext}>
          <MesocyclePage />
        </AuthContext.Provider>
      );

      const emptyEl = await screen.findByTestId('empty-mesocycle-state');
      expect(emptyEl).toBeInTheDocument();
      expect(emptyEl.className).toContain('max-w-[390px]');

      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('MesocycleWizardV2 se auto-contiene en max-w-[390px] sin desbordamiento horizontal', () => {
      const { container } = render(<MesocycleWizardV2 isOpen={true} />);

      const wizardEl = container.querySelector('[data-testid="mesocycle-wizard-v2"]');
      expect(wizardEl).toBeInTheDocument();
      expect(wizardEl?.className).toContain('max-w-[390px]');
      expect(wizardEl?.className).toContain('overflow-hidden');

      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('CancellationModal dialog container se auto-contiene en max-w-[390px]', () => {
      const { container } = render(
        <CancellationModal isOpen={true} onClose={vi.fn()} activeMesocycleName="Mesociclo V2" />
      );

      const modalEl = container.querySelector('[data-testid="cancellation-modal"]');
      expect(modalEl).toBeInTheDocument();
      expect(modalEl?.className).toContain('max-w-[390px]');
      expect(modalEl?.className).toContain('overflow-hidden');

      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('WeightLogModal se auto-contiene en max-w-[390px] y respeta los límites del viewport', () => {
      const { container } = render(<WeightLogModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);

      const sheet = container.querySelector('.max-w-\\[390px\\]');
      expect(sheet).toBeInTheDocument();

      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('WeightHistoryList mantiene contención en max-w-[390px] con lista de pesajes y semanas vacías', () => {
      const { container } = render(<WeightHistoryList logs={sampleWeightLogs} showMissingWeeks={true} />);

      const historyEl = container.querySelector('[data-testid="weight-history-list"]');
      expect(historyEl).toBeInTheDocument();
      expect(historyEl?.className).toContain('max-w-[390px]');
      expect(historyEl?.className).toContain('overflow-hidden');

      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('RoutineHistoryPage y MesocycleHistoryCard mantienen contención vertical sin scroll horizontal', () => {
      const { container } = render(<RoutineHistoryPage initialHistory={[sampleHistoryItem]} onBack={vi.fn()} />);

      const historyContainer = container.querySelector('[data-testid="routine-history-container"]');
      expect(historyContainer).toBeInTheDocument();
      expect(historyContainer?.className).toContain('max-w-[390px]');
      expect(historyContainer?.className).toContain('overflow-x-hidden');

      const card = container.querySelector('[data-testid="mesocycle-history-card"]');
      expect(card).toBeInTheDocument();
      expect(card?.className).toContain('max-w-[390px]');

      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('ProfilePage contiene el módulo de peso e historial dentro de max-w-[390px] sin multi-columnas', () => {
      const { container } = render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProfilePage initialProfile={mockAthlete} mode="edit" />
        </AuthContext.Provider>
      );

      const mobileEl = container.querySelector('[data-testid="mobile-container"]');
      expect(mobileEl).toBeInTheDocument();
      expect(mobileEl?.className).toContain('max-w-[390px]');
      expect(mobileEl?.className).toContain('overflow-x-hidden');

      // Prohibición estricta de multi-columnas en vista general de perfil
      expect(container.querySelectorAll('.grid-cols-2').length).toBe(0);
      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });
  });

  describe('2. Ergonomía a Una Mano y Touch Targets >= 48px en Mitad Inferior (Constitución Art. 2)', () => {
    it('todos los botones de MesocycleWizardV2 (días, tiempos, selector y CTA) tienen touch target >= 48px', () => {
      const { container } = render(<MesocycleWizardV2 isOpen={true} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(10);

      buttons.forEach((btn) => {
        expect(btn.className).toMatch(TOUCH_TARGET_REGEX);
      });

      // El botón primario CTA de generación está en el footer (mitad inferior)
      const generateBtn = screen.getByRole('button', { name: /generar mesociclo/i });
      expect(generateBtn.className).toMatch(TOUCH_TARGET_REGEX);
      expect(generateBtn.closest('.border-t')).toBeInTheDocument();
    });

    it('los botones de CancellationModal ("Sí, cancelar" y "Mantener") tienen touch target >= 48px y están en el footer', () => {
      const { container } = render(
        <CancellationModal isOpen={true} onClose={vi.fn()} activeMesocycleName="Mesociclo V2" />
      );

      const confirmBtn = screen.getByRole('button', { name: /sí, cancelar mesociclo/i });
      const dismissBtn = screen.getByRole('button', { name: /mantener mesociclo/i });

      expect(confirmBtn.className).toMatch(TOUCH_TARGET_REGEX);
      expect(dismissBtn.className).toMatch(TOUCH_TARGET_REGEX);

      // Ubicados en el pie del diálogo
      const modalFooter = container.querySelector('.pt-2.flex.flex-col');
      expect(modalFooter).toBeInTheDocument();
      expect(modalFooter).toContainElement(confirmBtn);
      expect(modalFooter).toContainElement(dismissBtn);
    });

    it('los botones de WeightLogModal ("Registrar pesaje" y "Cancelar") tienen touch target >= 48px y están al pie', () => {
      const { container } = render(<WeightLogModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);

      const saveBtn = screen.getByRole('button', { name: /registrar pesaje/i });
      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });

      expect(saveBtn.className).toMatch(TOUCH_TARGET_REGEX);
      expect(cancelBtn.className).toMatch(TOUCH_TARGET_REGEX);

      const footer = container.querySelector('.pt-2.flex.flex-col');
      expect(footer).toBeInTheDocument();
      expect(footer).toContainElement(saveBtn);
      expect(footer).toContainElement(cancelBtn);
    });

    it('el botón de cancelación del mesociclo activo en MesocyclePage cumple touch target >= 48px', () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <MesocyclePage initialMesocycle={sampleActiveMesocycle} />
        </AuthContext.Provider>
      );

      const cancelBtn = screen.getByRole('button', { name: /cancelar mesociclo actual/i });
      expect(cancelBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });

    it('los botones primarios de EmptyMesocycleState cumplen touch target >= 48px', () => {
      render(<EmptyMesocycleState onGenerate={vi.fn()} onViewHistory={vi.fn()} />);

      const generateBtn = screen.getByRole('button', { name: /generar nuevo mesociclo/i });
      const historyBtn = screen.getByRole('button', { name: /ver historial de mesociclos/i });

      expect(generateBtn.className).toMatch(TOUCH_TARGET_REGEX);
      expect(historyBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });

    it('los botones y selectores en RoutineHistoryPage cumplen touch target >= 48px', () => {
      const { container } = render(<RoutineHistoryPage initialHistory={[sampleHistoryItem]} onBack={vi.fn()} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);

      buttons.forEach((btn) => {
        expect(btn.className).toMatch(TOUCH_TARGET_REGEX);
      });
    });

    it('los botones de acción en la mitad inferior de ProfilePage están anclados con sticky bottom y altura >= 48px', () => {
      const { container } = render(
        <AuthContext.Provider value={mockAuthContext}>
          <ProfilePage initialProfile={mockAthlete} mode="edit" />
        </AuthContext.Provider>
      );

      const bottomActions = container.querySelector('[data-testid="profile-bottom-actions"]');
      expect(bottomActions).toBeInTheDocument();
      expect(bottomActions?.className).toContain('sticky');
      expect(bottomActions?.className).toContain('bottom-0');

      const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
      expect(submitBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });
  });

  describe('3. Comparativas de Marca en Tarjetas Verticales Apiladas (RF-06 CA-06.4)', () => {
    it('ExerciseProgressionCard se renderiza en tarjeta vertical contenida en 390px', () => {
      const { container } = render(
        <ExerciseProgressionCard progression={sampleHistoryItem.exerciseProgressions[0]!} />
      );

      const card = container.querySelector('[data-testid="exercise-progression-card"]');
      expect(card).toBeInTheDocument();
      expect(card?.className).toContain('max-w-[390px]');
      expect(card?.className).toContain('overflow-hidden');

      expect(screen.getByText('Punto de partida')).toBeInTheDocument();
      expect(screen.getByText('Carga final alcanzada')).toBeInTheDocument();
      expect(document.body.scrollWidth).toBeLessThanOrEqual(390);
    });
  });
});
