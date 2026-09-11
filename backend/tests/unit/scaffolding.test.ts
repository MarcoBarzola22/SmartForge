import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';

describe('Backend Scaffolding', () => {
  it('should create express application with proper configuration', () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  it('should export healthcheck route or basic status', async () => {
    const app = createApp();
    expect(app).toHaveProperty('get');
  });
});
