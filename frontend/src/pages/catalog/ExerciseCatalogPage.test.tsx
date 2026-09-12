import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExerciseCatalogPage } from './ExerciseCatalogPage';
import { apiClient } from '../../api/client';
import type { Exercise } from '../../api';

describe('TASK-72: ExerciseCatalogPage - Interactive Exercise Exploration and Filtering (RF-09, CA-09.1)', () => {
  const sampleExercises: Exercise[] = [
    {
      id: 'ex-bench',
      name: 'Press de Banca Plano con Barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      video_url: 'https://youtube.com/watch?v=bench',
      video_fallback_url: 'https://fallback.com/bench',
      instructions: 'Bajar barra al esternón y empujar con fuerza.',
      is_active: true
    },
    {
      id: 'ex-squat',
      name: 'Sentadilla Trasera con Barra',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.85,
      video_url: 'https://youtube.com/watch?v=squat',
      video_fallback_url: 'https://fallback.com/squat',
      instructions: 'Romper paralelo manteniendo torso neutro.',
      is_active: true
    },
    {
      id: 'ex-pullup',
      name: 'Dominadas Pronas',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'pullup_bar',
      is_compound: true,
      initial_load_ratio: 0.7,
      video_url: 'https://youtube.com/watch?v=pullup',
      video_fallback_url: 'https://fallback.com/pullup',
      instructions: 'Traccionar hasta superar la barra con la barbilla.',
      is_active: true
    },
    {
      id: 'ex-curl',
      name: 'Curl de Bíceps con Mancuernas',
      movement_pattern: 'tiron',
      primary_muscle: 'biceps',
      secondary_muscles: ['antebrazos' as any],
      equipment_id: 'dumbbell',
      is_compound: false,
      initial_load_ratio: 0.3,
      video_url: 'https://youtube.com/watch?v=curl',
      video_fallback_url: 'https://fallback.com/curl',
      instructions: 'Flexión de codos sin balanceo de cadera.',
      is_active: true
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render catalog header, search bar, filter tabs and load exercises from API (RF-09, CA-09.1)', async () => {
    const listSpy = vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

    render(<ExerciseCatalogPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Catálogo de Ejercicios/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar ejercicio por nombre o músculo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
      expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      expect(screen.getByText('Sentadilla Trasera con Barra')).toBeInTheDocument();
      expect(screen.getByText('Dominadas Pronas')).toBeInTheDocument();
      expect(screen.getByText('Curl de Bíceps con Mancuernas')).toBeInTheDocument();
    });
  });

  it('should filter exercises interactively in real time when searching by text query', async () => {
    vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

    render(<ExerciseCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar ejercicio por nombre o músculo/i);
    fireEvent.change(searchInput, { target: { value: 'Banca' } });

    expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    expect(screen.queryByText('Sentadilla Trasera con Barra')).not.toBeInTheDocument();
    expect(screen.queryByText('Dominadas Pronas')).not.toBeInTheDocument();
  });

  it('should filter exercises by movement pattern tab selection', async () => {
    vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

    render(<ExerciseCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    });

    // Click on "Rodilla dominante" filter button
    const patternBtn = screen.getByRole('button', { name: /Rodilla dominante/i });
    fireEvent.click(patternBtn);

    expect(screen.getByText('Sentadilla Trasera con Barra')).toBeInTheDocument();
    expect(screen.queryByText('Press de Banca Plano con Barra')).not.toBeInTheDocument();
    expect(screen.queryByText('Dominadas Pronas')).not.toBeInTheDocument();
  });

  it('should filter exercises by primary muscle group chip', async () => {
    vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

    render(<ExerciseCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    });

    // Filter by "Espalda"
    const muscleSelect = screen.getByRole('combobox', { name: /Filtrar por músculo/i });
    fireEvent.change(muscleSelect, { target: { value: 'espalda' } });

    expect(screen.getByText('Dominadas Pronas')).toBeInTheDocument();
    expect(screen.queryByText('Press de Banca Plano con Barra')).not.toBeInTheDocument();
    expect(screen.queryByText('Sentadilla Trasera con Barra')).not.toBeInTheDocument();
  });

  it('should show empty state message when no exercises match search query', async () => {
    vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

    render(<ExerciseCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar ejercicio por nombre o músculo/i);
    fireEvent.change(searchInput, { target: { value: 'Ejercicio Inexistente XYZ' } });

    expect(screen.getByText(/No se encontraron ejercicios con los filtros seleccionados/i)).toBeInTheDocument();
  });

  it('should call onSelectExercise callback when user clicks on an exercise card', async () => {
    vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);
    const selectSpy = vi.fn();

    render(<ExerciseCatalogPage onSelectExercise={selectSpy} />);

    await waitFor(() => {
      expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
    });

    const benchCard = screen.getByText('Press de Banca Plano con Barra').closest('[data-testid="exercise-card"]');
    expect(benchCard).toBeInTheDocument();
    if (benchCard) {
      fireEvent.click(benchCard);
      expect(selectSpy).toHaveBeenCalledWith(sampleExercises[0]);
    }
  });
});
