import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolConstructor, query, end } = vi.hoisted(() => ({
  poolConstructor: vi.fn(),
  query: vi.fn().mockResolvedValue(undefined),
  end: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('pg', () => ({
  Pool: class {
    constructor(config: unknown) {
      poolConstructor(config);
    }

    query = query;
    end = end;
  },
}));

import { createDatabase } from '../src/database.js';

describe('createDatabase', () => {
  beforeEach(() => {
    poolConstructor.mockClear();
    query.mockClear();
    end.mockClear();
  });

  it('bounds PostgreSQL connection and query operations for readiness checks', async () => {
    const database = createDatabase('postgresql://localhost/learnspace');

    expect(poolConstructor).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost/learnspace',
      max: 5,
      connectionTimeoutMillis: 2_000,
      query_timeout: 2_000,
      statement_timeout: 2_000,
    });

    await database.check();
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });
});
