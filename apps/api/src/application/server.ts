import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from '../lib/config.js';
import { createDatabase } from '../lib/database.js';
import { createLogger } from '../lib/logger.js';
import { scheduleAuthCleanup } from '../service/auth-cleanup-service.js';
import { OAuthService } from '../service/oauth-service.js';
import { SessionService } from '../service/session-service.js';
import { createSharedSessionShadow } from '../service/shared-session-shadow-service.js';
import { createSharedSessionAuthentication } from '../service/shared-session-service.js';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);
  const database = createDatabase(config.databaseUrl);
  if (!database.client) throw new Error('Database client is unavailable.');
  const auth = {
    sessions: new SessionService(
      database.client,
      config.sessionSecret,
      config.sessionTtlHours,
    ),
    oauth: new OAuthService(database.client, config),
    shadowObserver: await createSharedSessionShadow(
      config,
      database.client,
      logger,
    ),
    shared: await createSharedSessionAuthentication(
      config,
      database.client,
      logger,
    ),
  };
  const cleanupTimer = scheduleAuthCleanup(auth, logger);
  const app = createApp({ config, database, logger, auth });
  const server = serve(
    { fetch: app.fetch, port: config.port, hostname: '0.0.0.0' },
    (address) => {
      logger.info(
        { port: address.port, environment: config.nodeEnv },
        'API listening',
      );
    },
  );

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(cleanupTimer);
    logger.info({ signal }, 'shutdown started');

    server.close(async (error) => {
      try {
        await database.close();
      } catch (databaseError) {
        logger.error(
          {
            error:
              databaseError instanceof Error
                ? databaseError.message
                : 'unknown error',
          },
          'database shutdown failed',
        );
      }

      if (error) {
        logger.error({ error: error.message }, 'server shutdown failed');
        process.exitCode = 1;
      }
    });

    setTimeout(() => {
      logger.error({}, 'forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message: error instanceof Error ? error.message : 'API startup failed',
    }),
  );
  process.exitCode = 1;
});
