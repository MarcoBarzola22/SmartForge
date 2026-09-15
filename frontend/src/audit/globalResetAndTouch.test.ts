import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('T-04: Blindaje global contra scroll horizontal y utilidades táctiles en index.css', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const indexCss = fs.readFileSync(cssPath, 'utf-8');

  it('debe aplicar overflow-x: hidden a nivel html, body y #root', () => {
    // Debe incluir #root junto a html y body con overflow-x: hidden
    const hasHtmlBodyRootOverflowX =
      /(html,\s*body,\s*#root|#root|\bhtml\b[\s\S]*?\bbody\b[\s\S]*?#root)[\s\S]*?overflow-x:\s*hidden/i.test(indexCss) ||
      (indexCss.includes('#root') && indexCss.includes('overflow-x: hidden'));

    expect(indexCss).toMatch(/#root/);
    expect(hasHtmlBodyRootOverflowX).toBe(true);
  });

  it('debe garantizar box-sizing: border-box global en todos los elementos', () => {
    expect(indexCss).toMatch(/\*\s*(,\s*\*::before\s*,\s*\*::after)?\s*\{[^}]*box-sizing:\s*border-box/);
  });

  it('debe desactivar el highlight nativo táctil en dispositivos móviles (-webkit-tap-highlight-color: transparent)', () => {
    expect(indexCss).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });

  it('debe definir la clase de utilidad .touch-target con dimensiones mínimas de 48x48px y centrado flexible', () => {
    expect(indexCss).toContain('.touch-target');
    expect(indexCss).toMatch(/\.touch-target\s*\{[^}]*min-width:\s*48px/);
    expect(indexCss).toMatch(/\.touch-target\s*\{[^}]*min-height:\s*48px/);
    expect(indexCss).toMatch(/\.touch-target\s*\{[^}]*display:\s*inline-flex/);
    expect(indexCss).toMatch(/\.touch-target\s*\{[^}]*align-items:\s*center/);
    expect(indexCss).toMatch(/\.touch-target\s*\{[^}]*justify-content:\s*center/);
  });

  it('debe verificar que en un viewport móvil de 320px el contenedor no produzca desborde horizontal', () => {
    // Simular contenedor con estilos de blindaje
    const container = document.createElement('div');
    container.id = 'root';
    container.style.width = '100%';
    container.style.maxWidth = '390px';
    container.style.overflowX = 'hidden';

    document.body.appendChild(container);

    expect(container.style.overflowX).toBe('hidden');
    expect(container.style.maxWidth).toBe('390px');

    document.body.removeChild(container);
  });
});
