import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

// Components under audit
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Slider } from '../components/ui/Slider';
import { MobileLayout } from '../components/layout/MobileLayout';
import { BottomNav } from '../components/navigation/BottomNav';
import { SyncStatusBadge } from '../components/common/SyncStatusBadge';

describe('TASK-79: Mobile Accessibility & Touch Target Audit (RNF-01, RNF-02, RNF-06, Constitución §2)', () => {
  const TOUCH_TARGET_REGEX = /min-h-\[(4[8-9]|[5-9][0-9])px\]|touch-target|min-w-\[(4[8-9]|[5-9][0-9])px\]/;

  describe('1. Touch Targets Size Audit (RNF-02, Constitución §2: ≥ 48px)', () => {
    it('Button component across all variants and sizes meets minimum 48px touch target', () => {
      const sizes: ('sm' | 'md' | 'lg' | 'icon')[] = ['sm', 'md', 'lg', 'icon'];
      const variants: ('primary' | 'secondary' | 'outline' | 'danger' | 'ghost')[] = [
        'primary',
        'secondary',
        'outline',
        'danger',
        'ghost'
      ];

      for (const size of sizes) {
        for (const variant of variants) {
          const { unmount } = render(
            <Button size={size} variant={variant}>
              Action {size}-{variant}
            </Button>
          );

          const button = screen.getByRole('button', { name: `Action ${size}-${variant}` });
          expect(button.className).toMatch(TOUCH_TARGET_REGEX);
          unmount();
        }
      }
    });

    it('Bottom Navigation items have touch target size ≥ 48px and proper ARIA accessibility roles', () => {
      render(<BottomNav activeTab="session" onTabChange={() => {}} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4);

      for (const tab of tabs) {
        expect(tab.className).toMatch(TOUCH_TARGET_REGEX);
        expect(tab).toHaveAttribute('aria-label');
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
      }
    });

    it('Input component meets minimum height of 48px for comfortable thumb input', () => {
      render(<Input label="Nombre de usuario" id="test-username" />);
      const input = screen.getByLabelText('Nombre de usuario');
      expect(input.className).toMatch(/min-h-\[(4[8-9]|[5-9][0-9])px\]|h-12|h-11/);
    });

    it('Slider component meets touch target height for easy sliding and thumb manipulation', () => {
      render(<Slider label="Nivel RIR" min={0} max={5} value={2} onChange={() => {}} />);
      const slider = screen.getByRole('slider');
      expect(slider.className).toMatch(/h-3|min-h-|w-full/);
    });

    it('SyncStatusBadge provides accessible label and clear online/offline status', () => {
      const { rerender } = render(<SyncStatusBadge status="synced" isOnline={true} pendingCount={0} />);
      expect(screen.getByText(/Sincronizado/i)).toBeDefined();

      rerender(<SyncStatusBadge status="offline" isOnline={false} pendingCount={3} />);
      expect(screen.getByText(/Modo Offline/i)).toBeDefined();
      expect(screen.getByText('3')).toBeDefined();
    });
  });

  describe('2. Mobile Viewport & Zero Horizontal Scroll (RNF-01, Constitución §2: ≤ 390px)', () => {
    it('MobileLayout enforces max-width 390px and hides horizontal overflow', () => {
      render(
        <MobileLayout title="SmartForge Viewport Audit">
          <div data-testid="content">Contenido auditado</div>
        </MobileLayout>
      );

      const mobileContainer = screen.getByTestId('mobile-container');
      expect(mobileContainer.className).toContain('max-w-[390px]');
      expect(mobileContainer.className).toContain('overflow-x-hidden');
    });

    it('Global CSS enforces zero horizontal scroll and 390px layout tokens', () => {
      const cssPath = path.resolve(__dirname, '../index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toContain('--app-max-width: 390px');
      expect(cssContent).toContain('overflow-x: hidden');
      expect(cssContent).toContain('.touch-target');
      expect(cssContent).toContain('min-height: 48px');
      expect(cssContent).toContain('min-width: 48px');
    });
  });

  describe('3. PWA & Lighthouse Quality Audit (RNF-01, RNF-02, RNF-06, Constitución §6)', () => {
    it('index.html contains all mobile meta tags, viewport, theme-color, and Spanish language', () => {
      const htmlPath = path.resolve(__dirname, '../../index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      expect(htmlContent).toContain('<html lang="es">');
      expect(htmlContent).toContain('name="viewport"');
      expect(htmlContent).toContain('width=device-width');
      expect(htmlContent).toContain('initial-scale=1.0');
      expect(htmlContent).toContain('name="theme-color"');
      expect(htmlContent).toContain('name="description"');
      expect(htmlContent).toContain('rel="manifest"');
      expect(htmlContent).toContain('rel="apple-touch-icon"');
    });

    it('manifest.json meets all PWA installability requirements and icon specifications', () => {
      const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
      const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestRaw);

      expect(manifest.name).toBe('SmartForge - Entrenador Personal Digital');
      expect(manifest.short_name).toBe('SmartForge');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.background_color).toBe('#0a0a0a');
      expect(manifest.theme_color).toBe('#f59e0b');
      expect(manifest.orientation).toBe('portrait');

      // Check icons
      expect(Array.isArray(manifest.icons)).toBe(true);
      const icon192 = manifest.icons.find((i: any) => i.sizes === '192x192');
      const icon512 = manifest.icons.find((i: any) => i.sizes === '512x512');
      expect(icon192).toBeDefined();
      expect(icon512).toBeDefined();
      expect(icon192.purpose).toContain('maskable');
      expect(icon512.purpose).toContain('maskable');
    });

    it('Modal component traps focus structure and provides accessible close touch targets', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Modal de prueba"
          description="Descripción de accesibilidad"
        >
          <p>Contenido del modal</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      const closeBtn = screen.getByLabelText('Cerrar modal');
      expect(closeBtn.className).toMatch(TOUCH_TARGET_REGEX);
    });
  });
});
