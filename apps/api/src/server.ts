import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './database.js';
import { createLogger } from './logger.js';
import { scheduleAuthCleanup } from './authCleanup.js';
import { OAuthService } from './oauthService.js';
import { SessionService } from './sessionService.js';

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
  };
  const cleanupTimer = scheduleAuthCleanup(auth, logger);
  const app = createApp({ config, database, logger, auth });
  const server = createServer(app);

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

  server.listen(config.port, '0.0.0.0', () => {
    logger.info(
      { port: config.port, environment: config.nodeEnv },
      'API listening',
    );
  });

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
