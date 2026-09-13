import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExerciseDetailPage } from './ExerciseDetailPage';
import { apiClient } from '../../api/client';
import type { Exercise } from '../../api';

describe('TASK-73: ExerciseDetailPage - Exercise Biomechanical Detail & Video Player with Fallback (RF-09, CA-09.3, CL-14)', () => {
  const mockExercise: Exercise = {
    id: 'ex-bench-1',
    name: 'Press de Banca Plano con Barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.8,
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_fallback_url: 'https://fallback.smartforge.test/bench.mp4',
    instructions: '1. Acostarse en el banco plano con los pies apoyados.\n2. Bajar la barra de forma controlada al pecho medio.\n3. Empujar con potencia hasta extender los codos sin bloquear bruscamente.',
    is_active: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render exercise biomechanical metadata and instructions (RF-09, CA-09.1)', () => {
    render(<ExerciseDetailPage exercise={mockExercise} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Press de Banca Plano con Barra' })).toBeInTheDocument();
    expect(screen.getAllByText(/Empuje/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/pecho/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/triceps/i)).toBeInTheDocument();
    expect(screen.getByText(/hombros/i)).toBeInTheDocument();
    expect(screen.getByText(/Compuesto/i)).toBeInTheDocument();
    expect(screen.getByText(/Acostarse en el banco plano con los pies apoyados/i)).toBeInTheDocument();
  });

  it('should fetch exercise by ID if only exerciseId prop is provided', async () => {
    const getByIdSpy = vi.spyOn(apiClient.catalog, 'getById').mockResolvedValue(mockExercise);

    render(<ExerciseDetailPage exerciseId="ex-bench-1" />);

    expect(screen.getByText(/Cargando detalle del ejercicio/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(getByIdSpy).toHaveBeenCalledWith('ex-bench-1');
      expect(screen.getByRole('heading', { level: 1, name: 'Press de Banca Plano con Barra' })).toBeInTheDocument();
    });
  });

  it('should render external link button with target="_blank" to exercise video_url instead of iframe (T-88)', () => {
    render(<ExerciseDetailPage exercise={mockExercise} />);

    const videoLink = screen.getByRole('link', { name: /Ver demostración en YouTube/i });
    expect(videoLink).toBeInTheDocument();
    expect(videoLink).toHaveAttribute('href', mockExercise.video_url);
    expect(videoLink).toHaveAttribute('target', '_blank');
    expect(videoLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('should render illustrated Spanish fallback when video_url is empty or triggers error (CA-09.3, CL-14)', () => {
    const exerciseWithoutVideo: Exercise = {
      ...mockExercise,
      video_url: ''
    };

    render(<ExerciseDetailPage exercise={exerciseWithoutVideo} />);

    expect(screen.getByTestId('video-fallback-card')).toBeInTheDocument();
    expect(screen.getByText(/Video no disponible/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No se pudo cargar la demostración en video para/i)
    ).toBeInTheDocument();

    const searchLink = screen.getByRole('link', { name: /Buscar demostración en YouTube/i });
    expect(searchLink).toBeInTheDocument();
    expect(searchLink).toHaveAttribute('href', expect.stringContaining('youtube.com/results?search_query=Press'));
  });

  it('should invoke onBack callback when clicking back navigation button', () => {
    const backSpy = vi.fn();
    render(<ExerciseDetailPage exercise={mockExercise} onBack={backSpy} />);

    const backButton = screen.getByRole('button', { name: /Volver/i });
    fireEvent.click(backButton);

    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
