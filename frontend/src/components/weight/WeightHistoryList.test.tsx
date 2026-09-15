import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeightHistoryList } from './WeightHistoryList';
import type { WeightLogItem } from '../../api/generated/types';

describe('TASK-33: WeightHistoryList.tsx — Chronological Weight History & Retroactive Logging (RF-02, Constitución Art. 2)', () => {
  const mockOnEditLog = vi.fn();
  const mockOnLogRetroactive = vi.fn();
  const mockOnAddNewLog = vi.fn();

  const sampleLogs: WeightLogItem[] = [
    {
      id: 'log-3',
      athlete_id: 'ath-1',
      weight_kg: 76.5,
      calendar_week_start: '2026-09-07',
      logged_date: '2026-09-10',
      delta_kg: -0.5,
      created_at: '2026-09-10T08:00:00.000Z'
    },
    // Missing week: 2026-08-31
    {
      id: 'log-1',
      athlete_id: 'ath-1',
      weight_kg: 77.0,
      calendar_week_start: '2026-08-24',
      logged_date: '2026-08-26',
      delta_kg: null,
      created_at: '2026-08-26T08:00:00.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile-First Layout and 390px Ergonomics (Constitución Art. 2)', () => {
    it('should render vertically stacked cards without horizontal overflow in <= 390px', () => {
      render(
        <WeightHistoryList
          logs={sampleLogs}
          onEditLog={mockOnEditLog}
          onLogRetroactive={mockOnLogRetroactive}
        />
      );

      const container = screen.getByTestId('weight-history-list');
      expect(container).toBeInTheDocument();
      expect(container.className).toMatch(/max-w-\[390px\]|w-full/);
    });

    it('all interactive buttons and card tap targets must have height >= 48px (touch target rule)', () => {
      render(
        <WeightHistoryList
          logs={sampleLogs}
          onEditLog={mockOnEditLog}
          onLogRetroactive={mockOnLogRetroactive}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((btn) => {
        expect(btn.className).toMatch(/min-h-\[48px\]|touch-target/);
      });
    });
  });

  describe('Chronological Listing with Weight and Deltas (RF-02 CA-02.1)', () => {
    it('should list all registered weight logs with date, weight in kg, and delta', () => {
      render(
        <WeightHistoryList
          logs={sampleLogs}
          onEditLog={mockOnEditLog}
        />
      );

      // Weights
      expect(screen.getByText('76.5 kg')).toBeInTheDocument();
      expect(screen.getByText('77.0 kg')).toBeInTheDocument();

      // Deltas
      expect(screen.getByText('-0.5 kg')).toBeInTheDocument();
      expect(screen.getByText('Inicial')).toBeInTheDocument();

      // Dates
      expect(screen.getByText(/10 sep 2026|2026-09-10/i)).toBeInTheDocument();
      expect(screen.getByText(/26 ago 2026|2026-08-26/i)).toBeInTheDocument();
    });

    it('should display positive delta with plus sign (e.g. +1.2 kg)', () => {
      const logsWithGain: WeightLogItem[] = [
        {
          id: 'log-gain',
          athlete_id: 'ath-1',
          weight_kg: 78.2,
          calendar_week_start: '2026-09-14',
          logged_date: '2026-09-14',
          delta_kg: 1.2,
          created_at: '2026-09-14T08:00:00.000Z'
        }
      ];

      render(<WeightHistoryList logs={logsWithGain} onEditLog={mockOnEditLog} />);
      expect(screen.getByText('+1.2 kg')).toBeInTheDocument();
    });

    it('should trigger onEditLog when clicking an existing weight log card or edit button', () => {
      render(
        <WeightHistoryList
          logs={sampleLogs}
          onEditLog={mockOnEditLog}
        />
      );

      const editBtn = screen.getByLabelText('Editar pesaje del 2026-09-10');
      fireEvent.click(editBtn);

      expect(mockOnEditLog).toHaveBeenCalledWith(sampleLogs[0]);
    });
  });

  describe('Retroactive Logging for Missing Weeks (RF-02 CA-02.2)', () => {
    it('should detect gaps in calendar weeks and render a retroactive logging slot', () => {
      render(
        <WeightHistoryList
          logs={sampleLogs}
          onEditLog={mockOnEditLog}
          onLogRetroactive={mockOnLogRetroactive}
          showMissingWeeks={true}
        />
      );

      // There is a missing week for 2026-08-31
      expect(screen.getByText(/semana sin registro|semana pendiente/i)).toBeInTheDocument();
      expect(screen.getByText(/31 ago 2026|2026-08-31/i)).toBeInTheDocument();
    });

    it('should trigger onLogRetroactive with missing week start date when clicking retroactive slot button', () => {
      render(
        <WeightHistoryList
          logs={sampleLogs}
          onEditLog={mockOnEditLog}
          onLogRetroactive={mockOnLogRetroactive}
          showMissingWeeks={true}
        />
      );

      const retroactiveBtn = screen.getByRole('button', { name: /cargar pesaje|registrar semana/i });
      fireEvent.click(retroactiveBtn);

      expect(mockOnLogRetroactive).toHaveBeenCalledWith('2026-08-31');
    });

    it('should allow triggering onLogRetroactive or onAddNewLog from top action button', () => {
      render(
        <WeightHistoryList
          logs={sampleLogs}
          onLogRetroactive={mockOnLogRetroactive}
          onAddNewLog={mockOnAddNewLog}
        />
      );

      const addBtn = screen.getByRole('button', { name: /nuevo pesaje|registrar peso/i });
      fireEvent.click(addBtn);

      expect(mockOnAddNewLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty and Loading States', () => {
    it('should render helpful empty state when logs list is empty', () => {
      render(
        <WeightHistoryList
          logs={[]}
          onAddNewLog={mockOnAddNewLog}
        />
      );

      expect(screen.getByText(/no tienes pesajes registrados/i)).toBeInTheDocument();
      const firstLogBtn = screen.getByRole('button', { name: /registrar primer pesaje/i });
      fireEvent.click(firstLogBtn);
      expect(mockOnAddNewLog).toHaveBeenCalledTimes(1);
    });

    it('should display loading indicator when isLoading is true', () => {
      render(
        <WeightHistoryList
          logs={[]}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('weight-history-loading')).toBeInTheDocument();
    });
  });
});
