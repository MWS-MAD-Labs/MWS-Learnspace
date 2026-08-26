import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const fixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  coordinatorEmail: 'p5.observation.coordinator@example.test',
  specialistEmail: 'p5.observation.specialist@example.test',
  specialistMembershipId: '30000000-0000-4000-8000-000000000005',
  studentId: '80000000-0000-4000-8000-000000000001',
  academicYear: '2026-2027',
  dueDate: '2026-09-15',
  priority: 'HIGH',
  notes: 'Complete before the student support planning meeting.',
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

async function openObservationWorkspace(page: Page) {
  await page.goto('/');
  await expect(
    page.getByText('Sam Observation Specialist', { exact: true }),
  ).toBeVisible();
  await page.locator('#nav-sp-observation').click();
  await expect(page.locator('#gpk-observation-view-container')).toBeVisible();
}

async function csrfHeaders(request: APIRequestContext) {
  const state = await request.storageState();
  const token = state.cookies.find(
    (cookie) => cookie.name === 'learnspace_csrf',
  )?.value;
  expect(token).toBeTruthy();
  return { 'x-csrf-token': token as string };
}

test('P5-004 observation assignments persist their published definition version and enforce coordinator mutations', async ({
  browser,
}, testInfo) => {
  const coordinatorContext = await browser.newContext();
  await authenticate(coordinatorContext, fixture.coordinatorEmail);
  const coordinatorHeaders = await csrfHeaders(coordinatorContext.request);
  const definitionsPath = `/api/v1/organizations/${fixture.organizationId}/observation-definitions`;
  const assignmentsPath = `/api/v1/organizations/${fixture.organizationId}/observation-assignments`;
  const definitionKey = `p5-004-e2e-${testInfo.retry}`;

  const createdDefinition = await coordinatorContext.request.post(
    definitionsPath,
    {
      headers: coordinatorHeaders,
      data: {
        definitionKey,
        type: 'FEDC',
        title: 'P5-004 FEDC v1',
        framework: 'P5-004 deterministic framework',
        description: 'Initial published observation definition.',
        targetAges: '6-8',
        defaultFrequency: 'Once per term',
        body: { items: [{ id: 'engagement-v1', prompt: 'Engagement' }] },
      },
    },
  );
  expect(createdDefinition.status()).toBe(201);
  const definitionV1 = (await createdDefinition.json()).data;
  expect(definitionV1).toMatchObject({
    definitionKey,
    version: 1,
    type: 'FEDC',
    title: 'P5-004 FEDC v1',
  });

  const createdAssignment = await coordinatorContext.request.post(
    assignmentsPath,
    {
      headers: coordinatorHeaders,
      data: {
        definitionId: definitionV1.id,
        assignedToMembershipId: fixture.specialistMembershipId,
        studentId: fixture.studentId,
        academicYear: fixture.academicYear,
        dueDate: fixture.dueDate,
        priority: fixture.priority,
        notes: fixture.notes,
      },
    },
  );
  expect(createdAssignment.status()).toBe(201);
  const assignment = (await createdAssignment.json()).data;
  expect(assignment).toMatchObject({
    status: 'PENDING',
    academicYear: fixture.academicYear,
    dueDate: fixture.dueDate,
    priority: fixture.priority,
    notes: fixture.notes,
    student: { id: fixture.studentId, fullName: 'Alex Attendance' },
    assignedTo: {
      membershipId: fixture.specialistMembershipId,
      displayName: 'Sam Observation Specialist',
      role: 'SPECIALIST',
    },
    definition: {
      id: definitionV1.id,
      definitionKey,
      version: 1,
      title: 'P5-004 FEDC v1',
    },
    hasObservationRecord: false,
  });

  const persistedList = await coordinatorContext.request.get(assignmentsPath);
  expect(persistedList.status()).toBe(200);
  const persistedAssignment = (await persistedList.json()).data.find(
    (item: { id: string }) => item.id === assignment.id,
  );
  expect(persistedAssignment).toMatchObject({
    status: 'PENDING',
    academicYear: fixture.academicYear,
    dueDate: fixture.dueDate,
    priority: fixture.priority,
    notes: fixture.notes,
    definition: { id: definitionV1.id, version: 1 },
  });

  const specialistContext = await browser.newContext();
  await authenticate(specialistContext, fixture.specialistEmail);
  const specialistStudents = await specialistContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students?schoolDate=2026-08-26`,
  );
  expect(specialistStudents.status()).toBe(200);
  expect(await specialistStudents.json()).toMatchObject({
    data: expect.arrayContaining([
      expect.objectContaining({ id: fixture.studentId }),
    ]),
  });
  const specialistHeaders = await csrfHeaders(specialistContext.request);
  const deniedMutation = await specialistContext.request.post(definitionsPath, {
    headers: specialistHeaders,
    data: {
      definitionKey: `${definitionKey}-forbidden`,
      type: 'FEDC',
      title: 'Specialist must not publish',
      body: { items: [] },
    },
  });
  expect(deniedMutation.status()).toBe(403);
  expect(await deniedMutation.json()).toMatchObject({
    error: { code: 'AUTHORIZATION_DENIED' },
  });

  const publishedV2 = await coordinatorContext.request.post(
    `${definitionsPath}/${definitionV1.id}/versions`,
    {
      headers: coordinatorHeaders,
      data: {
        title: 'P5-004 FEDC v2',
        framework: 'P5-004 deterministic framework',
        description: 'Second published observation definition.',
        targetAges: '6-8',
        defaultFrequency: 'Twice per term',
        body: { items: [{ id: 'engagement-v2', prompt: 'Engagement v2' }] },
      },
    },
  );
  expect(publishedV2.status()).toBe(201);
  const definitionV2 = (await publishedV2.json()).data;
  expect(definitionV2).toMatchObject({
    definitionKey,
    version: 2,
    title: 'P5-004 FEDC v2',
  });
  expect(definitionV2.id).not.toBe(definitionV1.id);

  const listAfterPublish =
    await coordinatorContext.request.get(assignmentsPath);
  expect(listAfterPublish.status()).toBe(200);
  const pinnedAssignment = (await listAfterPublish.json()).data.find(
    (item: { id: string }) => item.id === assignment.id,
  );
  expect(pinnedAssignment.definition).toMatchObject({
    id: definitionV1.id,
    definitionKey,
    version: 1,
    title: 'P5-004 FEDC v1',
  });

  const cancelled = await coordinatorContext.request.post(
    `${assignmentsPath}/${assignment.id}/cancel`,
    {
      headers: coordinatorHeaders,
      data: { reason: 'Observation is no longer required.' },
    },
  );
  expect(cancelled.status()).toBe(200);
  expect(await cancelled.json()).toMatchObject({
    data: {
      id: assignment.id,
      status: 'CANCELLED',
      cancellationReason: 'Observation is no longer required.',
      cancelledAt: expect.any(String),
      definition: { id: definitionV1.id, version: 1 },
    },
  });

  const studentsAfterCancellation = await specialistContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students?schoolDate=2026-08-26`,
  );
  expect(studentsAfterCancellation.status()).toBe(403);
  expect(await studentsAfterCancellation.json()).toMatchObject({
    error: { code: 'AUTHORIZATION_DENIED' },
  });

  await specialistContext.close();
  await coordinatorContext.close();
});

test('P5-005 assigned specialist saves, reloads, and completes a server-scored FEDC observation', async ({
  browser,
}, testInfo) => {
  const coordinatorContext = await browser.newContext();
  await authenticate(coordinatorContext, fixture.coordinatorEmail);
  const coordinatorHeaders = await csrfHeaders(coordinatorContext.request);
  const definitionsPath = `/api/v1/organizations/${fixture.organizationId}/observation-definitions`;
  const assignmentsPath = `/api/v1/organizations/${fixture.organizationId}/observation-assignments`;
  const definitionKey = `p5-005-e2e-${testInfo.retry}-${Date.now()}`;
  const definitionBody = {
    milestones: [
      {
        id: 1,
        title: 'Regulation',
        maxScore: 6,
        items: [
          {
            id: 'fedc-1-1',
            number: '1.1',
            text: 'Maintains regulation.',
            milestoneId: 1,
          },
          {
            id: 'fedc-1-2',
            number: '1.2',
            text: 'Shares attention.',
            milestoneId: 1,
          },
        ],
      },
      {
        id: 2,
        title: 'Engagement',
        maxScore: 3,
        items: [
          {
            id: 'fedc-2-1',
            number: '2.1',
            text: 'Engages reciprocally.',
            milestoneId: 2,
          },
        ],
      },
    ],
  };

  const createdDefinition = await coordinatorContext.request.post(
    definitionsPath,
    {
      headers: coordinatorHeaders,
      data: {
        definitionKey,
        type: 'FEDC',
        title: 'P5-005 Trusted FEDC',
        framework: 'Deterministic E2E scoring fixture',
        body: definitionBody,
      },
    },
  );
  expect(createdDefinition.status()).toBe(201);
  const definition = (await createdDefinition.json()).data;

  const createdAssignment = await coordinatorContext.request.post(
    assignmentsPath,
    {
      headers: coordinatorHeaders,
      data: {
        definitionId: definition.id,
        assignedToMembershipId: fixture.specialistMembershipId,
        studentId: fixture.studentId,
        academicYear: fixture.academicYear,
        dueDate: fixture.dueDate,
        priority: 'HIGH',
        notes: 'P5-005 browser lifecycle fixture.',
      },
    },
  );
  expect(createdAssignment.status()).toBe(201);
  const assignment = (await createdAssignment.json()).data;

  const specialistContext = await browser.newContext();
  await authenticate(specialistContext, fixture.specialistEmail);
  const page = await specialistContext.newPage();
  await openObservationWorkspace(page);
  await page.locator(`#assigned-task-open-fedc-${assignment.id}`).click();
  await expect(page.locator('#fedc-observation-view')).toBeVisible();
  await expect(
    page.getByText('Provisional Preview', { exact: true }),
  ).toBeVisible();

  await page.locator('#fedc-btn-fedc-1-1-S').click();
  await page.locator('#fedc-item-fedc-1-1 input[type="text"]').fill('4 years');
  const draftResponse = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes(
          `/observation-assignments/${assignment.id}/fedc-observation`,
        ) && response.request().method() === 'POST',
  );
  await page.locator('#fedc-save-draft-btn').click();
  expect((await draftResponse).status()).toBe(201);
  await expect(page.getByText('Server Score', { exact: true })).toBeVisible();

  await page.reload();
  await openObservationWorkspace(page);
  await page.locator(`#assigned-task-open-fedc-${assignment.id}`).click();
  await expect(page.locator('#fedc-btn-fedc-1-1-S')).toHaveClass(/text-white/);
  await expect(
    page.locator('#fedc-item-fedc-1-1 input[type="text"]'),
  ).toHaveValue('4 years');

  await page.locator('#fedc-btn-fedc-1-2-K').click();
  await page.locator('#milestone-tab-2').click();
  await page.locator('#fedc-btn-fedc-2-1-H').click();
  const completeResponse = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes(
          `/observation-assignments/${assignment.id}/fedc-observation/complete`,
        ) && response.request().method() === 'POST',
  );
  await page.locator('#fedc-complete-btn').click();
  expect((await completeResponse).status()).toBe(200);
  await expect(
    page.getByText(
      'This observation is completed. Scores and totals shown are server-derived.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText('Server Score', { exact: true })).toBeVisible();

  const history = await specialistContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students/${fixture.studentId}/fedc-observations`,
  );
  expect(history.status()).toBe(200);
  const completed = (await history.json()).data.find(
    (record: { assignmentId: string }) => record.assignmentId === assignment.id,
  );
  expect(completed).toMatchObject({
    status: 'COMPLETED',
    definitionId: definition.id,
    milestoneScores: { '1': 5, '2': 0 },
    totalScore: 5,
    maxPossibleScore: 9,
    definition: { id: definition.id, version: 1, body: definitionBody },
  });

  const reference = await coordinatorContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students/${fixture.studentId}/fedc-observations/reference`,
  );
  expect(reference.status()).toBe(200);
  expect(await reference.json()).toMatchObject({
    data: {
      assignmentId: assignment.id,
      status: 'COMPLETED',
      totalScore: 5,
      maxPossibleScore: 9,
    },
  });

  await specialistContext.close();
  await coordinatorContext.close();
});
