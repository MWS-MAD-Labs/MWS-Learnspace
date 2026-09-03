import { describe, expect, it, vi } from 'vitest';
import { createLogger, redactLogValue } from '../src/logger.js';

describe('logger redaction', () => {
  it('recursively redacts sensitive keys while retaining operational fields', () => {
    const value = redactLogValue({
      traceId: 'trace-safe',
      deletedSessions: 2,
      deletedOAuthTransactions: 3,
      nested: {
        email: 'private@example.org',
        sessions: ['private-session'],
        session_id: 'private-session-id',
        sessionToken: 'secret-token',
        organizationId: 'private-org',
        list: [{ studentId: 'private-student', count: 2 }],
      },
    });

    expect(value).toEqual({
      traceId: 'trace-safe',
      deletedSessions: 2,
      deletedOAuthTransactions: 3,
      nested: {
        email: '[REDACTED]',
        sessions: '[REDACTED]',
        session_id: '[REDACTED]',
        sessionToken: '[REDACTED]',
        organizationId: '[REDACTED]',
        list: [{ studentId: '[REDACTED]', count: 2 }],
      },
    });
  });

  it('redacts before writing JSON logs', () => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = createLogger({ logLevel: 'info' });
    logger.info(
      { traceId: 'trace-safe', request: { cookie: 'secret-cookie' } },
      'test log',
    );

    const entry = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(entry.traceId).toBe('trace-safe');
    expect(entry.request.cookie).toBe('[REDACTED]');
    expect(JSON.stringify(entry)).not.toContain('secret-cookie');
    output.mockRestore();
  });
});
