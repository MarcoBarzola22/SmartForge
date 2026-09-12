import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MobileLayout } from './MobileLayout';

describe('T-16: MobileLayout.tsx con safe-areas y ajuste dinámico (RF-02, RF-03, RF-10, RF-11, CF-02, CF-04)', () => {
  let listeners: Record<string, ((event?: any) => void)[]> = {};

  const mockVisualViewport = {
    height: 800,
    width: 390,
    offsetTop: 0,
    offsetLeft: 0,
    pageTop: 0,
    pageLeft: 0,
    scale: 1,
    addEventListener: vi.fn((event: string, cb: (event?: any) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: (event?: any) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((item) => item !== cb);
      }
    }),
  };

  beforeEach(() => {
    listeners = {};
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: { ...mockVisualViewport },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Estructura base, safe-areas y blindaje en 320px (RF-02, RF-10, RF-11, CF-02)', () => {
    it('renderiza contenedor móvil centrado con max-w-[390px], w-full y overflow-x-hidden', () => {
      const { container } = render(
        <MobileLayout>
          <div>Contenido de prueba</div>
        </MobileLayout>
      );

      const mobileContainer = container.querySelector('[data-testid="mobile-container"]');
      expect(mobileContainer).toBeInTheDocument();
      expect(mobileContainer?.className).toContain('max-w-[390px]');
      expect(mobileContainer?.className).toContain('w-full');
      expect(mobileContainer?.className).toContain('overflow-x-hidden');
    });

    it('en un viewport estrecho de 320px no genera desbordamiento horizontal', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <MobileLayout title="Viewport 320px">
          <div data-testid="inner-320">Contenido estrecho</div>
        </MobileLayout>,
        { container }
      );

      const mobileContainer = screen.getByTestId('mobile-container');
      expect(mobileContainer.className).toContain('overflow-x-hidden');
      expect(screen.getByTestId('inner-320')).toBeInTheDocument();

      unmount();
      document.body.removeChild(container);
    });

    it('el header contextual muestra título, conectividad y soporte de acción', () => {
      render(
        <MobileLayout
          title="Rutina de Hoy"
          subtitle="Empuje / Pecho"
          isOnline={true}
        >
          <div>Contenido principal</div>
        </MobileLayout>
      );

      expect(screen.getByRole('heading', { name: /Rutina de Hoy/i })).toBeInTheDocument();
      expect(screen.getByText('Empuje / Pecho')).toBeInTheDocument();
      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
      expect(screen.getByText(/En línea/i)).toBeInTheDocument();
    });

    it('muestra el ToastContainer sobre la barra fija en bottom-[76px]', () => {
      render(
        <MobileLayout
          toastContent={<div data-testid="custom-toast">Notificación activa</div>}
        >
          <div>Contenido</div>
        </MobileLayout>
      );

      const toastContainer = screen.getByTestId('toast-container');
      expect(toastContainer).toBeInTheDocument();
      expect(toastContainer.className).toContain('bottom-[76px]');
      expect(screen.getByTestId('custom-toast')).toBeInTheDocument();
    });
  });

  describe('2. Conmutación dinámica de BottomNav y KeyboardActionBar ante teclado virtual (RF-03, CF-04)', () => {
    it('muestra el footer/BottomNav normalmente cuando el teclado virtual está cerrado', () => {
      render(
        <MobileLayout
          footer={<nav data-testid="bottom-nav">Navegación Inferior</nav>}
          keyboardActionBar={<div data-testid="keyboard-action-bar">Barra Teclado</div>}
        >
          <div>Contenido con teclado cerrado</div>
        </MobileLayout>
      );

      expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
      expect(screen.queryByTestId('keyboard-action-bar')).not.toBeInTheDocument();
    });

    it('oculta el footer/BottomNav y muestra KeyboardActionBar al emerger el teclado virtual', () => {
      render(
        <MobileLayout
          footer={<nav data-testid="bottom-nav">Navegación Inferior</nav>}
          keyboardActionBar={<div data-testid="keyboard-action-bar">Barra Teclado</div>}
        >
          <div>Contenido con teclado emergiendo</div>
        </MobileLayout>
      );

      // Simular apertura de teclado virtual (< 75% de 800 = < 600px)
      act(() => {
        window.visualViewport!.height = 420;
        listeners['resize']?.forEach((cb) => cb());
      });

      expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument();
      expect(screen.getByTestId('keyboard-action-bar')).toBeInTheDocument();
    });

    it('ajusta la altura scrolleable disponible dinámicamente según visualViewport.height - 64px', () => {
      render(
        <MobileLayout
          footer={<nav data-testid="bottom-nav">Navegación</nav>}
        >
          <div>Contenido scrolleable</div>
        </MobileLayout>
      );

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();

      // Al emerger el teclado a 450px, availableHeight = 450 - 64 = 386px
      act(() => {
        window.visualViewport!.height = 450;
        listeners['resize']?.forEach((cb) => cb());
      });

      // Debe reflejar la altura calculada o estilo dinámico para evitar solapamiento
      expect(mainElement.style.maxHeight).toBe('386px');
    });
  });
});
