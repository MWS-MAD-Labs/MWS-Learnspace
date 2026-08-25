import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const fixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  unitId: '40000000-0000-4000-8000-000000000001',
  gradeId: '50000000-0000-4000-8000-000000000001',
  directorEmail: 'p5.director@example.test',
  principalEmail: 'p5.principal@example.test',
  authSecret: 'attendance-e2e-auth-secret-at-least-32-characters',
};

async function authenticate(context: BrowserContext, email: string) {
  const response = await context.request.post('/api/v1/test-auth/session', {
    headers: {
      'x-learnspace-e2e-secret': fixture.authSecret,
      'x-learnspace-e2e-user-email': email,
    },
  });
  expect(response.status()).toBe(204);
}

async function openPeopleAccess(page: Page) {
  await page.goto('/');
  await expect(
    page.getByText('Dana P5 Director', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'People & access' }).click();
  await expect(
    page.getByRole('heading', { name: 'People & access' }),
  ).toBeVisible();
}

test('P5 user and membership administration persists while authorization remains server-enforced', async ({
  browser,
}) => {
  const directorContext = await browser.newContext();
  await authenticate(directorContext, fixture.directorEmail);
  const directorPage = await directorContext.newPage();
  await openPeopleAccess(directorPage);

  await directorPage.getByRole('button', { name: 'New account' }).click();
  await directorPage.getByLabel('Display name').fill('Morgan P5 Teacher');
  await directorPage.getByLabel('Email').fill('morgan.p5@example.test');
  await directorPage
    .getByLabel('Role', { exact: true })
    .selectOption('GRADE_TEACHER');
  await directorPage.getByLabel('Role title').fill('Grade 1 Homeroom Teacher');
  await directorPage.getByLabel('Elementary').check();
  await directorPage.getByLabel('Grade 1').check();
  await directorPage.getByRole('button', { name: 'Create account' }).click();
  await expect(directorPage.getByText('Account access created.')).toBeVisible();
  await expect(directorPage.getByText('morgan.p5@example.test')).toBeVisible();

  await directorPage.reload();
  await directorPage.getByRole('button', { name: 'People & access' }).click();
  await directorPage.getByRole('button', { name: /Morgan P5 Teacher/ }).click();
  await expect(directorPage.getByLabel('Role', { exact: true })).toHaveValue(
    'GRADE_TEACHER',
  );
  await expect(directorPage.getByLabel('Elementary')).toBeChecked();
  await expect(directorPage.getByLabel('Grade 1')).toBeChecked();

  await directorPage
    .getByLabel('Role', { exact: true })
    .selectOption('SPECIALIST');
  await directorPage.getByLabel('Role title').fill('Occupational Therapist');
  await directorPage
    .getByRole('button', { name: 'Save access changes' })
    .click();
  await expect(directorPage.getByText('Account access updated.')).toBeVisible();

  const persisted = await directorContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/accounts`,
  );
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toMatchObject({
    data: expect.arrayContaining([
      expect.objectContaining({
        email: 'morgan.p5@example.test',
        role: 'SPECIALIST',
        roleTitle: 'Occupational Therapist',
        unitIds: [],
        gradeIds: [],
      }),
    ]),
  });

  const principalContext = await browser.newContext();
  await authenticate(principalContext, fixture.principalEmail);
  const principalPage = await principalContext.newPage();
  await principalPage.goto('/');
  await expect(
    principalPage.getByRole('button', { name: 'People & access' }),
  ).not.toBeVisible();
  const denied = await principalContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/accounts`,
  );
  expect(denied.status()).toBe(403);
  expect(await denied.json()).toMatchObject({
    error: { code: 'AUTHORIZATION_DENIED' },
  });

  await principalContext.close();
  await directorContext.close();
});
