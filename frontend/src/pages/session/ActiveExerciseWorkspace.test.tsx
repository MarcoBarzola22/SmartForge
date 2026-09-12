import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActiveExerciseWorkspace, ActiveExerciseWorkspaceProps } from './ActiveExerciseWorkspace';

describe('T-18: ActiveExerciseWorkspace.tsx con Sticky Workspace (RF-05, RF-07, CF-06)', () => {
  const defaultProps: ActiveExerciseWorkspaceProps = {
    exerciseName: 'Press de Banca Plano con Barra',
    targetSets: 3,
    targetReps: 8,
    targetLoadKg: 80,
    targetRir: 2,
    completedSets: [],
    onLogSet: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe('1. Anclaje en mitad inferior (Sticky Workspace) y diseño ergonómico a una mano (RF-07, CF-06)', () => {
    it('renderiza la serie activa centrada en la zona de pulgar dentro de un contenedor accesible', () => {
      render(<ActiveExerciseWorkspace {...defaultProps} />);

      const workspace = screen.getByTestId('active-exercise-workspace');
      expect(workspace).toBeInTheDocument();
      expect(workspace.className).toContain('w-full');
      expect(workspace.className).toContain('max-w-[390px]');

      const activeSetCard = screen.getByTestId('active-set-container');
      expect(activeSetCard).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Serie 1/i })).toBeInTheDocument();
    });

    it('en viewport estrecho de 320px no genera desbordamiento horizontal', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <div style={{ width: '320px' }}>
          <ActiveExerciseWorkspace {...defaultProps} />
        </div>,
        { container }
      );

      const workspace = screen.getByTestId('active-exercise-workspace');
      expect(workspace.className).toContain('overflow-x-hidden');

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('2. Auto-scroll suave hacia la mitad inferior tras completar una serie (RF-07)', () => {
    it('ejecuta scrollIntoView con behavior: smooth y block: end/center al completar una serie', async () => {
      const handleLogSet = vi.fn();
      const scrollSpy = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollSpy;

      const { rerender } = render(
        <ActiveExerciseWorkspace
          {...defaultProps}
          onLogSet={handleLogSet}
          completedSets={[]}
        />
      );

      // Completar la serie 1
      const checkBtn = screen.getByRole('button', { name: /completar serie/i });
      fireEvent.click(checkBtn);

      expect(handleLogSet).toHaveBeenCalledTimes(1);

      // Rerender simulando que la serie 1 se completó y ahora toca la serie 2
      rerender(
        <ActiveExerciseWorkspace
          {...defaultProps}
          onLogSet={handleLogSet}
          completedSets={[
            {
              id: 'set-1',
              session_id: 'sess-1',
              exercise_id: 'ex-1',
              set_number: 1,
              weight_kg: 80,
              reps_completed: 8,
              rir: 2,
              client_timestamp: '2026-09-12T10:00:00Z',
              created_at: '2026-09-12T10:00:00Z',
            },
          ]}
        />
      );

      await waitFor(() => {
        expect(scrollSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: 'smooth',
          })
        );
      });

      expect(screen.getByRole('heading', { name: /Serie 2/i })).toBeInTheDocument();
    });

    it('muestra el historial de series completadas previas en bloque no intrusivo', () => {
      render(
        <ActiveExerciseWorkspace
          {...defaultProps}
          completedSets={[
            {
              id: 'set-1',
              session_id: 'sess-1',
              exercise_id: 'ex-1',
              set_number: 1,
              weight_kg: 80,
              reps_completed: 8,
              rir: 2,
              client_timestamp: '2026-09-12T10:00:00Z',
              created_at: '2026-09-12T10:00:00Z',
            },
          ]}
        />
      );

      expect(
        screen.getByRole('heading', { name: /series completadas/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/80 kg × 8 reps/i)).toBeInTheDocument();
    });
  });
});
