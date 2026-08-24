import type { Logger } from './logger.js';
import type { OAuthService } from './oauthService.js';
import type { SessionService } from './sessionService.js';

const defaultCleanupIntervalMs = 60 * 60 * 1000;

export function scheduleAuthCleanup(
  services: { sessions: SessionService; oauth: OAuthService },
  logger: Logger,
  intervalMs = defaultCleanupIntervalMs,
): NodeJS.Timeout {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const [sessions, transactions] = await Promise.all([
        services.sessions.cleanup(),
        services.oauth.cleanup(),
      ]);
      logger.debug(
        {
          deletedSessions: sessions.count,
          deletedOAuthTransactions: transactions.count,
        },
        'authentication cleanup completed',
      );
    } catch (error) {
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
