import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('Frontend Scaffolding', () => {
  it('should export the main App component as a function', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });
});
