import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
} from '@playwright/test';

const fixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  teacherEmail: 'attendance.teacher@example.test',
  membershipId: '30000000-0000-4000-8000-000000000001',
  academicYearId: '70000000-0000-4000-8000-000000000001',
  semesterId: '71000000-0000-4000-8000-000000000001',
  unitId: '40000000-0000-4000-8000-000000000001',
  gradeId: '50000000-0000-4000-8000-000000000001',
  forbiddenJourneyId: '73000000-0000-4000-8000-000000000002',
  subjectId: '72000000-0000-4000-8000-000000000001',
  authSecret: 'attendance-e2e-auth-secret-at-least-32-characters',
};

async function authenticate(context: BrowserContext) {
  const response = await context.request.post('/api/v1/test-auth/session', {
    headers: {
      'x-learnspace-e2e-secret': fixture.authSecret,
      'x-learnspace-e2e-user-email': fixture.teacherEmail,
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

function command(title: string) {
  return {
    title,
    academicYearId: fixture.academicYearId,
    semesterId: fixture.semesterId,
    unitId: fixture.unitId,
    gradeId: fixture.gradeId,
    subjectId: fixture.subjectId,
    ownerMembershipIds: [fixture.membershipId],
    projects: [
      {
        title: 'Nested Inquiry Project',
        description: 'Persist a nested project through the API.',
        startsOn: '2026-10-01',
        endsOn: '2026-10-31',
        color: '#81B29A',
        position: 0,
        goals: [{ description: 'Persist a nested goal.', position: 0 }],
        connections: [
          {
            subject: 'General Studies',
            description: 'Connect inquiry across the curriculum.',
            position: 0,
          },
        ],
      },
    ],
  };
}

test('P5-002 journey reads and draft edits are scoped, persistent, and versioned', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await authenticate(context);
  const headers = await csrfHeaders(context.request);
  const base = `/api/v1/organizations/${fixture.organizationId}/learning-journeys`;

  const scopedList = await context.request.get(base);
  expect(scopedList.status()).toBe(200);
  const scopedPayload = await scopedList.json();
  expect(scopedPayload.data).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: 'Existing E2E Inquiry Draft' }),
    ]),
  );
  expect(scopedPayload.data).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: 'Forbidden Grade 2 Draft' }),
    ]),
  );

  const title = `P5-002 Created ${Date.now()}`;
  const created = await context.request.post(base, {
    headers,
    data: command(title),
  });
  expect(created.status()).toBe(201);
  const createdPayload = await created.json();
  const journeyId = createdPayload.data.id as string;
  expect(createdPayload).toMatchObject({
    data: {
      title,
      version: 1,
      projects: [
        {
          title: 'Nested Inquiry Project',
          goals: [{ description: 'Persist a nested goal.' }],
        },
      ],
    },
  });

  const persisted = await context.request.get(`${base}/${journeyId}`);
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toMatchObject({ data: { title, version: 1 } });

  const updated = await context.request.put(`${base}/${journeyId}`, {
    headers,
    data: { ...command(`${title} Updated`), expectedVersion: 1 },
  });
  expect(updated.status()).toBe(200);
  expect(await updated.json()).toMatchObject({
    data: { title: `${title} Updated`, version: 2 },
  });

  const stale = await context.request.put(`${base}/${journeyId}`, {
    headers,
    data: { ...command('Stale update'), expectedVersion: 1 },
  });
  expect(stale.status()).toBe(409);
  expect(await stale.json()).toMatchObject({
    error: { code: 'LEARNING_JOURNEY_VERSION_CONFLICT' },
  });

  const crossScope = await context.request.get(
    `${base}/${fixture.forbiddenJourneyId}`,
  );
  expect(crossScope.status()).toBe(403);
  expect(await crossScope.json()).toMatchObject({
    error: { code: 'AUTHORIZATION_DENIED' },
  });

  const spoofedState = await context.request.put(`${base}/${journeyId}`, {
    headers,
    data: {
      ...command('Workflow spoof'),
      expectedVersion: 2,
      state: 'APPROVED',
    },
  });
  expect(spoofedState.status()).toBe(400);
  expect(await spoofedState.json()).toMatchObject({
    error: { code: 'VALIDATION_ERROR' },
  });

  await context.close();
});
