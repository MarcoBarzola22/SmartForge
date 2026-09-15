import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutineHistoryPage } from './RoutineHistoryPage';
import { apiClient } from '../../api/client';
import type { MesocycleHistoryItem } from '../../api/generated/types';

describe('TASK-40: RoutineHistoryPage — Completed & Cancelled Mesocycle History (RF-06, Constitución Art. 2, Art. 6)', () => {
  const mockHistoryItems: MesocycleHistoryItem[] = [
    {
      id: 'meso-hist-1',
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
          baseline: {
            loadText: '80.0 kg × 8 reps',
            e1rmKg: 99.3
          },
          final: {
            loadText: '85.0 kg × 8 reps',
            e1rmKg: 105.5,
            executed: true
          },
          progress: {
            deltaKg: 6.2,
            deltaPercent: 6.2
          }
        },
        {
          exerciseId: 'ex-pullup',
          exerciseName: 'Dominadas con Lastre',
          loadType: 'bodyweight_loadable',
          baseline: {
            loadText: '78.0 kg (PC) + 5.0 kg × 6 reps',
            e1rmKg: 96.4
          },
          final: {
            loadText: '77.5 kg (PC) + 10.0 kg × 6 reps',
            e1rmKg: 101.6,
            executed: true
          },
          progress: {
            deltaKg: 5.2,
            deltaPercent: 5.4
          }
        }
      ]
    },
    {
      id: 'meso-hist-2',
      name: 'Fuerza Bloques Uniformes',
      goal: 'fuerza',
      startDate: '2026-07-01',
      endDate: '2026-07-25',
      status: 'deload_skipped',
      adherencePercent: 95,
      adherenceDetails: 'Descarga omitida voluntariamente',
      exerciseProgressions: [
        {
          exerciseId: 'ex-squat',
          exerciseName: 'Sentadilla Trasera',
          loadType: 'external_load',
          baseline: {
            loadText: '100.0 kg × 5 reps',
            e1rmKg: 112.5
          },
          final: {
            loadText: '110.0 kg × 5 reps',
            e1rmKg: 123.8,
            executed: true
          },
          progress: {
            deltaKg: 11.3,
            deltaPercent: 10.0
          }
        }
      ]
    },
    {
      id: 'meso-hist-3',
      name: 'Torso-Pierna Interrumpido',
      goal: 'hipertrofia',
      startDate: '2026-06-01',
      endDate: '2026-06-12',
      status: 'cancelled',
      adherencePercent: 42,
      adherenceDetails: 'Cancelado por falta de tiempo (Semana 2)',
      exerciseProgressions: [
        {
          exerciseId: 'ex-overhead',
          exerciseName: 'Press Militar',
          loadType: 'external_load',
          baseline: {
            loadText: '50.0 kg × 8 reps',
            e1rmKg: 62.1
          },
          final: {
            loadText: '52.5 kg × 8 reps',
            e1rmKg: 65.2,
            executed: true
          },
          progress: {
            deltaKg: 3.1,
            deltaPercent: 5.0
          }
        },
        {
          exerciseId: 'ex-unexecuted',
          exerciseName: 'Elevaciones Laterales',
          loadType: 'external_load',
          baseline: {
            loadText: '10.0 kg × 12 reps',
            e1rmKg: 14.3
          },
          final: {
            loadText: 'Sin registro',
            e1rmKg: 0,
            executed: false
          }
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Carga y Listado de Historial Cronológico Inverso (RF-06 CA-06.1)', () => {
    it('should display loading skeleton while fetching history from API', () => {
      vi.spyOn(apiClient.mesocycles, 'getHistory').mockReturnValue(new Promise(() => {}));

      render(<RoutineHistoryPage />);

      expect(screen.getByTestId('history-loading-state')).toBeInTheDocument();
    });

    it('should render mesocycles in inverse chronological order with visible status badges', async () => {
      vi.spyOn(apiClient.mesocycles, 'getHistory').mockResolvedValue(mockHistoryItems);

      render(<RoutineHistoryPage />);

      await waitFor(() => {
        expect(screen.getByTestId('history-list')).toBeInTheDocument();
      });

      // Header title & subtitle
      expect(screen.getByRole('heading', { name: /historial de mesociclos/i })).toBeInTheDocument();
      expect(screen.getByText(/evolución y registro histórico de cargas/i)).toBeInTheDocument();

      // Distinct visible status badges (RF-06 CA-06.1)
      expect(screen.getByText('Completado')).toBeInTheDocument();
      expect(screen.getByText('Completado (Descarga omitida)')).toBeInTheDocument();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();

      // Adherence percentages
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('42%')).toBeInTheDocument();

      // Dates in Spanish
      expect(screen.getByText(/1 ago 2026 — 28 ago 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/1 jul 2026 — 25 jul 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/1 jun 2026 — 12 jun 2026/i)).toBeInTheDocument();

      // Order: Meso 1 (Aug), Meso 2 (Jul), Meso 3 (Jun)
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[0]).toHaveTextContent('Mesociclo de Hipertrofia V2');
      expect(titles[1]).toHaveTextContent('Fuerza Bloques Uniformes');
      expect(titles[2]).toHaveTextContent('Torso-Pierna Interrumpido');
    });

    it('should display empty state when history is empty', async () => {
      vi.spyOn(apiClient.mesocycles, 'getHistory').mockResolvedValue([]);

      render(<RoutineHistoryPage />);

      await waitFor(() => {
        expect(screen.getByTestId('history-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/sin mesociclos en el historial/i)).toBeInTheDocument();
      expect(screen.getByText(/aún no has completado ni cancelado ningún mesociclo/i)).toBeInTheDocument();
    });

    it('should display error message if API call fails', async () => {
      vi.spyOn(apiClient.mesocycles, 'getHistory').mockRejectedValue(new Error('Fallo de red'));

      render(<RoutineHistoryPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText('Fallo de red')).toBeInTheDocument();
    });
  });

  describe('Tarjetas de Progresión por Ejercicio y Comparativas de 1RM (RF-06 CA-06.4, CA-06.5)', () => {
    it('should display exercise progression cards with baseline, final load, and estimated 1RM delta', async () => {
      render(<RoutineHistoryPage initialHistory={mockHistoryItems} />);

      // The cards are collapsed by default in the list, toggle first card
      const toggleButtons = screen.getAllByRole('button', { name: /ver comparativa de ejercicios/i });
      expect(toggleButtons.length).toBeGreaterThan(0);

      // Expand first mesocycle card
      fireEvent.click(toggleButtons[0]!);

      // Verify exercise progressions
      await waitFor(() => {
        expect(screen.getByText('Press de Banca Plano')).toBeInTheDocument();
        expect(screen.getByText('Dominadas con Lastre')).toBeInTheDocument();
      });

      // Taxonomía de cargas (CA-06.2)
      expect(screen.getByText(/carga externa/i)).toBeInTheDocument();
      expect(screen.getByText(/corporal con lastre/i)).toBeInTheDocument();

      // Punto de partida y carga final alcanzada
      expect(screen.getByText('80.0 kg × 8 reps')).toBeInTheDocument();
      expect(screen.getByText('85.0 kg × 8 reps')).toBeInTheDocument();

      // Delta 1RM est.
      expect(screen.getByText(/\+6\.2 kg \(\+6\.2% 1RM est\.\)/i)).toBeInTheDocument();
      expect(screen.getByText(/\+5\.2 kg \(\+5\.4% 1RM est\.\)/i)).toBeInTheDocument();
    });

    it('should display unexecuted state for exercises in cancelled mesocycle (RF-06 CA-06.5)', async () => {
      render(<RoutineHistoryPage initialHistory={mockHistoryItems} />);

      // Find toggle for the cancelled mesocycle (3rd card)
      const toggleButtons = screen.getAllByRole('button', { name: /ver comparativa de ejercicios/i });
      fireEvent.click(toggleButtons[2]!);

      // Unexecuted exercise shows 0 kg / Sin variación
      await waitFor(() => {
        expect(screen.getByText('Elevaciones Laterales')).toBeInTheDocument();
        expect(screen.getByText('0 kg / Sin variación')).toBeInTheDocument();
      });
    });
  });

  describe('Filtros de Visualización por Estado', () => {
    it('should filter items by "Completados" and hide cancelled mesocycles', async () => {
      render(<RoutineHistoryPage initialHistory={mockHistoryItems} />);

      const completedFilterBtn = screen.getByRole('button', { name: /completados/i });
      fireEvent.click(completedFilterBtn);

      // Only completed and deload_skipped should be visible
      expect(screen.getByText('Mesociclo de Hipertrofia V2')).toBeInTheDocument();
      expect(screen.getByText('Fuerza Bloques Uniformes')).toBeInTheDocument();
      expect(screen.queryByText('Torso-Pierna Interrumpido')).not.toBeInTheDocument();
    });

    it('should filter items by "Cancelados" and hide completed mesocycles', async () => {
      render(<RoutineHistoryPage initialHistory={mockHistoryItems} />);

      const cancelledFilterBtn = screen.getByRole('button', { name: /cancelados/i });
      fireEvent.click(cancelledFilterBtn);

      // Only cancelled should be visible
      expect(screen.getByText('Torso-Pierna Interrumpido')).toBeInTheDocument();
      expect(screen.queryByText('Mesociclo de Hipertrofia V2')).not.toBeInTheDocument();
      expect(screen.queryByText('Fuerza Bloques Uniformes')).not.toBeInTheDocument();
    });

    it('should show filter empty message when no items match the selected filter', async () => {
      const onlyCompleted: MesocycleHistoryItem[] = [mockHistoryItems[0]!];
      render(<RoutineHistoryPage initialHistory={onlyCompleted} />);

      // Click "Cancelados"
      const cancelledFilterBtn = screen.getByRole('button', { name: /cancelados/i });
      fireEvent.click(cancelledFilterBtn);

      expect(screen.getByTestId('history-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/no hay mesociclos registrados para este filtro/i)).toBeInTheDocument();
    });
  });

  describe('Navegación y Ergonomía Mobile-First (<= 390px, Constitución Art. 2)', () => {
    it('should call onBack callback when clicking back button', () => {
      const onBackMock = vi.fn();
      render(<RoutineHistoryPage initialHistory={mockHistoryItems} onBack={onBackMock} />);

      const backBtn = screen.getByRole('button', { name: /volver/i });
      expect(backBtn).toBeInTheDocument();
      expect(backBtn.className).toMatch(/touch-target|min-h-\[48px\]/);

      fireEvent.click(backBtn);
      expect(onBackMock).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectMesocycle when clicking a mesocycle card', () => {
      const onSelectMock = vi.fn();
      render(<RoutineHistoryPage initialHistory={mockHistoryItems} onSelectMesocycle={onSelectMock} />);

      const mesoTitle = screen.getByText('Mesociclo de Hipertrofia V2');
      fireEvent.click(mesoTitle);

      expect(onSelectMock).toHaveBeenCalledWith('meso-hist-1');
    });

    it('should enforce max-w-[390px], overflow-x-hidden and touch target compliance', () => {
      const { container } = render(<RoutineHistoryPage initialHistory={mockHistoryItems} onBack={vi.fn()} />);

      const mainContainer = screen.getByTestId('routine-history-container');
      expect(mainContainer.className).toContain('max-w-[390px]');
      expect(mainContainer.className).toContain('overflow-x-hidden');

      // Zero multi-column grids in the page container level
      expect(mainContainer.classList.contains('grid-cols-2')).toBe(false);

      // Verify touch targets >= 48px on all interactive buttons
      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        const hasMinH = btn.className.includes('min-h-[48px]') || btn.className.includes('h-12');
        const hasTouchTarget = btn.className.includes('touch-target');
        expect(hasMinH || hasTouchTarget).toBe(true);
      });
    });
  });
});
