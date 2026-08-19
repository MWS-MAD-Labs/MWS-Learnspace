import { Pool } from 'pg';

export type Database = {
  check: () => Promise<void>;
  close: () => Promise<void>;
};

const databaseTimeoutMs = 2_000;

export function createDatabase(databaseUrl: string): Database {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: databaseTimeoutMs,
    query_timeout: databaseTimeoutMs,
    statement_timeout: databaseTimeoutMs,
  });

  return {
    async check() {
      await pool.query('SELECT 1');
    },
    async close() {
      await pool.end();
    },
  };
}
