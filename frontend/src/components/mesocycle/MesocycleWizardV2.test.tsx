import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MesocycleWizardV2 } from './MesocycleWizardV2';
import { routineConfigStore } from '../../stores/routineConfig.store';
import type { GenerateMesocycleRequest } from '../../api';

describe('TASK-34: MesocycleWizardV2.tsx — Routine Engine V2 Mesocycle Setup Wizard (RF-03, RF-04, Constitución Art. 2)', () => {
  const mockOnGenerate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    routineConfigStore.reset(60);
  });

  describe('Ergonomía Mobile-First ≤ 390px (Constitución Art. 2)', () => {
    it('should render in a mobile-first container with max width 390px and no horizontal overflow', () => {
      const { container } = render(
        <MesocycleWizardV2 onGenerate={mockOnGenerate} />
      );

      const wizardEl = container.querySelector('[data-testid="mesocycle-wizard-v2"]');
      expect(wizardEl).toBeInTheDocument();
      expect(wizardEl?.className).toMatch(/max-w-\[390px\]/);
    });

    it('should ensure all interactive selector buttons and primary CTA have touch targets >= 48px', () => {
      const { container } = render(
        <MesocycleWizardV2 onGenerate={mockOnGenerate} />
      );

      // Buttons for days, duration, mode, submit
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((btn) => {
        const classNames = btn.className;
        const hasTouchTarget =
          classNames.includes('touch-target') ||
          classNames.includes('min-h-[48px]') ||
          classNames.includes('h-12');
        expect(hasTouchTarget).toBe(true);
      });
    });
  });

  describe('Días disponibles por semana (RF-03 CA-03.1)', () => {
    it('should allow selecting available days from 1 to 7 without fixed calendar pinning', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDays={4} />);

      // Verify buttons 1 to 7 are present
      for (let day = 1; day <= 7; day++) {
        expect(screen.getByRole('button', { name: new RegExp(`^${day} días?|^día ${day}`, 'i') })).toBeInTheDocument();
      }

      // Initial day is 4
      const day4Btn = screen.getByRole('button', { name: /^4 días?/i });
      expect(day4Btn).toHaveAttribute('aria-pressed', 'true');

      // Click day 5
      const day5Btn = screen.getByRole('button', { name: /^5 días?/i });
      fireEvent.click(day5Btn);

      expect(day5Btn).toHaveAttribute('aria-pressed', 'true');
      expect(day4Btn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Bloques fijos uniformes (RF-03 CA-03.2)', () => {
    it('should offer exclusively standard fixed time blocks: 30, 45, 60, 75, 90, 120 min', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDuration={60} />);

      const blocks = [30, 45, 60, 75, 90, 120];
      blocks.forEach((min) => {
        expect(screen.getByRole('button', { name: new RegExp(`${min}\\s*min`, 'i') })).toBeInTheDocument();
      });

      // 60 min is selected
      const block60 = screen.getByRole('button', { name: /60\s*min/i });
      expect(block60).toHaveAttribute('aria-pressed', 'true');

      // Select 45 min
      const block45 = screen.getByRole('button', { name: /45\s*min/i });
      fireEvent.click(block45);

      expect(block45).toHaveAttribute('aria-pressed', 'true');
      expect(block60).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Cálculo reactivo dinámico de N ejercicios diarios (RF-03 CA-03.3, CA-03.4)', () => {
    it('should reactively recalculate N when changing the time block in recommended mode', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDuration={60} />);

      // At 60 min, recommended is 4 exercises/day
      expect(screen.getByText(/recomendado por smartforge/i)).toBeInTheDocument();
      expect(screen.getByText('(4 ej/día)')).toBeInTheDocument();

      // Change to 30 min -> N should become 2
      fireEvent.click(screen.getByRole('button', { name: /30\s*min/i }));
      expect(screen.getByText('(2 ej/día)')).toBeInTheDocument();

      // Change to 90 min -> N should become 6
      fireEvent.click(screen.getByRole('button', { name: /90\s*min/i }));
      expect(screen.getByText('(6 ej/día)')).toBeInTheDocument();

      // Recommended mode is always viable
      const submitBtn = screen.getByRole('button', { name: /generar mesociclo/i });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('Conmutación a modo Manual y selección de 2 a 7 ej/día (RF-03 CA-03.3)', () => {
    it('should switch between recommended and manual mode and allow selecting custom count', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDuration={60} />);

      // Switch to manual mode
      const manualTab = screen.getByRole('button', { name: /manual|personalizado/i });
      fireEvent.click(manualTab);

      // Verify exercise count selector buttons (2 to 7) appear
      for (let count = 2; count <= 7; count++) {
        expect(screen.getByRole('button', { name: new RegExp(`^${count}\\s*ej`, 'i') })).toBeInTheDocument();
      }

      // Choose 3 exercises
      const count3Btn = screen.getByRole('button', { name: /^3\s*ej/i });
      fireEvent.click(count3Btn);
      expect(count3Btn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Validación de viabilidad y alertas pedagógicas (RF-04 CA-04.2, CA-04.3)', () => {
    it('should block generation and show pedagogical alert when manual count exceeds time budget (e.g. 4 exercises in 30 min)', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDuration={30} />);

      // Switch to manual mode
      fireEvent.click(screen.getByRole('button', { name: /manual|personalizado/i }));

      // Select 4 exercises for 30 minutes (max allowed is 3)
      fireEvent.click(screen.getByRole('button', { name: /^4\s*ej/i }));

      // Should show pedagogical warning explaining time deficit
      expect(screen.getByText(/excede el presupuesto para 30 minutos/i)).toBeInTheDocument();
      expect(screen.getByText(/máximo de 2 a 3 ejercicios/i)).toBeInTheDocument();

      // Submit button MUST be disabled
      const submitBtn = screen.getByRole('button', { name: /generar mesociclo/i });
      expect(submitBtn).toBeDisabled();
    });

    it('should block generation and show pedagogical alert when manual count is below minimum effective dose (e.g. 2 exercises in 90 min)', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDuration={90} />);

      // Switch to manual mode
      fireEvent.click(screen.getByRole('button', { name: /manual|personalizado/i }));

      // Select 2 exercises for 90 minutes (min allowed is 3)
      fireEvent.click(screen.getByRole('button', { name: /^2\s*ej/i }));

      // Should show pedagogical warning
      expect(screen.getByText(/inferior al mínimo efectivo para 90 minutos/i)).toBeInTheDocument();

      // Submit button MUST be disabled
      const submitBtn = screen.getByRole('button', { name: /generar mesociclo/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('Notas pedagógicas contextuales (RF-04 CA-04.4, CA-04.6)', () => {
    it('should display DME note when time and days represent a reduced schedule (e.g. 1 day, 30 min)', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDays={1} initialDuration={30} />);

      expect(screen.getByText(/rutina optimizada para tiempo reducido \(dosis mínima efectiva\)/i)).toBeInTheDocument();
    });

    it('should display volume ceiling note when availability is maximal (e.g. 7 days, 120 min, 7 exercises)', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDays={7} initialDuration={120} />);

      // Switch to manual and select 7 exercises
      fireEvent.click(screen.getByRole('button', { name: /manual|personalizado/i }));
      fireEvent.click(screen.getByRole('button', { name: /^7\s*ej/i }));

      expect(screen.getByText(/volumen ajustado jerárquicamente al techo seguro \(24 series\/músculo\/semana\)/i)).toBeInTheDocument();
    });
  });

  describe('Emisión de payload y confirmación (RF-03, RF-04, RF-05)', () => {
    it('should emit GenerateMesocycleRequest when confirming with valid configuration', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDays={4} initialDuration={60} />);

      const submitBtn = screen.getByRole('button', { name: /generar mesociclo/i });
      fireEvent.click(submitBtn);

      expect(mockOnGenerate).toHaveBeenCalledTimes(1);
      const payload: GenerateMesocycleRequest = mockOnGenerate.mock.calls[0][0];

      expect(payload).toEqual({
        availableDays: 4,
        sessionDurationMinutes: 60,
        exercisesPerSessionPreference: {
          mode: 'recommended',
          customCount: undefined
        }
      });
    });

    it('should emit manual customCount when confirming in manual mode', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} initialDays={3} initialDuration={45} />);

      // Switch to manual mode and pick 3 exercises
      fireEvent.click(screen.getByRole('button', { name: /manual|personalizado/i }));
      fireEvent.click(screen.getByRole('button', { name: /^3\s*ej/i }));

      const submitBtn = screen.getByRole('button', { name: /generar mesociclo/i });
      fireEvent.click(submitBtn);

      expect(mockOnGenerate).toHaveBeenCalledWith({
        availableDays: 3,
        sessionDurationMinutes: 45,
        exercisesPerSessionPreference: {
          mode: 'manual',
          customCount: 3
        }
      });
    });

    it('should show loading spinner and disable submit button when isSubmitting is true', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} isSubmitting={true} />);

      const submitBtn = screen.getByRole('button', { name: /generando rutina|generar mesociclo/i });
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/generando rutina/i)).toBeInTheDocument();
    });

    it('should trigger onClose when cancel/close button is pressed', () => {
      render(<MesocycleWizardV2 onGenerate={mockOnGenerate} onClose={mockOnClose} />);

      const closeBtn = screen.getByRole('button', { name: 'Cerrar' });
      fireEvent.click(closeBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should render null when isOpen is false', () => {
      const { container } = render(
        <MesocycleWizardV2 onGenerate={mockOnGenerate} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
