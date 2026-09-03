import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleAuthCleanup } from '../src/authCleanup.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('scheduleAuthCleanup', () => {
  it('runs both cleanup tasks and logs deleted counts', async () => {
    vi.useFakeTimers();
    const sessions = { cleanup: vi.fn(async () => ({ count: 2 })) };
    const oauth = { cleanup: vi.fn(async () => ({ count: 3 })) };
    const logger = { debug: vi.fn(), warn: vi.fn() };
    const observability = { observeAuthCleanup: vi.fn() };

    const timer = scheduleAuthCleanup(
      { sessions, oauth } as never,
      logger as never,
      1_000,
      observability as never,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    clearInterval(timer);

    expect(sessions.cleanup).toHaveBeenCalledOnce();
    expect(oauth.cleanup).toHaveBeenCalledOnce();
    expect(logger.debug).toHaveBeenCalledWith(
      {
        deletedSessions: 2,
        deletedOAuthTransactions: 3,
        durationMs: expect.any(Number),
      },
      'authentication cleanup completed',
    );
    expect(observability.observeAuthCleanup).toHaveBeenCalledWith(
      'success',
      expect.any(Number),
    );
  });

  it('logs cleanup failures without creating an unhandled rejection', async () => {
    vi.useFakeTimers();
    const failure = new Error('database offline');
    const sessions = { cleanup: vi.fn(async () => Promise.reject(failure)) };
    const oauth = { cleanup: vi.fn(async () => ({ count: 0 })) };
    const logger = { debug: vi.fn(), warn: vi.fn() };
    const observability = { observeAuthCleanup: vi.fn() };

    const timer = scheduleAuthCleanup(
      { sessions, oauth } as never,
      logger as never,
      1_000,
      observability as never,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    clearInterval(timer);

    expect(logger.warn).toHaveBeenCalledWith(
      { error: 'database offline' },
      'authentication cleanup failed',
    );
    expect(observability.observeAuthCleanup).toHaveBeenCalledWith(
      'failure',
      expect.any(Number),
    );
  });
});
