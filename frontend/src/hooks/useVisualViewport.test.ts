import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisualViewport } from './useVisualViewport';

describe('T-13: useVisualViewport.ts (RF-03, RF-16, CF-04)', () => {
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

  it('debe inicializarse con teclado cerrado (isKeyboardOpen: false) y altura disponible calculada (-64px)', () => {
    const { result } = renderHook(() => useVisualViewport());

    expect(result.current.isKeyboardOpen).toBe(false);
    expect(result.current.visualViewportHeight).toBe(800);
    expect(result.current.availableHeight).toBe(800 - 64);
  });

  it('debe detectar apertura de teclado (isKeyboardOpen: true) y calcular availableHeight (visualViewport.height - 64)', () => {
    const { result } = renderHook(() => useVisualViewport());

    act(() => {
      // Simular aparición de teclado virtual (ej: 450px de altura disponible)
      (window.visualViewport as any).height = 450;
      listeners['resize']?.forEach((cb) => cb());
    });

    expect(result.current.isKeyboardOpen).toBe(true);
    expect(result.current.visualViewportHeight).toBe(450);
    expect(result.current.availableHeight).toBe(450 - 64);
  });

  it('debe detectar cierre de teclado volviendo a isKeyboardOpen: false al restaurarse la altura', () => {
    const { result } = renderHook(() => useVisualViewport());

    // Abrir teclado
    act(() => {
      (window.visualViewport as any).height = 420;
      listeners['resize']?.forEach((cb) => cb());
    });
    expect(result.current.isKeyboardOpen).toBe(true);

    // Cerrar teclado
    act(() => {
      (window.visualViewport as any).height = 800;
      listeners['resize']?.forEach((cb) => cb());
    });

    expect(result.current.isKeyboardOpen).toBe(false);
    expect(result.current.availableHeight).toBe(800 - 64);
  });

  it('debe limpiar los event listeners de resize y scroll al desmontarse', () => {
    const { unmount } = renderHook(() => useVisualViewport());

    expect(window.visualViewport?.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();

    expect(window.visualViewport?.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
