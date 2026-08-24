import { PrismaClient } from '@prisma/client';

export const requiredMigration = '20260820000000_google_oauth_authorization';
const databaseTimeoutMs = 2_000;

export class IncompatibleDatabaseSchemaError extends Error {
  constructor() {
    super(
      `Database schema is incompatible. Apply Prisma migration ${requiredMigration} with the migration deployment command.`,
    );
    this.name = 'IncompatibleDatabaseSchemaError';
  }
}

export type Database = {
  client?: PrismaClient;
  check: () => Promise<void>;
  close: () => Promise<void>;
};

type ReadinessTransaction = {
  $executeRaw: PrismaClient['$executeRaw'];
  $queryRaw: PrismaClient['$queryRaw'];
};

type PrismaDatabaseClient = PrismaClient & {
  $transaction: <T>(
    operation: (transaction: ReadinessTransaction) => Promise<T>,
    options: {
      isolationLevel: 'ReadCommitted';
      maxWait: number;
      timeout: number;
    },
  ) => Promise<T>;
  $disconnect: PrismaClient['$disconnect'];
};

export function createDatabase(
  databaseUrl: string,
  client: PrismaDatabaseClient = new PrismaClient({
    datasourceUrl: databaseUrl,
  }),
): Database {
  return {
    client,
    async check() {
      try {
        const migrations = await client.$transaction(
          async (transaction) => {
            await transaction.$executeRaw`
              SELECT set_config(
                'statement_timeout',
                ${String(databaseTimeoutMs)},
                true
              )
            `;
            await transaction.$executeRaw`
              SELECT set_config(
                'lock_timeout',
                ${String(databaseTimeoutMs)},
                true
              )
            `;
            return transaction.$queryRaw<Array<{ compatible: boolean }>>`
              SELECT EXISTS (
                SELECT 1
                FROM "_prisma_migrations"
                WHERE "migration_name" = ${requiredMigration}
                  AND "finished_at" IS NOT NULL
                  AND "rolled_back_at" IS NULL
              ) AS "compatible"
            `;
          },
          {
            isolationLevel: 'ReadCommitted',
            maxWait: databaseTimeoutMs,
            timeout: databaseTimeoutMs + 500,
          },
        );

        if (migrations[0]?.compatible !== true) {
          throw new IncompatibleDatabaseSchemaError();
        }
      } catch (error) {
        const databaseError = error as {
          code?: string;
          meta?: { code?: string };
        };
        if (
          error instanceof IncompatibleDatabaseSchemaError ||
          (databaseError.code === 'P2010' &&
            databaseError.meta?.code === '42P01')
        ) {
          throw new IncompatibleDatabaseSchemaError();
        }
        throw error;
      }
    },
    async close() {
      await client.$disconnect();
    },
  };
}
