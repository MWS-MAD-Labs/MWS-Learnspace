import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
} from '@playwright/test';

const fixture = {
  organizationId: '10000000-0000-4000-8000-000000000001',
  studentId: '80000000-0000-4000-8000-000000000004',
  iepId: '74000000-0000-4000-8000-000000000001',
  goalId: '75000000-0000-4000-8000-000000000001',
  authorEmail: 'p5.iep.author@example.test',
  coordinatorEmail: 'p5.observation.coordinator@example.test',
  directorEmail: 'p5.director@example.test',
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

async function csrf(request: APIRequestContext) {
  const state = await request.storageState();
  const token = state.cookies.find(
    (cookie) => cookie.name === 'learnspace_csrf',
  )?.value;
  expect(token).toBeTruthy();
  return { 'x-csrf-token': token as string };
}

const e2eWeekNumber = 1 + Math.floor(Math.random() * 53);

function command(overrides: Record<string, unknown> = {}) {
  return {
    studentId: fixture.studentId,
    iepId: fixture.iepId,
    year: 2026,
    weekNumber: e2eWeekNumber,
    weekStart: '2026-09-14',
    weekEnd: '2026-09-18',
    descriptiveObservation:
      'River independently used the visual transition routine.',
    homeConnection: 'Practice the same break-request phrase at home.',
    goalProgress: [
      {
        goalId: fixture.goalId,
        addressedThisWeek: true,
        rating: 4,
        notes: 'Used the strategy with one visual cue.',
        markedAchievedThisWeek: false,
      },
    ],
    ...overrides,
  };
}

test('P5-010 Compose lifecycle persists creation, edit, submission, reviews, and reload', async ({
  browser,
}) => {
  const teacher = await browser.newContext();
  await authenticate(teacher, fixture.authorEmail);
  const headers = await csrf(teacher.request);
  const base = `/api/v1/organizations/${fixture.organizationId}/weekly-reports`;

  const created = await teacher.request.post(base, {
    headers,
    data: command(),
  });
  expect(created.status()).toBe(201);
  let report = (await created.json()).data;
  expect(report).toMatchObject({
    state: 'DRAFT',
    version: 1,
    teacher: { displayName: 'Avery IEP Author' },
  });

  const edited = await teacher.request.put(`${base}/${report.id}`, {
    headers,
    data: {
      expectedVersion: report.version,
      ...command({
        descriptiveObservation:
          'River independently used the visual transition routine in three classroom changes.',
      }),
    },
  });
  expect(edited.status()).toBe(200);
  report = (await edited.json()).data;
  expect(report).toMatchObject({
    version: 2,
    descriptiveObservation: /three classroom changes/,
  });

  const submitted = await teacher.request.post(`${base}/${report.id}/submit`, {
    headers,
    data: { expectedVersion: report.version },
  });
  expect(submitted.status()).toBe(200);
  report = (await submitted.json()).data;
  expect(report).toMatchObject({ state: 'COORDINATOR_REVIEW', version: 3 });

  const coordinator = await browser.newContext();
  await authenticate(coordinator, fixture.coordinatorEmail);
  const coordinatorDecision = await coordinator.request.post(
    `${base}/${report.id}/coordinator-decision`,
    {
      headers: await csrf(coordinator.request),
      data: { expectedVersion: report.version, decision: 'APPROVE' },
    },
  );
  expect(coordinatorDecision.status()).toBe(200);
  report = (await coordinatorDecision.json()).data;
  expect(report).toMatchObject({ state: 'DIRECTOR_APPROVAL', version: 4 });

  const director = await browser.newContext();
  await authenticate(director, fixture.directorEmail);
  const approved = await director.request.post(
    `${base}/${report.id}/director-decision`,
    {
      headers: await csrf(director.request),
      data: { expectedVersion: report.version, decision: 'APPROVE' },
    },
  );
  expect(approved.status()).toBe(200);

  const page = await teacher.newPage();
  await page.goto('/');
  await page.reload();
  const reloaded = await teacher.request.get(`${base}/${report.id}`);
  expect(reloaded.status()).toBe(200);
  expect((await reloaded.json()).data).toMatchObject({
    state: 'APPROVED',
    version: 5,
    descriptiveObservation: /three classroom changes/,
  });

  await Promise.all([teacher.close(), coordinator.close(), director.close()]);
});
