import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TASK-16: Equipment Taxonomy Seed (backend/src/db/seeds/equipment.seed.ts)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const seedFilePath = path.join(
    rootDir,
    'backend',
    'src',
    'db',
    'seeds',
    'equipment.seed.ts'
  );

  it('should have equipment.seed.ts file created', () => {
    expect(fs.existsSync(seedFilePath)).toBe(true);
  });

  it('should export exactly 20 items in the closed equipment taxonomy', async () => {
    const { EQUIPMENT_SEED_DATA } = await import('../../src/db/seeds/equipment.seed.js');
    expect(Array.isArray(EQUIPMENT_SEED_DATA)).toBe(true);
    expect(EQUIPMENT_SEED_DATA).toHaveLength(20);

    const ids = new Set<string>();
    for (const item of EQUIPMENT_SEED_DATA) {
      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe('string');
      expect(item.id.trim()).not.toBe('');
      expect(item.name).toBeDefined();
      expect(typeof item.name).toBe('string');
      expect(item.name.trim()).not.toBe('');
      expect(item.category).toBeDefined();
      expect(typeof item.category).toBe('string');
      expect(item.category.trim()).not.toBe('');

      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
  });

  it('should include all required 20 equipment taxonomy items from RF-01', async () => {
    const { EQUIPMENT_SEED_DATA } = await import('../../src/db/seeds/equipment.seed.js');
    const ids = EQUIPMENT_SEED_DATA.map((e: { id: string }) => e.id);

    const expectedIds = [
      'barbell',
      'dumbbells',
      'kettlebell',
      'ez_bar',
      'trap_bar',
      'power_rack',
      'flat_bench',
      'incline_bench',
      'lat_pulldown',
      'low_row_pulley',
      'smith_machine',
      'leg_press',
      'cable_crossover',
      'resistance_band',
      'suspension_trainer',
      'pull_up_bar',
      'dip_station',
      'plyo_box',
      'ab_wheel',
      'bodyweight'
    ];

    for (const expectedId of expectedIds) {
      expect(ids).toContain(expectedId);
    }
  });

  it('should provide a seedEquipment function that executes SQL inserts/upserts', async () => {
    const { seedEquipment, EQUIPMENT_SEED_DATA } = await import('../../src/db/seeds/equipment.seed.js');
    expect(typeof seedEquipment).toBe('function');

    const mockQuery = vi.fn().mockResolvedValue({ rowCount: 1 });
    const mockClient = { query: mockQuery as (text: string, params?: unknown[]) => Promise<unknown> };

    const result = await seedEquipment(mockClient);
    expect(mockQuery).toHaveBeenCalled();
    expect(result).toHaveLength(EQUIPMENT_SEED_DATA.length);
  });
});
