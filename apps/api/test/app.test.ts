import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';
import type { Database } from '../src/database.js';
import type { Logger } from '../src/logger.js';

const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: 'postgresql://localhost/learnspace',
  appUrl: 'http://localhost:3000',
  sessionSecret: 'a-secure-session-secret-with-32-characters',
  googleClientId: 'client',
  googleClientSecret: 'secret',
  googleAllowedDomains: [],
  logLevel: 'info',
};

const logger: Logger = {
  fatal: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

function database(
  check: () => Promise<void> = async () => undefined,
): Database {
  return { check, close: async () => undefined };
}

describe('API', () => {
  it('returns liveness and propagates a request ID', async () => {
    const response = await request(
      createApp({ config, database: database(), logger }),
    )
      .get('/health/live')
      .set('x-request-id', 'request-123');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('request-123');
    expect(response.body).toEqual({ status: 'live' });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('returns the API version', async () => {
    const response = await request(
      createApp({ config, database: database(), logger }),
    ).get('/api/v1/version');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      name: 'learnspace-api',
      version: '0.1.0-alpha.2',
    });
  });

  it('reports database readiness', async () => {
    const response = await request(
      createApp({ config, database: database(), logger }),
    ).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
      dependencies: { database: 'up' },
    });
  });

  it('becomes unready when PostgreSQL is unavailable', async () => {
    const response = await request(
      createApp({
        config,
        database: database(async () => Promise.reject(new Error('offline'))),
        logger,
      }),
    ).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unavailable',
      dependencies: { database: 'down' },
    });
  });

  it('returns a consistent 404 envelope', async () => {
    const response = await request(
      createApp({ config, database: database(), logger }),
    ).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(response.body.error.requestId).toBeTruthy();
  });

  it('returns a safe invalid JSON response', async () => {
    const response = await request(
      createApp({ config, database: database(), logger }),
    )
      .post('/api/v1/version')
      .set('content-type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('returns a safe response when the JSON body exceeds the limit', async () => {
    const response = await request(
      createApp({ config, database: database(), logger }),
    )
      .post('/api/v1/version')
      .send({ content: 'x'.repeat(110 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body.error).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body exceeds the allowed size.',
    });
    expect(response.body.error.requestId).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain('entity.too.large');
  });

  it('does not expose stack traces for unexpected errors', async () => {
    const response = await request(
      createApp({ config, database: database(), logger }),
    ).get('/__test/error');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('test failure');
    expect(JSON.stringify(response.body)).not.toContain('stack');
  });
});
