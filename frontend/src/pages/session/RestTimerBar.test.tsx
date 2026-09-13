import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RestTimerBar, RestTimerBarProps } from './RestTimerBar';

describe('T-19: RestTimerBar.tsx con Display 32px y cancelación anticipada (RF-18, RF-20, CF-11)', () => {
  const defaultProps: RestTimerBarProps = {
    initialSeconds: 90,
    onFinish: vi.fn(),
    onNextSet: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        configurable: true,
        value: vi.fn(),
      });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Tipografía Display 32px y renderizado (RF-20, CF-11)', () => {
    it('muestra el contador con tipografía Display de 32px (text-[32px] o text-2xl/3xl font-bold) y formato MM:SS', () => {
      render(<RestTimerBar {...defaultProps} initialSeconds={90} />);

      const display = screen.getByTestId('timer-display');
      expect(display).toBeInTheDocument();
      expect(display).toHaveTextContent('01:30');
      // Debe tener clase de 32px bold
      expect(display.className).toMatch(/text-\[32px\]|text-3xl|text-4xl/);
      expect(display.className).toMatch(/font-bold/);
    });

    it('en viewport estrecho de 320px no genera desbordamiento horizontal', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <div style={{ width: '320px' }}>
          <RestTimerBar {...defaultProps} data-testid="timer-bar-320" />
        </div>,
        { container }
      );

      const bar = screen.getByTestId('timer-bar-320');
      expect(bar.className).toContain('w-full');

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('2. Cuenta regresiva, borde verde de éxito y vibración al llegar a cero (RF-20)', () => {
    it('decrementa el tiempo cada segundo y al llegar a 00:00 activa borde verde y vibración', () => {
      const onFinishSpy = vi.fn();
      render(<RestTimerBar {...defaultProps} initialSeconds={3} onFinish={onFinishSpy} />);

      const display = screen.getByTestId('timer-display');
      expect(display).toHaveTextContent('00:03');

      // Avanzar 1 segundo
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(display).toHaveTextContent('00:02');

      // Avanzar 2 segundos más (llega a 0)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(display).toHaveTextContent('00:00');

      // Verifica borde verde éxito
      const container = screen.getByTestId('rest-timer-bar');
      expect(container.className).toMatch(/border-status-success|border-emerald|border-green/);

      // Verifica vibración y callback onFinish
      expect(onFinishSpy).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalled();
    });
  });

  describe('3. Botón "Siguiente serie" y cancelación anticipada de notificaciones (RF-20, CF-11)', () => {
    it('cuenta con un botón accesible "Siguiente serie" de altura mínima >= 48px', () => {
      render(<RestTimerBar {...defaultProps} />);

      const nextBtn = screen.getByRole('button', { name: /siguiente serie/i });
      expect(nextBtn).toBeInTheDocument();
      expect(nextBtn.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12|min-h-touch/);
    });

    it('si el atleta pulsa "Siguiente serie" antes de agotar el tiempo, resetea a cero e invoca cancelación formal de notificaciones', () => {
      const onNextSetSpy = vi.fn();
      const cancelNotificationSpy = vi.fn();

      render(
        <RestTimerBar
          {...defaultProps}
          initialSeconds={60}
          onNextSet={onNextSetSpy}
          onCancelNotification={cancelNotificationSpy}
        />
      );

      const display = screen.getByTestId('timer-display');
      expect(display).toHaveTextContent('01:00');

      // Avanzar 10 segundos (quedan 50)
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(display).toHaveTextContent('00:50');

      // Pulsar "Siguiente serie" antes de que el timer expire
      const nextBtn = screen.getByRole('button', { name: /siguiente serie/i });
      fireEvent.click(nextBtn);

      expect(onNextSetSpy).toHaveBeenCalledTimes(1);
      expect(cancelNotificationSpy).toHaveBeenCalledTimes(1);
      expect(display).toHaveTextContent('00:00');
    });

    it('permite añadir o restar tiempo rápidamente (+30s / -15s)', () => {
      render(<RestTimerBar {...defaultProps} initialSeconds={60} />);

      const display = screen.getByTestId('timer-display');
      expect(display).toHaveTextContent('01:00');

      const addBtn = screen.getByRole('button', { name: /\+30|añadir 30/i });
      fireEvent.click(addBtn);
      expect(display).toHaveTextContent('01:30');

      const subBtn = screen.getByRole('button', { name: /-15|restar 15/i });
      fireEvent.click(subBtn);
      expect(display).toHaveTextContent('01:15');
    });
  });
});
