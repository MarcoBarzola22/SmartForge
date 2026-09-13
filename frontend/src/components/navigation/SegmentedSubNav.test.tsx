import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedSubNav, SegmentedSubNavItem } from './SegmentedSubNav';

describe('T-15: SegmentedSubNav.tsx (RF-04, CF-06, Constitución R2)', () => {
  const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-h-touch/;

  const sampleItems: SegmentedSubNavItem[] = [
    { id: 'history', label: 'Historial' },
    { id: 'stats', label: 'Estadísticas' },
  ];

  describe('1. Renderizado y estructura en zona de pulgar (RF-04, CF-06)', () => {
    it('debe renderizar un elemento con role="tablist" y aria-label accesible en español', () => {
      render(
        <SegmentedSubNav
          items={sampleItems}
          activeId="history"
          onChange={vi.fn()}
        />
      );

      const tablist = screen.getByRole('tablist', { name: /sub-navegación|sub-vistas/i });
      expect(tablist).toBeInTheDocument();
      // Contenedor no debe desbordar y debe tener fondo sutil de superficie
      expect(tablist.className).toMatch(/bg-(surface-2|\[#27272A\])/);
      expect(tablist.className).toMatch(/rounded|p-1/);
    });

    it('en un contenedor de 320px de ancho no genera desborde horizontal', () => {
      const container = document.createElement('div');
      container.style.width = '320px';
      container.style.maxWidth = '320px';
      document.body.appendChild(container);

      const { unmount } = render(
        <div style={{ width: '320px' }}>
          <SegmentedSubNav
            items={sampleItems}
            activeId="history"
            onChange={vi.fn()}
            data-testid="subnav-320"
          />
        </div>,
        { container }
      );

      const subNav = screen.getByTestId('subnav-320');
      expect(subNav).toBeInTheDocument();
      expect(subNav.className).toContain('w-full');

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('2. Accesibilidad táctil y dimensiones mínimas >= 48px (RF-08, Constitución R2)', () => {
    it('cada opción del selector debe medir como mínimo 48px de altura táctil', () => {
      render(
        <SegmentedSubNav
          items={sampleItems}
          activeId="history"
          onChange={vi.fn()}
        />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);

      tabs.forEach((tab) => {
        expect(tab.className).toMatch(TOUCH_TARGET_REGEX);
      });
    });

    it('marca aria-selected="true" en el elemento activo y "false" en los inactivos', () => {
      render(
        <SegmentedSubNav
          items={sampleItems}
          activeId="history"
          onChange={vi.fn()}
        />
      );

      const historyTab = screen.getByRole('tab', { name: /historial/i });
      const statsTab = screen.getByRole('tab', { name: /estadísticas/i });

      expect(historyTab).toHaveAttribute('aria-selected', 'true');
      expect(statsTab).toHaveAttribute('aria-selected', 'false');

      // Clases visuales de selección activa
      expect(historyTab.className).toMatch(/bg-surface-1|bg-brand-primary|text-brand-primary|text-content-primary/);
    });
  });

  describe('3. Interacción y cambio de pestañas', () => {
    it('llama a onChange con el id correspondiente al pulsar una pestaña inactiva', () => {
      const handleChange = vi.fn();
      render(
        <SegmentedSubNav
          items={sampleItems}
          activeId="history"
          onChange={handleChange}
        />
      );

      const statsTab = screen.getByRole('tab', { name: /estadísticas/i });
      fireEvent.click(statsTab);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('stats');
    });

    it('soporta navegación con teclado (flechas izquierda/derecha)', () => {
      const handleChange = vi.fn();
      render(
        <SegmentedSubNav
          items={sampleItems}
          activeId="history"
          onChange={handleChange}
        />
      );

      const historyTab = screen.getByRole('tab', { name: /historial/i });
      
      fireEvent.keyDown(historyTab, { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledWith('stats');

      fireEvent.keyDown(historyTab, { key: 'ArrowLeft' });
      expect(handleChange).toHaveBeenCalledWith('stats');
    });

    it('soporta 3 opciones de sub-navegación distribuidas equitativamente', () => {
      const threeItems: SegmentedSubNavItem[] = [
        { id: 'history', label: 'Historial' },
        { id: 'stats', label: 'Estadísticas' },
        { id: 'records', label: 'Récords' },
      ];

      render(
        <SegmentedSubNav
          items={threeItems}
          activeId="stats"
          onChange={vi.fn()}
        />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      tabs.forEach((tab) => {
        expect(tab.className).toMatch(TOUCH_TARGET_REGEX);
      });
    });
  });
});
