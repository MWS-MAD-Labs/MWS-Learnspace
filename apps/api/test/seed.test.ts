import { describe, expect, it } from 'vitest';
import { assertSeedAllowed } from '../src/seedGuard.js';

describe('database seed guard', () => {
  it('allows explicit development seeding', () => {
    expect(
      assertSeedAllowed({
        NODE_ENV: 'development',
        ALLOW_DATABASE_SEED: 'true',
        DATABASE_URL: 'postgresql://localhost/learnspace',
      }).NODE_ENV,
    ).toBe('development');
  });

  it('refuses production seeding', () => {
    expect(() =>
      assertSeedAllowed({
        NODE_ENV: 'production',
        ALLOW_DATABASE_SEED: 'true',
        DATABASE_URL: 'postgresql://localhost/learnspace',
      }),
    ).toThrow('Database seed refused');
  });

  it('requires explicit opt-in', () => {
    expect(() =>
      assertSeedAllowed({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost/learnspace',
      }),
    ).toThrow('Database seed refused');
  });
});
