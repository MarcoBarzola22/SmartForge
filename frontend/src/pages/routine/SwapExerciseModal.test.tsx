import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SwapExerciseModal } from './SwapExerciseModal';
import { apiClient } from '../../api/client';
import type { ExerciseAssignment, ExerciseAlternative } from '../../api';

describe('TASK-67: SwapExerciseModal - Compatible Alternatives & Reason (RF-03, CA-03.1, CA-03.2, CA-03.4)', () => {
  const mockAssignment: ExerciseAssignment = {
    id: 'assign-101',
    session_plan_id: 'sess-1',
    exercise_id: 'ex-bench-barbell',
    exercise: {
      id: 'ex-bench-barbell',
      name: 'Press de Banca Plano con Barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      video_url: 'https://smartforge.test/bench',
      video_fallback_url: 'https://fallback.test/bench',
      instructions: 'Bajar controlado.',
      is_active: true
    },
    order_in_session: 1,
    target_sets: 4,
    target_reps: 8,
    target_rir: 2,
    target_load_kg: 80,
    is_swapped: false
  };

  const mockAlternatives: ExerciseAlternative[] = [
    {
      original_exercise_id: 'ex-bench-barbell',
      similarity_score: 0.95,
      alternative_exercise: {
        id: 'ex-bench-dumbbells',
        name: 'Press de Banca con Mancuernas',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        secondary_muscles: ['triceps', 'hombros'],
        equipment_id: 'dumbbells',
        is_compound: true,
        initial_load_ratio: 0.75,
        video_url: 'https://smartforge.test/db-bench',
        video_fallback_url: 'https://fallback.test/db-bench',
        instructions: 'Empujar con mancuernas.',
        is_active: true
      }
    },
    {
      original_exercise_id: 'ex-bench-barbell',
      similarity_score: 0.85,
      alternative_exercise: {
        id: 'ex-pushups',
        name: 'Flexiones de Brazos (Push-ups)',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        secondary_muscles: ['triceps', 'core'],
        equipment_id: 'bodyweight',
        is_compound: true,
        initial_load_ratio: 0.6,
        video_url: 'https://smartforge.test/pushups',
        video_fallback_url: 'https://fallback.test/pushups',
        instructions: 'Cuerpo en plancha.',
        is_active: true
      }
    }
  ];

  const updatedAssignment: ExerciseAssignment = {
    ...mockAssignment,
    exercise_id: 'ex-bench-dumbbells',
    exercise: mockAlternatives[0]!.alternative_exercise,
    is_swapped: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and display compatible alternative exercises filtered by equipment (CA-03.1)', async () => {
    vi.spyOn(apiClient.routine, 'getAlternatives').mockResolvedValue(mockAlternatives);

    render(
      <SwapExerciseModal
        isOpen={true}
        onClose={vi.fn()}
        assignment={mockAssignment}
      />
    );

    expect(screen.getByText(/Cambiar ejercicio/i)).toBeInTheDocument();
    expect(screen.getByText(/Press de Banca Plano con Barra/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Press de Banca con Mancuernas')).toBeInTheDocument();
      expect(screen.getByText('Flexiones de Brazos (Push-ups)')).toBeInTheDocument();
      expect(screen.getByText(/95% compatible/i)).toBeInTheDocument();
    });

    // Verify swap reason selectors (CA-03.4)
    expect(screen.getByRole('button', { name: /Falta de equipamiento/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preferencia personal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Molestia articular/i })).toBeInTheDocument();
  });

  it('should display warning message when no compatible alternative exists (CA-03.2)', async () => {
    vi.spyOn(apiClient.routine, 'getAlternatives').mockResolvedValue([]);

    render(
      <SwapExerciseModal
        isOpen={true}
        onClose={vi.fn()}
        assignment={mockAssignment}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No se encontró alternativa con tu equipamiento/i)
      ).toBeInTheDocument();
    });

    // Confirm swap button should be disabled when no alternative is selectable
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Cambio/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('should allow selecting an alternative, picking reason, and submitting swap to API (CA-03.4)', async () => {
    const onSwapSuccess = vi.fn();
    const onClose = vi.fn();

    vi.spyOn(apiClient.routine, 'getAlternatives').mockResolvedValue(mockAlternatives);
    const swapSpy = vi
      .spyOn(apiClient.routine, 'swapExercise')
      .mockResolvedValue(updatedAssignment);

    render(
      <SwapExerciseModal
        isOpen={true}
        onClose={onClose}
        assignment={mockAssignment}
        onSwapSuccess={onSwapSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Press de Banca con Mancuernas')).toBeInTheDocument();
    });

    // Select the first alternative
    const altOption = screen.getByRole('button', { name: /Seleccionar Press de Banca con Mancuernas/i });
    fireEvent.click(altOption);

    // Select reason: molestia_articular (CA-03.4)
    const reasonBtn = screen.getByRole('button', { name: /Molestia articular/i });
    fireEvent.click(reasonBtn);

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Cambio/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(swapSpy).toHaveBeenCalledWith('assign-101', {
        new_exercise_id: 'ex-bench-dumbbells',
        reason: 'molestia_articular',
        notes: undefined
      });
      expect(onSwapSuccess).toHaveBeenCalledWith(updatedAssignment);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should handle API error gracefully when swapping exercise fails', async () => {
    vi.spyOn(apiClient.routine, 'getAlternatives').mockResolvedValue(mockAlternatives);
    vi.spyOn(apiClient.routine, 'swapExercise').mockRejectedValue({
      status: 400,
      code: 'SWAP_ERROR',
      message: 'No se pudo realizar el cambio de ejercicio'
    });

    render(
      <SwapExerciseModal
        isOpen={true}
        onClose={vi.fn()}
        assignment={mockAssignment}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Press de Banca con Mancuernas')).toBeInTheDocument();
    });

    // Select alternative
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar Press de Banca con Mancuernas/i }));

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Cambio/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo realizar el cambio de ejercicio/i)
      ).toBeInTheDocument();
    });
  });
});
