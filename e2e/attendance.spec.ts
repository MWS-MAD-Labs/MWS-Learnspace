import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const fixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  authorizedClassId: '60000000-0000-4000-8000-000000000001',
  forbiddenClassId: '60000000-0000-4000-8000-000000000002',
  schoolDate: '2026-08-24',
  authSecret: 'attendance-e2e-auth-secret-at-least-32-characters',
};

async function authenticate(context: BrowserContext) {
  const response = await context.request.post('/api/v1/test-auth/session', {
    headers: { 'x-learnspace-e2e-secret': fixture.authSecret },
  });
  expect(response.status()).toBe(204);
}

async function openAttendance(page: Page) {
  await page.goto('/');
  await expect(
    page.getByText('Taylor Attendance Teacher', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Attendance Today$/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Daily Attendance Roster' }),
  ).toBeVisible();
  await page.getByLabel('School date').fill(fixture.schoolDate);
  await expect(page.getByText('Alex Attendance')).toBeVisible();
  await expect(page.getByLabel('Class')).toHaveValue(fixture.authorizedClassId);
}

test('attendance persists across refresh and sessions while authz, validation, and logout remain enforced', async ({
  browser,
}) => {
  const firstContext = await browser.newContext();
  await authenticate(firstContext);
  const firstPage = await firstContext.newPage();
  await openAttendance(firstPage);

  await firstPage.getByLabel('Status for Alex Attendance').selectOption('LATE');
  await firstPage.getByRole('button', { name: 'Save attendance' }).click();
  await expect(
    firstPage.getByText('Enter whole minutes from 1 to 1440 for Late.'),
  ).toBeVisible();
  await expect(
    firstPage.getByText(
      'Fix the highlighted late-minute values before saving.',
    ),
  ).toBeVisible();

  await firstPage.getByLabel('Minutes late for Alex Attendance').fill('12');
  await firstPage
    .getByLabel('Notes for Alex Attendance')
    .fill('Playwright bus delay');
  await firstPage
    .getByLabel('Status for Blair Attendance')
    .selectOption('SICK');
  await firstPage.getByRole('button', { name: 'Save attendance' }).click();
  await expect(
    firstPage.getByText('Saved attendance for 3 students.'),
  ).toBeVisible();

  await firstPage.reload();
  await firstPage.getByRole('button', { name: /^Attendance Today$/ }).click();
  await firstPage.getByLabel('School date').fill(fixture.schoolDate);
  await expect(firstPage.getByLabel('Status for Alex Attendance')).toHaveValue(
    'LATE',
  );
  await expect(
    firstPage.getByLabel('Minutes late for Alex Attendance'),
  ).toHaveValue('12');
  await expect(firstPage.getByLabel('Notes for Alex Attendance')).toHaveValue(
    'Playwright bus delay',
  );
  await expect(firstPage.getByLabel('Status for Blair Attendance')).toHaveValue(
    'SICK',
  );

  const secondContext = await browser.newContext();
  await authenticate(secondContext);
  const secondPage = await secondContext.newPage();
  await openAttendance(secondPage);
  await expect(secondPage.getByLabel('Status for Alex Attendance')).toHaveValue(
    'LATE',
  );
  await expect(
    secondPage.getByLabel('Minutes late for Alex Attendance'),
  ).toHaveValue('12');
  await expect(
    secondPage.getByLabel('Status for Blair Attendance'),
  ).toHaveValue('SICK');

  const forbidden = await secondContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/classes/${fixture.forbiddenClassId}/attendance?schoolDate=${fixture.schoolDate}`,
  );
  expect(forbidden.status()).toBe(403);
  expect(await forbidden.json()).toMatchObject({
    error: {
      code: 'AUTHORIZATION_DENIED',
      message: 'The request was denied.',
    },
  });

  await secondPage.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    secondPage.getByRole('heading', { name: 'Sign in to Learnspace' }),
  ).toBeVisible();
  await expect(
    secondPage.getByRole('heading', { name: 'Daily Attendance Roster' }),
  ).not.toBeVisible();

  const sessionAfterLogout = await secondContext.request.get(
    '/api/v1/auth/session',
  );
  expect(sessionAfterLogout.status()).toBe(401);
  expect(await sessionAfterLogout.json()).toMatchObject({
    error: { code: 'AUTHENTICATION_REQUIRED' },
  });

  await secondContext.close();
  await firstContext.close();
});
