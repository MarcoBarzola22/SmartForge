import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from './Sheet';

describe('T-08: Implementación de Sheet.tsx (Bottom Sheet con bloqueo de scroll y soporte de teclado)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Limpieza de historial si fue alterado
    window.history.replaceState({}, '', '/');
  });

  describe('1. Bloqueo de scroll y estructura de Bottom Sheet (RF-16, CF-08)', () => {
    it('debe aplicar overscroll-contain en overlay y contenedor anclado a bottom-0 con max-w-390px', () => {
      render(
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" data-testid="sheet-popup">
            <SheetHeader>
              <SheetTitle>Filtros de Ejercicio</SheetTitle>
              <SheetDescription>Selecciona grupos musculares</SheetDescription>
            </SheetHeader>
            <p>Contenido del Sheet</p>
          </SheetContent>
        </Sheet>
      );

      const content = screen.getByTestId('sheet-popup');
      expect(content).toBeInTheDocument();
      // Anclado a la base, ancho completo móvil y contención de scroll
      expect(content.className).toMatch(/bottom-0/);
      expect(content.className).toMatch(/w-full/);
      expect(content.className).toMatch(/overscroll-contain|overscroll-behavior:\s*contain/);
      expect(content.className).toMatch(/max-w-\[390px\]|max-w-mobile/);
      expect(content.className).toMatch(/bg-(surface-1|\[#18181B\])/);
    });
  });

  describe('2. Diana táctil accesible del botón de cerrar (RF-08, Constitución R2)', () => {
    it('el botón de cerrar debe medir al menos 48x48px y tener etiqueta accesible en español', () => {
      render(
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom">
            <SheetTitle>Opciones</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|size-12|h-12|w-12/);
      expect(closeButton.className).toMatch(/min-w-\[(4[8-9]|[5-9][0-9])px\]|touch-target|size-12|w-12/);
    });
  });

  describe('3. Interceptación del botón atrás del SO (popstate) (RF-16, CF-08)', () => {
    it('debe cerrar el sheet ante el evento popstate en lugar de cambiar de URL', () => {
      const handleOpenChange = vi.fn();

      render(
        <Sheet open={true} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom">
            <SheetTitle>Panel Activo</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      // Simular botón atrás del dispositivo móvil
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('4. Adaptabilidad a teclado virtual activo (CF-12)', () => {
    it('debe conmutar o proveer soporte de altura completa cuando el teclado virtual está abierto', () => {
      render(
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" data-testid="keyboard-sheet" isKeyboardOpen={true}>
            <SheetTitle>Edición Rápida</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      const popup = screen.getByTestId('keyboard-sheet');
      expect(popup.className).toMatch(/h-full/);
    });
  });
});
