import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmptyMesocycleState } from './EmptyMesocycleState';

describe('TASK-36: EmptyMesocycleState.tsx — "Sin mesociclo activo" State & Wizard CTA (RF-07, Constitución Art. 2)', () => {
  const mockOnGenerate = vi.fn();
  const mockOnViewHistory = vi.fn();
  const mockOnViewProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ergonomía Mobile-First ≤ 390px (Constitución Art. 2)', () => {
    it('should render inside a mobile-first container with max-w-[390px] and no horizontal scroll', () => {
      const { container } = render(
        <EmptyMesocycleState onGenerate={mockOnGenerate} />
      );

      const rootEl = container.querySelector('[data-testid="empty-mesocycle-state"]');
      expect(rootEl).toBeInTheDocument();
      expect(rootEl?.className).toMatch(/max-w-\[390px\]/);
    });

    it('should ensure primary CTA and all interactive buttons have touch targets >= 48px', () => {
      const { container } = render(
        <EmptyMesocycleState
          onGenerate={mockOnGenerate}
          onViewHistory={mockOnViewHistory}
          onViewProfile={mockOnViewProfile}
        />
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);

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

  describe('Mensajes obligatorios y pedagogía (RF-07 CA-07.9)', () => {
    it('should display "Sin mesociclo activo" and exact CA-07.9 description', () => {
      render(<EmptyMesocycleState onGenerate={mockOnGenerate} />);

      expect(screen.getByRole('heading', { name: /sin mesociclo activo/i })).toBeInTheDocument();

      const expectedDesc =
        'No tienes un mesociclo activo. Genera tu nueva rutina para continuar entrenando';
      expect(screen.getByText(new RegExp(expectedDesc, 'i'))).toBeInTheDocument();
    });

    it('should highlight features of routine engine V2 (days, fixed time blocks, volume)', () => {
      render(<EmptyMesocycleState onGenerate={mockOnGenerate} />);

      expect(screen.getByText(/bloques de tiempo/i)).toBeInTheDocument();
      expect(screen.getByText(/sobrecarga progresiva/i)).toBeInTheDocument();
    });
  });

  describe('CTA prominente "Generar nuevo mesociclo"', () => {
    it('should render a prominent CTA button to generate a new mesocycle', () => {
      render(<EmptyMesocycleState onGenerate={mockOnGenerate} />);

      const ctaBtn = screen.getByRole('button', { name: /generar nuevo mesociclo/i });
      expect(ctaBtn).toBeInTheDocument();

      fireEvent.click(ctaBtn);
      expect(mockOnGenerate).toHaveBeenCalledTimes(1);
    });

    it('should also trigger onCreate callback if provided instead of onGenerate', () => {
      const mockOnCreate = vi.fn();
      render(<EmptyMesocycleState onCreate={mockOnCreate} />);

      const ctaBtn = screen.getByRole('button', { name: /generar nuevo mesociclo/i });
      fireEvent.click(ctaBtn);
      expect(mockOnCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accesibilidad a Historial y Perfil (RF-07 CA-07.9)', () => {
    it('should render secondary actions for history and profile and trigger callbacks', () => {
      render(
        <EmptyMesocycleState
          onGenerate={mockOnGenerate}
          onViewHistory={mockOnViewHistory}
          onViewProfile={mockOnViewProfile}
        />
      );

      const historyBtn = screen.getByRole('button', { name: /historial/i });
      expect(historyBtn).toBeInTheDocument();
      fireEvent.click(historyBtn);
      expect(mockOnViewHistory).toHaveBeenCalledTimes(1);

      const profileBtn = screen.getByRole('button', { name: /perfil/i });
      expect(profileBtn).toBeInTheDocument();
      fireEvent.click(profileBtn);
      expect(mockOnViewProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Personalización opcional de textos', () => {
    it('should render custom title and description when provided', () => {
      render(
        <EmptyMesocycleState
          onGenerate={mockOnGenerate}
          title="Mesociclo finalizado"
          description="Has completado todas las semanas con éxito. Genera el siguiente ciclo."
        />
      );

      expect(screen.getByRole('heading', { name: 'Mesociclo finalizado' })).toBeInTheDocument();
      expect(
        screen.getByText('Has completado todas las semanas con éxito. Genera el siguiente ciclo.')
      ).toBeInTheDocument();
    });
  });
});
