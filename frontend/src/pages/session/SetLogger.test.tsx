import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetLogger } from './SetLogger';
import type { SetLog } from '../../api';

describe('TASK-69: SetLogger - Rapid Touch Set Logging (RF-05, RNF-01, CA-05.1, CA-05.2, CA-05.5)', () => {
  const defaultProps = {
    exerciseId: 'ex-bench-101',
    exerciseName: 'Press de Banca Plano con Barra',
    targetSets: 4,
    targetReps: 8,
    targetLoadKg: 80,
    targetRir: 2,
    completedSets: [] as SetLog[],
    onLogSet: vi.fn(),
    onUpdateSet: vi.fn(),
    onDeleteSet: vi.fn()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should display target reps, target load and pre-load suggested values for 1-tap logging (CA-05.1, CA-05.2, CA-05.3)', () => {
    render(<SetLogger {...defaultProps} />);

    expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    expect(screen.getByText(/Objetivo: 4 × 8 reps @ 80 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/RIR Objetivo: 2/i)).toBeInTheDocument();

    // Verify pre-loaded values in inputs
    const weightInput = screen.getByLabelText(/Peso \(kg\)/i);
    const repsInput = screen.getByLabelText(/Repeticiones/i);
    expect(weightInput).toHaveValue(80);
    expect(repsInput).toHaveValue(8);

    // Verify 1-tap confirm button
    const confirmBtn = screen.getByRole('button', { name: /Registrar Serie 1/i });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn.className).toMatch(/min-h-\[48px\]|min-h-\[52px\]|touch-target/);
  });

  it('should log set with 1 tap when accepting pre-loaded values (CA-05.2)', async () => {
    const onLogSet = vi.fn().mockResolvedValue(undefined);
    render(<SetLogger {...defaultProps} onLogSet={onLogSet} />);

    const confirmBtn = screen.getByRole('button', { name: /Registrar Serie 1/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onLogSet).toHaveBeenCalledTimes(1);
      expect(onLogSet).toHaveBeenCalledWith(
        expect.objectContaining({
          exercise_id: 'ex-bench-101',
          set_number: 1,
          weight_kg: 80,
          reps_completed: 8,
          rir: 2,
          client_timestamp: expect.any(String)
        })
      );
    });
  });

  it('should support quick increment/decrement buttons for weight and reps with 0.5kg precision (CA-05.5, RNF-01)', async () => {
    const onLogSet = vi.fn().mockResolvedValue(undefined);
    render(<SetLogger {...defaultProps} onLogSet={onLogSet} />);

    const weightInput = screen.getByLabelText(/Peso \(kg\)/i);
    const repsInput = screen.getByLabelText(/Repeticiones/i);

    // Increase weight by +2.5 kg
    const plusTwoPointFive = screen.getByRole('button', { name: /\+2\.5/i });
    fireEvent.click(plusTwoPointFive);
    expect(weightInput).toHaveValue(82.5);

    // Increase reps by +1
    const plusOneRep = screen.getByRole('button', { name: /\+1 rep/i });
    fireEvent.click(plusOneRep);
    expect(repsInput).toHaveValue(9);

    // Change RIR to 1
    const rirOneBtn = screen.getByRole('button', { name: /RIR 1/i });
    fireEvent.click(rirOneBtn);

    // Submit
    const confirmBtn = screen.getByRole('button', { name: /Registrar Serie 1/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onLogSet).toHaveBeenCalledWith(
        expect.objectContaining({
          exercise_id: 'ex-bench-101',
          set_number: 1,
          weight_kg: 82.5,
          reps_completed: 9,
          rir: 1
        })
      );
    });
  });

  it('should allow weight_kg = 0 for bodyweight exercises (CA-05.5)', async () => {
    const onLogSet = vi.fn().mockResolvedValue(undefined);
    render(
      <SetLogger
        {...defaultProps}
        exerciseName="Dominadas en barra"
        targetLoadKg={0}
        onLogSet={onLogSet}
      />
    );

    const weightInput = screen.getByLabelText(/Peso \(kg\)/i);
    expect(weightInput).toHaveValue(0);

    const confirmBtn = screen.getByRole('button', { name: /Registrar Serie 1/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onLogSet).toHaveBeenCalledWith(
        expect.objectContaining({
          weight_kg: 0
        })
      );
    });
  });

  it('should display list of completed sets with edit and delete capabilities (CA-05.4)', () => {
    const completedSets: SetLog[] = [
      {
        id: 'set-log-1',
        session_id: 'sess-1',
        exercise_id: 'ex-bench-101',
        set_number: 1,
        reps_completed: 8,
        weight_kg: 80,
        rir: 2,
        client_timestamp: '2026-09-12T10:00:00Z',
        created_at: '2026-09-12T10:00:00Z'
      },
      {
        id: 'set-log-2',
        session_id: 'sess-1',
        exercise_id: 'ex-bench-101',
        set_number: 2,
        reps_completed: 8,
        weight_kg: 80,
        rir: 1,
        client_timestamp: '2026-09-12T10:03:00Z',
        created_at: '2026-09-12T10:03:00Z'
      }
    ];

    const onDeleteSet = vi.fn();
    render(
      <SetLogger
        {...defaultProps}
        completedSets={completedSets}
        onDeleteSet={onDeleteSet}
      />
    );

    // Next set should be Serie 3
    expect(screen.getByRole('button', { name: /Registrar Serie 3/i })).toBeInTheDocument();

    // Completed sets rendered
    expect(screen.getByText(/Serie 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Serie 2/i)).toBeInTheDocument();

    // Delete first completed set
    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar serie/i });
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[0]!);

    expect(onDeleteSet).toHaveBeenCalledWith('set-log-1');
  });
});
