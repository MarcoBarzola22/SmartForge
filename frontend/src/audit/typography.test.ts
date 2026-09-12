import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('T-01: Tipografías DM Sans y JetBrains Mono', () => {
  it('debe incluir los enlaces de Google Fonts para DM Sans y JetBrains Mono en index.html', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // Debe incluir preconnect para Google Fonts
    expect(indexHtml).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
    expect(indexHtml).toContain('rel="preconnect" href="https://fonts.gstatic.com"');

    // Debe cargar DM Sans y JetBrains Mono
    expect(indexHtml).toMatch(/fonts\.googleapis\.com\/css2\?[^"]*family=DM\+Sans/);
    expect(indexHtml).toMatch(/fonts\.googleapis\.com\/css2\?[^"]*family=JetBrains\+Mono/);
  });

  it('debe configurar DM Sans y JetBrains Mono en index.css', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const indexCss = fs.readFileSync(cssPath, 'utf-8');

    // Debe definir las variables de fuente en @theme o directivas CSS
    expect(indexCss).toMatch(/--font-sans:[^;]*['"]?DM Sans['"]?/);
    expect(indexCss).toMatch(/--font-mono:[^;]*['"]?JetBrains Mono['"]?/);

    // Debe aplicar DM Sans por defecto en html/body
    expect(indexCss).toMatch(/font-family:[^;]*['"]?DM Sans['"]?/);
  });
});
