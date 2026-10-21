import { z } from 'zod';

const seedEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  ALLOW_DATABASE_SEED: z.literal('true'),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL URL',
    ),
});

export function assertSeedAllowed(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const result = seedEnvironmentSchema.safeParse(environment);
  if (!result.success || result.data.NODE_ENV === 'production') {
    throw new Error(
      'Database seed refused: require NODE_ENV=development|test, ALLOW_DATABASE_SEED=true, and a valid DATABASE_URL.',
    );
  }
  return result.data;
}
