import { useState, useEffect } from 'react';

export interface VisualViewportState {
  isKeyboardOpen: boolean;
  visualViewportHeight: number;
  availableHeight: number;
  offsetTop: number;
}

/**
 * Hook para detectar la apertura del teclado virtual y computar
 * dinámicamente la altura disponible (descontando los 64px de barras fijas).
 * Cumple con RF-03, RF-16 y CF-04.
 */
export function useVisualViewport(reservedBottomHeight = 64): VisualViewportState {
  const getInitialHeight = () => {
    if (typeof window !== 'undefined') {
      return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }
    return 800;
  };

  const [state, setState] = useState<VisualViewportState>(() => {
    const currentHeight = getInitialHeight();
    const fullHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const isKeyboard = currentHeight < fullHeight * 0.75;

    return {
      isKeyboardOpen: isKeyboard,
      visualViewportHeight: currentHeight,
      availableHeight: Math.max(0, currentHeight - reservedBottomHeight),
      offsetTop: 0,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;

    const handleUpdate = () => {
      const currentHeight = vv ? vv.height : window.innerHeight;
      const fullHeight = window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      // Detección de teclado virtual ante reducción significativa de altura
      const isKeyboard = currentHeight < fullHeight * 0.75;

      setState({
        isKeyboardOpen: isKeyboard,
        visualViewportHeight: currentHeight,
        availableHeight: Math.max(0, currentHeight - reservedBottomHeight),
        offsetTop,
      });
    };

    if (vv) {
      vv.addEventListener('resize', handleUpdate);
      vv.addEventListener('scroll', handleUpdate);
    } else {
      window.addEventListener('resize', handleUpdate);
    }

    handleUpdate();

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleUpdate);
        vv.removeEventListener('scroll', handleUpdate);
      } else {
        window.removeEventListener('resize', handleUpdate);
      }
    };
  }, [reservedBottomHeight]);

  return state;
}
