import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Helper de contraste WCAG
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0]! * 0.2126 + a[1]! * 0.7152 + a[2]! * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('T-02: Tokens de Color, Superficies y Contraste Accesible', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const indexCss = fs.readFileSync(cssPath, 'utf-8');

  it('debe declarar la paleta de colores unívoca en index.css (@theme)', () => {
    // Fondo base y superficies
    expect(indexCss).toMatch(/--color-base:\s*#0C0C0E/i);
    expect(indexCss).toMatch(/--color-surface-1:\s*#18181B/i);
    expect(indexCss).toMatch(/--color-surface-2:\s*#27272A/i);

    // Bordes interactivos
    expect(indexCss).toMatch(/--color-border-interactive:\s*#52525B/i);

    // Marca y acción primaria
    expect(indexCss).toMatch(/--color-brand-primary:\s*#3B82F6/i);
    expect(indexCss).toMatch(/--color-brand-contrast:\s*#0C0C0E/i);
    expect(indexCss).toMatch(/--color-brand-focus:\s*#60A5FA/i);

    // Textos
    expect(indexCss).toMatch(/--color-content-primary:\s*#FFFFFF/i);
    expect(indexCss).toMatch(/--color-content-secondary:\s*#A1A1AA/i);

    // Semánticos
    expect(indexCss).toMatch(/--color-status-success:\s*#22C55E/i);
    expect(indexCss).toMatch(/--color-status-error-text:\s*#F87171/i);
    expect(indexCss).toMatch(/--color-status-error-bg:\s*#EF4444/i);
    expect(indexCss).toMatch(/--color-status-warning:\s*#F59E0B/i);
  });

  it('debe actualizar los tokens de shadcn a la paleta oficial deportiva de SmartForge', () => {
    // Botón primario: fondo azul y texto negro carbón
    expect(indexCss).toMatch(/--primary:\s*#3B82F6/i);
    expect(indexCss).toMatch(/--primary-foreground:\s*#0C0C0E/i);

    // Fondo oscuro oficial
    expect(indexCss).toMatch(/--background:\s*#0C0C0E/i);
    expect(indexCss).toMatch(/--foreground:\s*#FFFFFF/i);

    // Tarjeta oficial
    expect(indexCss).toMatch(/--card:\s*#18181B/i);
  });

  it('debe cumplir matemáticamente las relaciones de contraste WCAG AA y AAA', () => {
    // 1. Botón primario: Texto negro carbón (#0C0C0E) sobre Azul (#3B82F6) >= 4.5:1 (WCAG AA)
    const primaryButtonRatio = getContrastRatio('#0C0C0E', '#3B82F6');
    expect(primaryButtonRatio).toBeGreaterThanOrEqual(4.5);

    // 2. Error de texto: #F87171 sobre Superficie 2 (#27272A) >= 4.5:1 (WCAG AA)
    const errorTextRatio = getContrastRatio('#F87171', '#27272A');
    expect(errorTextRatio).toBeGreaterThanOrEqual(4.5);

    // 3. Texto secundario: #A1A1AA sobre Fondo Base (#0C0C0E) >= 4.5:1 (WCAG AA)
    const secondaryTextRatio = getContrastRatio('#A1A1AA', '#0C0C0E');
    expect(secondaryTextRatio).toBeGreaterThanOrEqual(4.5);

    // 4. Borde interactivo en reposo: #52525B sobre Fondo Base (#0C0C0E) >= 2.5:1
    const borderRatio = getContrastRatio('#52525B', '#0C0C0E');
    expect(borderRatio).toBeGreaterThanOrEqual(2.5);

    // 5. Anillo de foco activo: #60A5FA sobre Superficie 2 (#27272A) >= 3:1 (WCAG 1.4.11)
    const focusRatio = getContrastRatio('#60A5FA', '#27272A');
    expect(focusRatio).toBeGreaterThanOrEqual(3.0);
  });
});
