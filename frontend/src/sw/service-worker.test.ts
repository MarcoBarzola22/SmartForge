import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { registerServiceWorker, unregisterServiceWorker } from './registerServiceWorker';

describe('TASK-74: PWA Configuration & Service Worker Registration (RNF-03)', () => {
  const publicDir = resolve(__dirname, '../../public');
  const manifestPath = resolve(publicDir, 'manifest.json');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('PWA Manifest & App Icons Configuration', () => {
    it('should have a valid manifest.json file in public directory (RNF-03)', () => {
      expect(existsSync(manifestPath)).toBe(true);
      const manifestRaw = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestRaw);

      expect(manifest.name).toBe('SmartForge - Entrenador Personal Digital');
      expect(manifest.short_name).toBe('SmartForge');
      expect(manifest.description).toBeDefined();
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.background_color).toBe('#0a0a0a');
      expect(manifest.theme_color).toBe('#f59e0b');
      expect(manifest.orientation).toBe('portrait');
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    });

    it('should configure required icon sizes (192x192 and 512x512) and maskable purpose in manifest.json', () => {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);

      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');

      const hasMaskable = manifest.icons.some(
        (icon: { purpose?: string }) => icon.purpose && icon.purpose.includes('maskable')
      );
      expect(hasMaskable).toBe(true);
    });

    it('should have PWA icon assets in public directory', () => {
      const svgIconPath = resolve(publicDir, 'icon.svg');
      expect(existsSync(svgIconPath)).toBe(true);
    });
  });

  describe('Service Worker Registration Utility', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      });
    });

    it('should register service worker when navigator.serviceWorker is supported', async () => {
      const registerMock = vi.fn().mockResolvedValue({
        scope: '/',
        addEventListener: vi.fn(),
        installing: null,
        waiting: null,
        active: null
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: registerMock,
            getRegistrations: vi.fn().mockResolvedValue([])
          }
        },
        writable: true
      });

      const registration = await registerServiceWorker('/sw.js');

      expect(registerMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(registration).toBeDefined();
    });

    it('should gracefully handle environments where serviceWorker is not supported', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      const registration = await registerServiceWorker('/sw.js');
      expect(registration).toBeNull();
    });

    it('should unregister service worker registrations cleanly', async () => {
      const unregisterMock = vi.fn().mockResolvedValue(true);
      const mockReg = { unregister: unregisterMock };

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            getRegistrations: vi.fn().mockResolvedValue([mockReg])
          }
        },
        writable: true
      });

      const success = await unregisterServiceWorker();
      expect(unregisterMock).toHaveBeenCalledTimes(1);
      expect(success).toBe(true);
    });
  });
});
