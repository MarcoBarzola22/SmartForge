import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from './AlertDialog';

describe('T-09: Implementación de AlertDialog.tsx para confirmación destructiva en dos pasos (RF-04, RF-18, CF-13)', () => {
  const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-h-touch/;

  describe('1. Presentación en mitad inferior / Bottom Sheet (RF-04, CF-13)', () => {
    it('debe anclarse a la parte inferior (bottom-0) con max-w-[390px] y estilo de Superficie 1', () => {
      render(
        <AlertDialog open={true} onOpenChange={() => {}}>
          <AlertDialogContent data-testid="alert-dialog-content">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ejercicio?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminarán todas las series registradas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      const content = screen.getByTestId('alert-dialog-content');
      expect(content).toBeInTheDocument();
      expect(content.className).toMatch(/bottom-0/);
      expect(content.className).toMatch(/w-full/);
      expect(content.className).toMatch(/max-w-\[390px\]|max-w-mobile/);
      expect(content.className).toMatch(/bg-(surface-1|\[#18181B\])/);
    });
  });

  describe('2. Altura mínima táctil de 48px en ambos botones (RF-04, Constitución R2)', () => {
    it('debe garantizar que tanto el botón destructivo como el botón Cancelar midan >= 48px', () => {
      render(
        <AlertDialog open={true} onOpenChange={() => {}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmación requerida</AlertDialogTitle>
              <AlertDialogDescription>Advertencia crítica</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive">Confirmar Eliminación</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      const actionBtn = screen.getByRole('button', { name: /confirmar eliminación/i });

      expect(cancelBtn.className).toMatch(TOUCH_TARGET_REGEX);
      expect(actionBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });
  });

  describe('3. Token de error de fondo en confirmación destructiva (RF-18)', () => {
    it('el botón de acción destructiva debe aplicar el fondo #EF4444 (bg-destructive / bg-status-error-bg)', () => {
      render(
        <AlertDialog open={true} onOpenChange={() => {}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar Sesión</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction variant="destructive">Descartar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      const actionBtn = screen.getByRole('button', { name: /descartar/i });
      expect(actionBtn.className).toMatch(/bg-(destructive|status-error-bg|\[#EF4444\])/);
    });
  });

  describe('4. Confirmación explícita de acción (RF-18)', () => {
    it('debe ejecutar el callback onClick al presionar el botón de confirmación destructiva', () => {
      const handleAction = vi.fn();

      render(
        <AlertDialog open={true} onOpenChange={() => {}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reiniciar valores</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleAction}>Aceptar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      const actionBtn = screen.getByRole('button', { name: /aceptar/i });
      fireEvent.click(actionBtn);

      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });
});
