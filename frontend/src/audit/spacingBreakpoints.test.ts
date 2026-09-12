import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('T-03: Escala de Espaciado Base 4px y Breakpoints Móviles', () => {
  const tailwindConfigPath = path.resolve(__dirname, '../../tailwind.config.js');
  const tailwindContent = fs.readFileSync(tailwindConfigPath, 'utf-8');

  const cssPath = path.resolve(__dirname, '../index.css');
  const indexCss = fs.readFileSync(cssPath, 'utf-8');

  it('debe configurar los breakpoints móviles constitucionales (xs: 320px, mobile-max: 390px)', () => {
    // En tailwind.config.js o @theme index.css
    const hasXsBreakpoint =
      tailwindContent.includes("'xs': '320px'") ||
      tailwindContent.includes('xs: "320px"') ||
      indexCss.includes('--breakpoint-xs: 320px');

    const hasMobileMaxBreakpoint =
      tailwindContent.includes("'mobile-max': '390px'") ||
      tailwindContent.includes('mobile-max: "390px"') ||
      indexCss.includes('--breakpoint-mobile-max: 390px') ||
      indexCss.includes('--app-max-width: 390px');

    expect(hasXsBreakpoint).toBe(true);
    expect(hasMobileMaxBreakpoint).toBe(true);
  });

  it('debe configurar la escala de espaciado estricta base 4px (space-1 a space-16)', () => {
    const combinedContent = tailwindContent + indexCss;

    // space-1 (4px), space-2 (8px), space-12 (48px), space-16 (64px)
    expect(combinedContent).toMatch(/'1':\s*['"]4px['"]|--spacing-1:\s*4px/);
    expect(combinedContent).toMatch(/'2':\s*['"]8px['"]|--spacing-2:\s*8px/);
    expect(combinedContent).toMatch(/'3':\s*['"]12px['"]|--spacing-3:\s*12px/);
    expect(combinedContent).toMatch(/'4':\s*['"]16px['"]|--spacing-4:\s*16px/);
    expect(combinedContent).toMatch(/'5':\s*['"]20px['"]|--spacing-5:\s*20px/);
    expect(combinedContent).toMatch(/'6':\s*['"]24px['"]|--spacing-6:\s*24px/);
    expect(combinedContent).toMatch(/'8':\s*['"]32px['"]|--spacing-8:\s*32px/);
    expect(combinedContent).toMatch(/'12':\s*['"]48px['"]|--spacing-12:\s*48px/);
    expect(combinedContent).toMatch(/'16':\s*['"]64px['"]|--spacing-16:\s*64px/);
  });

  it('debe configurar dimensiones mínimas para dianas táctiles (touch: 48px) y barras fijas (bar: 64px)', () => {
    const combinedContent = tailwindContent + indexCss;

    // touch: 48px (min-h y min-w)
    expect(combinedContent).toMatch(/touch:\s*['"]48px['"]|--min-height-touch:\s*48px/);

    // bar: 64px (h-bar / min-h-bar)
    expect(combinedContent).toMatch(/bar:\s*['"]64px['"]|--height-bar:\s*64px/);
  });
});
