import { pool } from '../../config/db.js';
import { seedEquipment } from './equipment.seed.js';
import { seedExercises } from './exercises.seed.js';

export async function runAllSeeds(): Promise<void> {
  console.info('🌱 Starting full database seed process...');
  const equipmentResult = await seedEquipment(pool);
  console.info(`✅ Seeded ${equipmentResult.length} equipment taxonomy items.`);

  const exerciseResult = await seedExercises(pool);
  console.info(
    `✅ Seeded ${exerciseResult.exercisesCount} exercises and ${exerciseResult.alternativesCount} biomechanical alternatives.`
  );
  console.info('🎉 All seeds completed successfully!');
}

if (process.argv[1]?.includes('seeds/index') || process.argv[1]?.includes('seeds\\index')) {
  runAllSeeds()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding failed with error:', err);
      process.exit(1);
    });
}
