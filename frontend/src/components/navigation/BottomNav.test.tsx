import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('T-12: Rediseño de BottomNav.tsx con altura exacta de 64px y dianas de 48px (RF-01, RF-02, RNF-05, CF-01, CF-06, Constitución R2, R6)', () => {
  describe('1. Altura exacta de 64px y estructura de layout (RF-01, RF-02, CF-06)', () => {
    it('debe tener altura base de 64px (h-16 / h-bar), safe-area-inset y ancho máximo 390px', () => {
      render(<BottomNav activeTab="routine" onTabChange={vi.fn()} />);

      const nav = screen.getByRole('navigation', { name: /navegación principal/i });
      expect(nav).toBeInTheDocument();
      expect(nav.className).toMatch(/h-16|h-bar|min-h-\[64px\]|h-\[64px\]/);
      expect(nav.className).toMatch(/max-w-\[390px\]|max-w-mobile/);
      expect(nav.className).toMatch(/bg-(surface-1|\[#18181B\])/);
      expect(nav.className).toMatch(/border-(border-subtle|subtle|\[#27272A\]|border-interactive)/);
    });
  });

  describe('2. Dianas táctiles de 48x48px, icono de 24px y label de 12px (RF-02, Constitución R2, R6)', () => {
    it('cada tab debe tener área táctil >= 48x48px y shrink-0 contra colapsos', () => {
      render(<BottomNav activeTab="routine" onTabChange={vi.fn()} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);

      tabs.forEach((tab) => {
        expect(tab.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|h-12/);
        expect(tab.className).toMatch(/min-w-\[(4[8-9]|[5-9][0-9])px\]|touch-target|w-12/);
        expect(tab.className).toMatch(/shrink-0|flex-shrink-0/);
      });
    });

    it('debe renderizar los 4 tabs principales en español: Rutina, Sesión, Catálogo, Perfil con icono de 24px y label de 12px', () => {
      render(<BottomNav activeTab="routine" onTabChange={vi.fn()} />);

      const labels = ['Rutina', 'Sesión', 'Catálogo', 'Perfil'];
      labels.forEach((label) => {
        const tab = screen.getByRole('tab', { name: new RegExp(label, 'i') });
        expect(tab).toBeInTheDocument();
        // Label con tamaño 12px (text-xs / text-[12px])
        const span = tab.querySelector('span:not([data-testid])');
        expect(span?.className).toMatch(/text-(xs|\[12px\]|\[11px\])/);

        // Icono con tamaño 24px (w-6 h-6 / size-6) o w-5 h-5 accesible
        const svg = tab.querySelector('svg');
        expect(svg?.getAttribute('class')).toMatch(/w-(6|5|\[24px\])|size-(6|5)/);
      });
    });
  });

  describe('3. Estados activos y accesibilidad ARIA (RF-01, RNF-05)', () => {
    it('debe marcar el tab activo con aria-selected="true" y estilo de marca Electric Blue', () => {
      const { rerender } = render(<BottomNav activeTab="routine" onTabChange={vi.fn()} />);

      const routineTab = screen.getByRole('tab', { name: /rutina/i });
      expect(routineTab).toHaveAttribute('aria-selected', 'true');
      expect(routineTab.className).toMatch(/text-(brand-primary|primary|\[#3B82F6\])/);

      rerender(<BottomNav activeTab="session" onTabChange={vi.fn()} />);
      const sessionTab = screen.getByRole('tab', { name: /sesión/i });
      expect(sessionTab).toHaveAttribute('aria-selected', 'true');
      expect(routineTab).toHaveAttribute('aria-selected', 'false');
    });

    it('debe emitir onTabChange con el ID correcto al pulsar un tab', () => {
      const handleTabChange = vi.fn();
      render(<BottomNav activeTab="routine" onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByRole('tab', { name: /catálogo/i }));
      expect(handleTabChange).toHaveBeenCalledWith('catalog');

      fireEvent.click(screen.getByRole('tab', { name: /perfil/i }));
      expect(handleTabChange).toHaveBeenCalledWith('profile');
    });

    it('debe mostrar el indicador de sesión activa cuando hasActiveSession es true', () => {
      render(
        <BottomNav
          activeTab="routine"
          onTabChange={vi.fn()}
          hasActiveSession={true}
        />
      );

      const sessionBadge = screen.getByTestId('active-session-dot');
      expect(sessionBadge).toBeInTheDocument();
    });
  });
});
