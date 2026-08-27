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

test('P5-006 assigned specialist saves, reloads, and completes a server-scored Sensory Profile', async ({
  browser,
}, testInfo) => {
  const coordinatorContext = await browser.newContext();
  await authenticate(coordinatorContext, fixture.coordinatorEmail);
  const coordinatorHeaders = await csrfHeaders(coordinatorContext.request);
  const definitionsPath = `/api/v1/organizations/${fixture.organizationId}/observation-definitions`;
  const assignmentsPath = `/api/v1/organizations/${fixture.organizationId}/observation-assignments`;
  const definitionKey = `p5-006-e2e-${testInfo.retry}-${Date.now()}`;
  const definitionBody = {
    items: [
      {
        id: 'sensory-auditory-1',
        number: 1,
        section: 'Auditory',
        text: 'Responds to spoken directions in a busy classroom.',
        quadrant: 'SN',
        schoolFactor: 'School Factor 1',
        factorLabel: 'Auditory processing',
      },
      {
        id: 'sensory-visual-1',
        number: 2,
        section: 'Visual',
        text: 'Notices visual information on the board.',
        quadrant: 'RG',
        schoolFactor: 'School Factor 2',
        factorLabel: 'Visual processing',
      },
      {
        id: 'sensory-touch-1',
        number: 3,
        section: 'Touch',
        text: 'Tolerates routine classroom materials.',
        quadrant: 'AV',
        schoolFactor: 'School Factor 3',
        factorLabel: 'Touch processing',
      },
    ],
  };

  const createdDefinition = await coordinatorContext.request.post(
    definitionsPath,
    {
      headers: coordinatorHeaders,
      data: {
        definitionKey,
        type: 'SENSORY_PROFILE',
        title: 'P5-006 Trusted Sensory Profile',
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
        notes: 'P5-006 browser lifecycle fixture.',
      },
    },
  );
  expect(createdAssignment.status()).toBe(201);
  const assignment = (await createdAssignment.json()).data;

  const specialistContext = await browser.newContext();
  await authenticate(specialistContext, fixture.specialistEmail);
  const specialistHeaders = await csrfHeaders(specialistContext.request);
  const observationPath = `/api/v1/organizations/${fixture.organizationId}/observation-assignments/${assignment.id}/sensory-profile-observation`;
  const page = await specialistContext.newPage();
  await openObservationWorkspace(page);
  await page
    .locator(`#assigned-task-open-sensory_profile-${assignment.id}`)
    .click();
  await expect(page.locator('#sensory-profile-view')).toBeVisible();
  await expect(
    page.getByText('Provisional Preview', { exact: true }),
  ).toBeVisible();

  await page.locator('#btn-sensory-sensory-auditory-1-0').click();
  const draftResponse = page.waitForResponse(
    (response) =>
      response.url().includes(observationPath) &&
      response.request().method() === 'POST',
  );
  await page.locator('#sensory-save-draft-btn').click();
  expect((await draftResponse).status()).toBe(201);
  await expect(page.getByText('Server Score', { exact: true })).toBeVisible();

  const incompleteCompletion = await specialistContext.request.post(
    `${observationPath}/complete`,
    {
      headers: specialistHeaders,
      data: {
        observationDate: '2026-08-26',
        teacherContactFrequency: 'Daily',
        teacherContactLength: '30 minutes',
        responses: { 'sensory-auditory-1': 0 },
        notes: 'Boundary zero is a recorded response.',
      },
    },
  );
  expect(incompleteCompletion.status()).toBe(400);
  expect(await incompleteCompletion.json()).toMatchObject({
    error: { code: 'SENSORY_PROFILE_RESPONSES_INCOMPLETE' },
  });

  await page.reload();
  await openObservationWorkspace(page);
  await page
    .locator(`#assigned-task-open-sensory_profile-${assignment.id}`)
    .click();
  await expect(page.locator('#btn-sensory-sensory-auditory-1-0')).toHaveClass(
    /text-white/,
  );
  await page.locator('#sensory-tab-visual').click();
  await page.locator('#btn-sensory-sensory-visual-1-5').click();
  await page.locator('#sensory-tab-touch').click();
  await page.locator('#btn-sensory-sensory-touch-1-3').click();

  const completeResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`${observationPath}/complete`) &&
      response.request().method() === 'POST',
  );
  await page.locator('#sensory-complete-btn').click();
  expect((await completeResponse).status()).toBe(200);
  await expect(
    page.getByText(
      'This observation is completed. Scores and totals shown are server-derived.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText('Server Score', { exact: true })).toBeVisible();

  const history = await specialistContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students/${fixture.studentId}/sensory-profile-observations`,
  );
  expect(history.status()).toBe(200);
  const completed = (await history.json()).data.find(
    (record: { assignmentId: string }) => record.assignmentId === assignment.id,
  );
  expect(completed).toMatchObject({
    status: 'COMPLETED',
    definitionId: definition.id,
    responses: {
      'sensory-auditory-1': 0,
      'sensory-visual-1': 5,
      'sensory-touch-1': 3,
    },
    sectionScores: {
      auditory: { raw: 0, max: 5 },
      visual: { raw: 5, max: 5 },
      touch: { raw: 3, max: 5 },
      movement: { raw: 0, max: 0 },
      behavioral: { raw: 0, max: 0 },
    },
    totalRawScore: 8,
    definition: { id: definition.id, version: 1, body: definitionBody },
  });

  const reference = await coordinatorContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students/${fixture.studentId}/sensory-profile-observations/reference`,
  );
  expect(reference.status()).toBe(200);
  expect(await reference.json()).toMatchObject({
    data: {
      assignmentId: assignment.id,
      status: 'COMPLETED',
      totalRawScore: 8,
    },
  });

  await specialistContext.close();
  await coordinatorContext.close();
});

test('P5-007 assigned specialist saves, reloads, and completes a server-scored SFA', async ({
  browser,
}, testInfo) => {
  const coordinatorContext = await browser.newContext();
  await authenticate(coordinatorContext, fixture.coordinatorEmail);
  const coordinatorHeaders = await csrfHeaders(coordinatorContext.request);
  const definitionsPath = `/api/v1/organizations/${fixture.organizationId}/observation-definitions`;
  const assignmentsPath = `/api/v1/organizations/${fixture.organizationId}/observation-assignments`;
  const definitionKey = `p5-007-e2e-${testInfo.retry}-${Date.now()}`;
  const definitionBody = {
    participationItems: [
      { id: 'classroom', label: 'Classroom participation' },
      { id: 'transitions', label: 'Transition participation' },
    ],
    taskSupportItems: [{ id: 'prompting', label: 'Adult prompting' }],
    activityPerformanceItems: [
      { id: 'travel', label: 'Travel between activities' },
    ],
    adaptationOptions: [],
  };

  const createdDefinition = await coordinatorContext.request.post(
    definitionsPath,
    {
      headers: coordinatorHeaders,
      data: {
        definitionKey,
        type: 'SFA',
        title: 'P5-007 Trusted SFA',
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
        notes: 'P5-007 browser lifecycle fixture.',
      },
    },
  );
  expect(createdAssignment.status()).toBe(201);
  const assignment = (await createdAssignment.json()).data;

  const specialistContext = await browser.newContext();
  await authenticate(specialistContext, fixture.specialistEmail);
  const specialistHeaders = await csrfHeaders(specialistContext.request);
  const observationPath = `/api/v1/organizations/${fixture.organizationId}/observation-assignments/${assignment.id}/sfa-observation`;
  const page = await specialistContext.newPage();
  await openObservationWorkspace(page);
  await page.locator(`#assigned-task-open-sfa-${assignment.id}`).click();
  await expect(page.locator('#sfa-observation-view')).toBeVisible();
  await expect(
    page.getByText('Provisional Preview', { exact: true }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Rate Classroom participation as 2' })
    .click();
  const draftResponse = page.waitForResponse(
    (response) =>
      response.url().includes(observationPath) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save Draft' }).click();
  expect((await draftResponse).status()).toBe(201);
  await expect(
    page.getByText('Server Participation Total', { exact: true }),
  ).toBeVisible();

  await page.reload();
  await openObservationWorkspace(page);
  await page.locator(`#assigned-task-open-sfa-${assignment.id}`).click();
  await expect(
    page.getByRole('button', { name: 'Rate Classroom participation as 2' }),
  ).toHaveClass(/text-white/);
  await expect(
    page.getByText('Average 2.00 / 6', { exact: true }),
  ).toBeVisible();

  const incompleteCompletion = await specialistContext.request.post(
    `${observationPath}/complete`,
    {
      headers: specialistHeaders,
      data: {
        assessmentDate: '2026-08-26',
        programRecommendation: 'Regular',
        respondents: [],
        participationScores: { classroom: 2 },
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
      },
    },
  );
  expect(incompleteCompletion.status()).toBe(400);
  expect(await incompleteCompletion.json()).toMatchObject({
    error: { code: 'SFA_RESPONSES_INCOMPLETE' },
  });

  await page
    .getByRole('button', { name: 'Rate Transition participation as 4' })
    .click();
  await page
    .getByRole('button', { name: 'Task Supports', exact: true })
    .click();
  await page.getByRole('button', { name: 'Rate Adult prompting as 3' }).click();
  await page
    .getByRole('button', { name: 'Activity Performance', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Rate Travel between activities as 4' })
    .click();
  await page.getByRole('button', { name: 'Metadata', exact: true }).click();
  await page.getByRole('button', { name: 'Add respondent' }).click();
  await page.getByLabel('name', { exact: true }).fill('Sam Specialist');
  await page.getByLabel('role', { exact: true }).fill('OT');
  await page.getByLabel('initials', { exact: true }).fill('SS');

  const completeResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`${observationPath}/complete`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Complete SFA Assessment' }).click();
  expect((await completeResponse).status()).toBe(200);
  await expect(
    page.getByText(
      'This SFA is completed and locked. Totals shown are server-derived.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Server Participation Total', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Average 3.00 / 6', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Complete SFA Assessment' }),
  ).toBeDisabled();
  await expect(page.getByLabel('name', { exact: true })).toBeDisabled();

  const history = await specialistContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students/${fixture.studentId}/sfa-observations`,
  );
  expect(history.status()).toBe(200);
  const completed = (await history.json()).data.find(
    (record: { assignmentId: string }) => record.assignmentId === assignment.id,
  );
  expect(completed).toMatchObject({
    status: 'COMPLETED',
    definitionId: definition.id,
    respondents: [{ name: 'Sam Specialist', role: 'OT', initials: 'SS' }],
    participationScores: { classroom: 2, transitions: 4 },
    taskSupports: { prompting: 3 },
    activityPerformance: { travel: 4 },
    totalParticipationRawScore: 6,
    participationAverage: 3,
    definition: { id: definition.id, version: 1, body: definitionBody },
  });

  const reference = await coordinatorContext.request.get(
    `/api/v1/organizations/${fixture.organizationId}/students/${fixture.studentId}/sfa-observations/reference`,
  );
  expect(reference.status()).toBe(200);
  expect(await reference.json()).toMatchObject({
    data: {
      assignmentId: assignment.id,
      status: 'COMPLETED',
      totalParticipationRawScore: 6,
      participationAverage: 3,
      definition: { id: definition.id, version: 1, body: definitionBody },
    },
  });

  await specialistContext.close();
  await coordinatorContext.close();
});
