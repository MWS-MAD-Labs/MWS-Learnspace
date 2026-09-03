import type { Logger } from './logger.js';
import type { OAuthService } from './oauthService.js';
import type { SessionService } from './sessionService.js';
import type { Observability } from './observability.js';

const defaultCleanupIntervalMs = 60 * 60 * 1000;

export function scheduleAuthCleanup(
  services: { sessions: SessionService; oauth: OAuthService },
  logger: Logger,
  intervalMs = defaultCleanupIntervalMs,
  observability?: Observability,
): NodeJS.Timeout {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    const startedAt = process.hrtime.bigint();
    try {
      const [sessions, transactions] = await Promise.all([
        services.sessions.cleanup(),
        services.oauth.cleanup(),
      ]);
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      observability?.observeAuthCleanup('success', durationSeconds);
      logger.debug(
        {
          deletedSessions: sessions.count,
          deletedOAuthTransactions: transactions.count,
          durationMs: Number((durationSeconds * 1000).toFixed(2)),
        },
        'authentication cleanup completed',
      );
    } catch (error) {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      observability?.observeAuthCleanup('failure', durationSeconds);
      logger.warn(
        { error: error instanceof Error ? error.message : 'unknown error' },
        'authentication cleanup failed',
      );
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref();
  return timer;
}
