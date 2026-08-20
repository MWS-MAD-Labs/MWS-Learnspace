import { describe, expect, it, vi } from 'vitest';
import {
  createDatabase,
  IncompatibleDatabaseSchemaError,
  requiredMigration,
} from '../src/database.js';

function clientWithQuery(queryRaw: ReturnType<typeof vi.fn>) {
  const executeRaw = vi.fn().mockResolvedValue(1);
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const transaction = vi.fn(
    async (operation: (transaction: unknown) => unknown) =>
      operation({ $executeRaw: executeRaw, $queryRaw: queryRaw }),
  );
  return { executeRaw, disconnect, transaction };
}

describe('createDatabase', () => {
  it('checks the required migration with parameterized PostgreSQL timeouts', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ compatible: true }]);
    const mock = clientWithQuery(queryRaw);
    const database = createDatabase('postgresql://localhost/learnspace', {
      $transaction: mock.transaction,
      $disconnect: mock.disconnect,
    } as never);

    await database.check();
    expect(mock.executeRaw).toHaveBeenCalledTimes(2);
    expect(String(mock.executeRaw.mock.calls[0]?.[0])).toContain(
      'statement_timeout',
    );
    expect(mock.executeRaw.mock.calls[0]).toContain('2000');
    expect(String(mock.executeRaw.mock.calls[1]?.[0])).toContain(
      'lock_timeout',
    );
    expect(mock.executeRaw.mock.calls[1]).toContain('2000');
    expect(queryRaw).toHaveBeenCalledOnce();
    expect(String(queryRaw.mock.calls[0]?.[0])).toContain('_prisma_migrations');
    expect(queryRaw.mock.calls[0]).toContain(requiredMigration);
    expect(mock.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'ReadCommitted',
      maxWait: 2_000,
      timeout: 2_500,
    });

    await database.close();
    expect(mock.disconnect).toHaveBeenCalledOnce();
  });

  it('rejects a database without the required migration', async () => {
    const mock = clientWithQuery(
      vi.fn().mockResolvedValue([{ compatible: false }]),
    );
    const database = createDatabase('postgresql://localhost/learnspace', {
      $transaction: mock.transaction,
      $disconnect: mock.disconnect,
    } as never);

    await expect(database.check()).rejects.toBeInstanceOf(
      IncompatibleDatabaseSchemaError,
    );
  });

  it('reports an actionable error when the migration table is missing', async () => {
    const mock = clientWithQuery(
      vi.fn().mockRejectedValue({
        code: 'P2010',
        meta: { code: '42P01' },
      }),
    );
    const database = createDatabase('postgresql://localhost/learnspace', {
      $transaction: mock.transaction,
      $disconnect: mock.disconnect,
    } as never);

    await expect(database.check()).rejects.toBeInstanceOf(
      IncompatibleDatabaseSchemaError,
    );
  });

  it('propagates unavailable database failures', async () => {
    const transaction = vi.fn().mockRejectedValue(new Error('offline'));
    const database = createDatabase('postgresql://localhost/learnspace', {
      $transaction: transaction,
      $disconnect: vi.fn(),
    } as never);

    await expect(database.check()).rejects.toThrow('offline');
  });
});
