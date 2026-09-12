import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExerciseCatalogPage } from './ExerciseCatalogPage';
import { apiClient } from '../../api/client';
import type { Exercise } from '../../api';

describe('T-22: ExerciseCatalogPage con búsqueda y filtros en mitad inferior (RF-04, RF-05, RF-06, CF-06)', () => {
  const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/;

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
      is_active: true,
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
      is_active: true,
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
      is_active: true,
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
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Cero scroll horizontal y dianas táctiles en zona de pulgar (RF-04, CF-06)', () => {
    it('renderiza la barra de búsqueda y el disparador de filtros en la mitad inferior fija (sticky/fixed)', async () => {
      vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

      render(<ExerciseCatalogPage />);

      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      });

      const bottomBar = screen.getByTestId('catalog-search-dock');
      expect(bottomBar).toBeInTheDocument();
      expect(bottomBar.className).toMatch(/sticky|fixed/);
      expect(bottomBar.className).toContain('bottom-0');

      // Botón "Filtrar" accesible >= 48px
      const filterBtn = screen.getByRole('button', { name: /filtrar/i });
      expect(filterBtn).toBeInTheDocument();
      expect(filterBtn.className).toMatch(TOUCH_TARGET_REGEX);

      // Input de búsqueda
      const searchInput = screen.getByPlaceholderText(/buscar ejercicio/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('la página no contiene clases de scroll horizontal como overflow-x-auto', async () => {
      vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

      const { container } = render(<ExerciseCatalogPage />);

      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      });

      // No debe existir overflow-x-auto en ningún elemento
      const horizontalScrollers = container.querySelectorAll('.overflow-x-auto');
      expect(horizontalScrollers.length).toBe(0);
    });

    it('en viewport estrecho de 320px aplica w-full sin desborde horizontal', async () => {
      vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <div style={{ width: '320px' }}>
          <ExerciseCatalogPage />
        </div>,
        { container }
      );

      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      });

      const mainContainer = container.querySelector('[data-testid="catalog-main"]');
      expect(mainContainer?.className).toContain('overflow-x-hidden');

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('2. Búsqueda y filtrado interactivo en tiempo real (RF-06, CF-06)', () => {
    it('filtra ejercicios por texto en tiempo real', async () => {
      vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

      render(<ExerciseCatalogPage />);

      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar ejercicio/i);
      fireEvent.change(searchInput, { target: { value: 'Sentadilla' } });

      expect(screen.getByText('Sentadilla Trasera con Barra')).toBeInTheDocument();
      expect(screen.queryByText('Press de Banca Plano con Barra')).not.toBeInTheDocument();
    });

    it('abre el FilterBottomSheet y filtra por músculo al aplicar', async () => {
      vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

      render(<ExerciseCatalogPage />);

      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      });

      // Abrir Bottom Sheet de filtros
      const filterBtn = screen.getByRole('button', { name: /filtrar/i });
      fireEvent.click(filterBtn);

      // Seleccionar "Espalda" y aplicar
      const espaldaChip = screen.getByRole('button', { name: /^espalda$/i });
      fireEvent.click(espaldaChip);

      const applyBtn = screen.getByRole('button', { name: /aplicar filtros/i });
      fireEvent.click(applyBtn);

      // Debe mostrar sólo dominadas
      expect(screen.getByText('Dominadas Pronas')).toBeInTheDocument();
      expect(screen.queryByText('Press de Banca Plano con Barra')).not.toBeInTheDocument();
      expect(screen.queryByText('Sentadilla Trasera con Barra')).not.toBeInTheDocument();
    });

    it('muestra estado vacío accesible en español cuando no hay coincidencias', async () => {
      vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);

      render(<ExerciseCatalogPage />);

      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar ejercicio/i);
      fireEvent.change(searchInput, { target: { value: 'Inexistente XYZ' } });

      expect(
        screen.getByText(/No se encontraron ejercicios/i)
      ).toBeInTheDocument();
    });

    it('invoca onSelectExercise al pulsar sobre una tarjeta de ejercicio', async () => {
      vi.spyOn(apiClient.catalog, 'list').mockResolvedValue(sampleExercises);
      const onSelectSpy = vi.fn();

      render(<ExerciseCatalogPage onSelectExercise={onSelectSpy} />);

      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano con Barra')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Press de Banca Plano con Barra'));
      expect(onSelectSpy).toHaveBeenCalledWith(sampleExercises[0]);
    });
  });
});
