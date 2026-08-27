import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const fixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  iepId: '74000000-0000-4000-8000-000000000001',
  authorEmail: 'p5.iep.author@example.test',
  unassignedEmail: 'p5.iep.unassigned@example.test',
  leadershipEmail: 'p5.principal@example.test',
  assignedStudentName: 'River IEP Student',
  inaccessibleStudentName: 'Skyler Inaccessible Student',
  seededGoal:
    'River will independently request a break during an unexpected transition in 4 of 5 observed opportunities.',
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

async function expectNoLegacyIepStorage(page: Page) {
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('mws_iep_records_v2')))
    .toBeNull();
}

async function openIepWorkspace(page: Page, displayName: string) {
  await page.goto('/');
  await expect(page.getByText(displayName, { exact: true })).toBeVisible();

  const iepNavigation = page.locator('#nav-sp-iep');
  if (!(await iepNavigation.isVisible())) {
    await page.locator('#nav-special-ed-toggle').click();
  }
  await iepNavigation.click();
  await expect(page.locator('#iep-plan-view')).toBeVisible();
}

function considerationInput(page: Page) {
  return page
    .getByText('Special Consideration / Program Type', { exact: true })
    .locator('..')
    .locator('input');
}

test('P5-008 assigned author edits and reloads a complete server-backed IEP draft', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await authenticate(context, fixture.authorEmail);
  const page = await context.newPage();

  await openIepWorkspace(page, 'Avery IEP Author');
  await expect(
    page.getByRole('heading', { name: fixture.assignedStudentName }),
  ).toBeVisible();
  await expect(page.locator('#iep-student-select')).toHaveValue(
    '80000000-0000-4000-8000-000000000004',
  );
  await expect(
    page.locator('#iep-student-select').locator('option'),
  ).toHaveCount(1);
  await expect(
    page.locator('#iep-student-select').locator('option', {
      hasText: fixture.inaccessibleStudentName,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      /River will independently request a break during an unexpected transition/,
    ),
  ).toBeVisible();
  await expectNoLegacyIepStorage(page);

  const updatedConsideration = 'P5-008 individualized support draft';
  await page.getByRole('button', { name: 'Profile & Team' }).click();
  await considerationInput(page).fill(updatedConsideration);

  const updatedGoal =
    'River will independently request a break during an unexpected transition in 5 of 5 observed opportunities.';
  await page.getByRole('button', { name: /SMART Goals/ }).click();
  await page.getByTitle('Edit SMART Goal').click();
  const goalDialog = page
    .getByRole('heading', { name: /Edit Goal/ })
    .locator('../..');
  await goalDialog.locator('textarea').fill(updatedGoal);
  await goalDialog.getByRole('button', { name: 'Save Goal' }).click();
  await expect(page.getByText(updatedGoal, { exact: true })).toBeVisible();

  await page.locator('#iep-save-plan-btn').click();
  await expect(page.getByText('IEP Plan Saved', { exact: true })).toBeVisible();
  await expectNoLegacyIepStorage(page);

  await page.reload();
  await openIepWorkspace(page, 'Avery IEP Author');
  await page.getByRole('button', { name: 'Profile & Team' }).click();
  await expect(considerationInput(page)).toHaveValue(updatedConsideration);
  await page.getByRole('button', { name: /SMART Goals/ }).click();
  await expect(page.getByText(updatedGoal, { exact: true })).toBeVisible();
  await expectNoLegacyIepStorage(page);

  await context.close();
});

test('P5-008 unassigned special-ed teacher is denied and cannot discover the IEP', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await authenticate(context, fixture.unassignedEmail);

  const students = await context.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students`,
  );
  expect(students.status()).toBe(403);
  expect(await students.json()).toMatchObject({
    error: { code: 'AUTHORIZATION_DENIED' },
  });

  const scopedIeps = await context.request.get(
    `/api/v1/organizations/${fixture.organizationId}/ieps`,
  );
  expect(scopedIeps.status()).toBe(200);
  expect(await scopedIeps.json()).toMatchObject({
    data: [],
    meta: { count: 0 },
  });

  const deniedIep = await context.request.get(
    `/api/v1/organizations/${fixture.organizationId}/ieps/${fixture.iepId}`,
  );
  expect(deniedIep.status()).toBe(403);
  expect(await deniedIep.json()).toMatchObject({
    error: { code: 'AUTHORIZATION_DENIED' },
  });

  const page = await context.newPage();
  await page.goto('/');
  await expect(
    page.getByText(fixture.assignedStudentName, { exact: true }),
  ).not.toBeVisible();
  await expect(page.locator('#iep-plan-view')).not.toBeVisible();
  await expectNoLegacyIepStorage(page);

  await context.close();
});

test('P5-008 leadership can read the complete draft without authoring controls', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await authenticate(context, fixture.leadershipEmail);
  const page = await context.newPage();

  await openIepWorkspace(page, 'Priya P5 Principal');
  await page
    .locator('#iep-student-select')
    .selectOption('80000000-0000-4000-8000-000000000004');
  await expect(
    page.getByText(
      /River will independently request a break during an unexpected transition/,
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Profile & Team' }).click();
  await expect(considerationInput(page)).not.toHaveValue('');
  await expect(considerationInput(page)).toBeDisabled();
  await page.getByRole('button', { name: /SMART Goals/ }).click();
  await expect(page.locator('#btn-add-smart-goal')).not.toBeVisible();
  await expect(page.locator('#iep-save-plan-btn')).not.toBeVisible();
  await expect(page.getByTitle('Edit SMART Goal')).not.toBeVisible();
  await expectNoLegacyIepStorage(page);

  await context.close();
});
