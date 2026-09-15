import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MesocycleHistoryCard } from './MesocycleHistoryCard';
import { ExerciseProgressionCard } from './ExerciseProgressionCard';
import type { MesocycleHistoryItem, ExerciseProgressionItem } from '../../api/generated/types';

describe('TASK-37: MesocycleHistoryCard.tsx & ExerciseProgressionCard.tsx (RF-06, Constitución Art. 2, Art. 6)', () => {
  const sampleProgressionCompleted: ExerciseProgressionItem = {
    exerciseId: 'ex-pullup',
    exerciseName: 'Dominadas pronas',
    loadType: 'bodyweight_loadable',
    baseline: {
      loadText: '75.0 kg (PC) + 0 kg × 6 reps',
      e1rmKg: 90.0
    },
    final: {
      loadText: '73.5 kg (PC) + 10 kg × 8 reps',
      e1rmKg: 101.2,
      executed: true
    },
    progress: {
      deltaKg: 11.2,
      deltaPercent: 12.4
    }
  };

  const sampleProgressionUnexecuted: ExerciseProgressionItem = {
    exerciseId: 'ex-squat',
    exerciseName: 'Sentadilla trasera',
    loadType: 'external_load',
    baseline: {
      loadText: '100.0 kg × 8 reps',
      e1rmKg: 124.0
    },
    final: {
      loadText: '0 kg × 0 reps',
      e1rmKg: 0,
      executed: false
    }
  };

  const sampleHistoryCompleted: MesocycleHistoryItem = {
    id: 'meso-hist-1',
    name: 'Mesociclo 1 - Hipertrofia V2',
    goal: 'hipertrofia',
    startDate: '2026-08-01',
    endDate: '2026-09-12',
    status: 'completed',
    adherencePercent: 92,
    adherenceDetails: 'Semana 6 de 6 completada (22 de 24 sesiones)',
    exerciseProgressions: [sampleProgressionCompleted]
  };

  const sampleHistoryDeloadSkipped: MesocycleHistoryItem = {
    id: 'meso-hist-2',
    name: 'Mesociclo 2 - Fuerza Máxima',
    goal: 'fuerza',
    startDate: '2026-07-01',
    endDate: '2026-08-05',
    status: 'deload_skipped',
    adherencePercent: 100,
    adherenceDetails: 'Cumplimiento: 100% (con sesiones adelantadas)',
    exerciseProgressions: [sampleProgressionCompleted]
  };

  const sampleHistoryCancelled: MesocycleHistoryItem = {
    id: 'meso-hist-3',
    name: 'Mesociclo 3 - Torso Pierna',
    goal: 'fuerza',
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    status: 'cancelled',
    adherencePercent: 45,
    adherenceDetails: 'Cancelado en semana 2 de 6 por molestia física',
    exerciseProgressions: [sampleProgressionCompleted, sampleProgressionUnexecuted]
  };

  describe('ExerciseProgressionCard — Tarjetas verticales apiladas por ejercicio (RF-06 CA-06.4)', () => {
    it('should render in a mobile-first container with max width 390px and no horizontal scroll', () => {
      const { container } = render(
        <ExerciseProgressionCard
          progression={sampleProgressionCompleted}
          muscleGroup="Espalda"
        />
      );

      const cardEl = container.querySelector('[data-testid="exercise-progression-card"]');
      expect(cardEl).toBeInTheDocument();
      expect(cardEl?.className).toMatch(/max-w-\[390px\]/);
    });

    it('should display exercise name, muscle group, baseline snapshot, final performance, and 1RM delta', () => {
      render(
        <ExerciseProgressionCard
          progression={sampleProgressionCompleted}
          muscleGroup="Espalda"
        />
      );

      // Name and muscle group
      expect(screen.getByText('Dominadas pronas')).toBeInTheDocument();
      expect(screen.getByText(/espalda/i)).toBeInTheDocument();

      // Punto de partida
      expect(screen.getByText(/punto de partida/i)).toBeInTheDocument();
      expect(screen.getByText('75.0 kg (PC) + 0 kg × 6 reps')).toBeInTheDocument();
      expect(screen.getByText('90.0 kg')).toBeInTheDocument();

      // Carga final
      expect(screen.getByText(/carga final alcanzada/i)).toBeInTheDocument();
      expect(screen.getByText('73.5 kg (PC) + 10 kg × 8 reps')).toBeInTheDocument();
      expect(screen.getByText('101.2 kg')).toBeInTheDocument();

      // Delta in kg and percent
      expect(screen.getByText('+11.2 kg (+12.4% 1RM est.)')).toBeInTheDocument();
    });

    it('edge case (CA-06.5): unexecuted exercise in cancelled mesocycle displays "No ejecutado (Ciclo cancelado)" and "0 kg / Sin variación"', () => {
      render(
        <ExerciseProgressionCard
          progression={sampleProgressionUnexecuted}
          muscleGroup="Piernas"
        />
      );

      expect(screen.getByText('Sentadilla trasera')).toBeInTheDocument();
      expect(screen.getByText('No ejecutado (Ciclo cancelado)')).toBeInTheDocument();
      expect(screen.getByText('0 kg / Sin variación')).toBeInTheDocument();
    });
  });

  describe('MesocycleHistoryCard — Historial de mesociclos y estados (RF-06 CA-06.1)', () => {
    it('should render in a mobile-first container with max width 390px', () => {
      const { container } = render(
        <MesocycleHistoryCard item={sampleHistoryCompleted} />
      );

      const cardEl = container.querySelector('[data-testid="mesocycle-history-card"]');
      expect(cardEl).toBeInTheDocument();
      expect(cardEl?.className).toMatch(/max-w-\[390px\]/);
    });

    it('should ensure accordion toggle button has touch target height >= 48px', () => {
      const { container } = render(
        <MesocycleHistoryCard item={sampleHistoryCompleted} />
      );

      const toggleBtn = container.querySelector('button');
      expect(toggleBtn).toBeInTheDocument();
      const classNames = toggleBtn?.className || '';
      const hasTouchTarget =
        classNames.includes('touch-target') ||
        classNames.includes('min-h-[48px]') ||
        classNames.includes('h-12');
      expect(hasTouchTarget).toBe(true);
    });

    it('should display mesocycle name, goal, Spanish date range, completed badge, and adherence', () => {
      render(<MesocycleHistoryCard item={sampleHistoryCompleted} />);

      expect(screen.getByText('Mesociclo 1 - Hipertrofia V2')).toBeInTheDocument();
      expect(screen.getByTestId('mesocycle-goal')).toHaveTextContent(/hipertrofia/i);
      expect(screen.getByText('Completado')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(
        screen.getByText('Semana 6 de 6 completada (22 de 24 sesiones)')
      ).toBeInTheDocument();
    });

    it('should display "Completado (Descarga omitida)" badge when status is deload_skipped', () => {
      render(<MesocycleHistoryCard item={sampleHistoryDeloadSkipped} />);

      expect(screen.getByText('Completado (Descarga omitida)')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should display "Cancelado" badge and list executed and unexecuted cards when status is cancelled', () => {
      render(<MesocycleHistoryCard item={sampleHistoryCancelled} />);

      expect(screen.getByText('Cancelado')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(
        screen.getByText('Cancelado en semana 2 de 6 por molestia física')
      ).toBeInTheDocument();

      // Contains both the executed pullup and unexecuted squat
      expect(screen.getByText('Dominadas pronas')).toBeInTheDocument();
      expect(screen.getByText('Sentadilla trasera')).toBeInTheDocument();
      expect(screen.getByText('No ejecutado (Ciclo cancelado)')).toBeInTheDocument();
    });

    it('should toggle exercise progression cards list when accordion button is clicked', () => {
      render(
        <MesocycleHistoryCard
          item={sampleHistoryCompleted}
          defaultExpanded={true}
        />
      );

      // Initially expanded
      expect(screen.getByText('Dominadas pronas')).toBeInTheDocument();

      // Click to collapse
      const toggleBtn = screen.getByRole('button', { name: /comparativa de ejercicios/i });
      fireEvent.click(toggleBtn);

      // Cards should no longer be visible
      expect(screen.queryByText('Dominadas pronas')).not.toBeInTheDocument();

      // Click to expand again
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Dominadas pronas')).toBeInTheDocument();
    });
  });
});
