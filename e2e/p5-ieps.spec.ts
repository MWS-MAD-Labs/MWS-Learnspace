import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const fixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  iepId: '74000000-0000-4000-8000-000000000001',
  authorEmail: 'p5.iep.author@example.test',
  unassignedEmail: 'p5.iep.unassigned@example.test',
  leadershipEmail: 'p5.principal@example.test',
  coordinatorEmail: 'p5.observation.coordinator@example.test',
  directorEmail: 'p5.director@example.test',
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

async function csrfHeaders(request: APIRequestContext) {
  const state = await request.storageState();
  const token = state.cookies.find(
    (cookie) => cookie.name === 'learnspace_csrf',
  )?.value;
  expect(token).toBeTruthy();
  return { 'x-csrf-token': token as string };
}

function createCommandFromIep(iep: Record<string, any>) {
  return {
    studentId: iep.student.id,
    academicYearId: iep.academicYear.id,
    semesterId: iep.semester?.id ?? null,
    consideration: iep.consideration,
    primaryClassification: iep.primaryClassification,
    currentPlacement: iep.currentPlacement,
    homePartnershipSupport: iep.homePartnershipSupport,
    homePartnershipRecommendations: iep.homePartnershipRecommendations,
    progressMeasurementMethods: iep.progressMeasurementMethods,
    parentCommunicationMethods: iep.parentCommunicationMethods,
    parentApproved: iep.parentApproved,
    parentName: iep.parentName,
    parentApprovalDate: iep.parentApprovalDate,
    startsOn: iep.startsOn,
    endsOn: iep.endsOn,
    teamMembers: iep.teamMembers.map(
      ({ role, name, initials, confirmed, position }: Record<string, any>) => ({
        role,
        name,
        initials,
        confirmed,
        position,
      }),
    ),
    performanceAreas: iep.performanceAreas.map(
      ({
        name,
        category,
        strengths,
        needs,
        impactOfNeed,
        informationSource,
        assessmentProcess,
        assessmentDate,
        summaryOfResults,
        position,
      }: Record<string, any>) => ({
        name,
        category,
        strengths,
        needs,
        impactOfNeed,
        informationSource,
        assessmentProcess,
        assessmentDate,
        summaryOfResults,
        position,
      }),
    ),
    accommodations: iep.accommodations.map(
      ({
        category,
        subject,
        code,
        description,
        position,
      }: Record<string, any>) => ({
        category,
        subject,
        code,
        description,
        position,
      }),
    ),
    goals: iep.goals.map(
      ({
        code,
        performanceArea,
        longTermGoal,
        shortTermGoal,
        measurableGoal,
        strategyActivity,
        learningExpectation,
        learningStrategy,
        evaluationMethod,
        schedule,
        targetDate,
        position,
      }: Record<string, any>) => ({
        code,
        performanceArea,
        longTermGoal,
        shortTermGoal,
        measurableGoal,
        strategyActivity,
        learningExpectation,
        learningStrategy,
        evaluationMethod,
        schedule,
        targetDate,
        position,
      }),
    ),
    services: iep.services.map(
      ({
        serviceName,
        type,
        duration,
        frequency,
        location,
        days,
        position,
      }: Record<string, any>) => ({
        serviceName,
        type,
        duration,
        frequency,
        location,
        days,
        position,
      }),
    ),
  };
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

test('P5-009 compose-backed IEP submission, review, return, approval, activation, and archival flow', async ({
  browser,
}) => {
  const author = await browser.newContext();
  const coordinator = await browser.newContext();
  const director = await browser.newContext();
  await Promise.all([
    authenticate(author, fixture.authorEmail),
    authenticate(coordinator, fixture.coordinatorEmail),
    authenticate(director, fixture.directorEmail),
  ]);
  const [authorHeaders, coordinatorHeaders, directorHeaders] =
    await Promise.all([
      csrfHeaders(author.request),
      csrfHeaders(coordinator.request),
      csrfHeaders(director.request),
    ]);
  const base = `/api/v1/organizations/${fixture.organizationId}/ieps`;
  const sourceResponse = await author.request.get(`${base}/${fixture.iepId}`);
  expect(sourceResponse.status()).toBe(200);
  const source = (await sourceResponse.json()).data;
  const created = await author.request.post(base, {
    headers: authorHeaders,
    data: createCommandFromIep(source),
  });
  expect(created.status()).toBe(201);
  const iepId = (await created.json()).data.id as string;
  const path = `${base}/${iepId}`;

  const submit = await author.request.post(`${path}/submit`, {
    headers: authorHeaders,
    data: { expectedVersion: 1 },
  });
  expect(await submit.json()).toMatchObject({
    data: { state: 'COORDINATOR_REVIEW', version: 2 },
  });

  const coordinatorReturn = await coordinator.request.post(
    `${path}/coordinator-review`,
    {
      headers: coordinatorHeaders,
      data: {
        expectedVersion: 2,
        decision: 'RETURN',
        comment: 'Clarify the service frequency before approval.',
      },
    },
  );
  expect(await coordinatorReturn.json()).toMatchObject({
    data: { state: 'DRAFT', version: 3 },
  });

  await author.request.post(`${path}/submit`, {
    headers: authorHeaders,
    data: { expectedVersion: 3 },
  });
  const coordinatorApproval = await coordinator.request.post(
    `${path}/coordinator-review`,
    {
      headers: coordinatorHeaders,
      data: { expectedVersion: 4, decision: 'APPROVE' },
    },
  );
  expect(await coordinatorApproval.json()).toMatchObject({
    data: { state: 'DIRECTOR_APPROVAL', version: 5 },
  });

  const directorReturn = await director.request.post(
    `${path}/director-review`,
    {
      headers: directorHeaders,
      data: {
        expectedVersion: 5,
        decision: 'RETURN',
        comment: 'Confirm the final parent communication method.',
      },
    },
  );
  expect(await directorReturn.json()).toMatchObject({
    data: { state: 'COORDINATOR_REVIEW', version: 6 },
  });

  await coordinator.request.post(`${path}/coordinator-review`, {
    headers: coordinatorHeaders,
    data: { expectedVersion: 6, decision: 'APPROVE' },
  });
  const approved = await director.request.post(`${path}/director-review`, {
    headers: directorHeaders,
    data: { expectedVersion: 7, decision: 'APPROVE' },
  });
  expect(await approved.json()).toMatchObject({
    data: { state: 'APPROVED', version: 8 },
  });

  const activated = await director.request.post(`${path}/activate`, {
    headers: directorHeaders,
    data: { expectedVersion: 8 },
  });
  expect(await activated.json()).toMatchObject({
    data: { state: 'ACTIVE', version: 9 },
  });
  const archived = await director.request.post(`${path}/archive`, {
    headers: directorHeaders,
    data: { expectedVersion: 9 },
  });
  const archivedPayload = await archived.json();
  expect(archivedPayload).toMatchObject({
    data: {
      state: 'ARCHIVED',
      version: 10,
      workflowEvents: expect.arrayContaining([
        expect.objectContaining({ action: 'SUBMITTED' }),
        expect.objectContaining({ action: 'RETURNED' }),
        expect.objectContaining({ action: 'APPROVED' }),
        expect.objectContaining({ action: 'ACTIVATED' }),
        expect.objectContaining({ action: 'ARCHIVED' }),
      ]),
    },
  });

  await Promise.all([author.close(), coordinator.close(), director.close()]);
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
