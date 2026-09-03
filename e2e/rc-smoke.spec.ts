import { expect, test } from '@playwright/test';

test('release candidate exposes live, ready, and version endpoints', async ({
  request,
}) => {
  const live = await request.get('/health');
  expect(live.status()).toBe(200);
  expect(await live.json()).toMatchObject({ status: 'live' });

  const ready = await request.get('/health/ready');
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toMatchObject({
    status: 'ready',
    dependencies: { database: 'up' },
  });

  const version = await request.get('/api/v1/version');
  expect(version.status()).toBe(200);
  expect(await version.json()).toMatchObject({
    name: 'learnspace-api',
    version: expect.stringMatching(/^\d+\.\d+\.\d+(?:[-+].+)?$/),
  });
});

test('release candidate serves a hardened first-party application shell', async ({
  page,
}) => {
  const expectedOrigin = new URL(
    process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3001',
  ).origin;
  const unexpectedExternalTraffic = new Set<string>();
  page.on('response', (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin !== expectedOrigin) {
      unexpectedExternalTraffic.add(responseUrl.origin);
    }
  });
  page.on('requestfailed', (request) => {
    const requestUrl = new URL(request.url());
    if (
      requestUrl.origin !== expectedOrigin &&
      request.failure()?.errorText !== 'csp'
    ) {
      unexpectedExternalTraffic.add(requestUrl.origin);
    }
  });

  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()).toMatchObject({
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  });
  const contentSecurityPolicy = response?.headers()['content-security-policy'];
  expect(contentSecurityPolicy).toContain("default-src 'self'");
  expect(contentSecurityPolicy).toContain("img-src 'self'");
  expect(contentSecurityPolicy).not.toContain('images.unsplash.com');
  expect(contentSecurityPolicy).not.toContain('googleusercontent.com');
  await expect(
    page.getByRole('heading', { name: 'Sign in to Learnspace', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();
  expect([...unexpectedExternalTraffic]).toEqual([]);
});

test('operator metrics are not exposed by the public web proxy', async ({
  request,
}) => {
  const response = await request.get('/metrics');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(await response.text()).not.toContain('learnspace_http_requests_total');
});
