import {
  learningJourneyDetailResponseSchema,
  learningJourneyMutationResponseSchema,
  learningJourneysResponseSchema,
} from '@learnspace/contracts';
import { describe, expect, it } from 'vitest';
import {
  mapLearningJourney,
  type LearningJourneyRow,
} from '../model/learning-journeys-model.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const academicYearId = '22222222-2222-4222-8222-222222222222';
const semesterId = '33333333-3333-4333-8333-333333333333';
const unitId = '44444444-4444-4444-8444-444444444444';
const gradeId = '55555555-5555-4555-8555-555555555555';
const subjectId = '66666666-6666-4666-8666-666666666666';
const userId = '77777777-7777-4777-8777-777777777777';
const membershipId = '88888888-8888-4888-8888-888888888888';
const journeyId = '99999999-9999-4999-8999-999999999999';
const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function prismaRowWithNestedForeignKeys(): LearningJourneyRow {
  return {
    id: journeyId,
    organizationId,
    title: 'Inquiry Journey',
    state: 'DRAFT',
    version: 1,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-02T10:00:00.000Z'),
    academicYear: {
      id: academicYearId,
      organizationId,
      name: '2026-2027',
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2027-06-30T00:00:00.000Z'),
    },
    semester: {
      id: semesterId,
      organizationId,
      academicYearId,
      name: 'Semester 1',
      position: 1,
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2026-12-31T00:00:00.000Z'),
    },
    unit: { id: unitId, organizationId, code: 'U1', name: 'Elementary' },
    grade: {
      id: gradeId,
      organizationId,
      unitId,
      code: 'G1',
      name: 'Grade 1',
      position: 1,
    },
    subject: {
      id: subjectId,
      organizationId,
      code: 'SCI',
      name: 'Science',
    },
    createdBy: { id: userId, displayName: 'Journey Teacher' },
    updatedBy: { id: userId, displayName: 'Journey Teacher' },
    owners: [
      {
        membership: {
          id: membershipId,
          userId,
          role: 'GRADE_TEACHER',
          roleTitle: null,
          user: { displayName: 'Journey Teacher' },
        },
      },
    ],
    projects: [
      {
        id: projectId,
        title: 'Project One',
        description: 'Explore local habitats.',
        startsOn: new Date('2026-08-03T00:00:00.000Z'),
        endsOn: new Date('2026-08-28T00:00:00.000Z'),
        color: null,
        position: 0,
        goals: [
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            projectId,
            description: 'Describe a habitat.',
            position: 0,
          },
        ],
        connections: [
          {
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            projectId,
            subject: 'English',
            description: 'Write an observation.',
            position: 0,
          },
        ],
      },
    ],
  } as unknown as LearningJourneyRow;
}

function expectNoProjectId(value: unknown) {
  expect(JSON.stringify(value)).not.toContain('projectId');
}

describe('learning journey public response mapping', () => {
  it('maps collection and detail responses to strict contract fields', () => {
    const data = mapLearningJourney(prismaRowWithNestedForeignKeys());

    const collection = learningJourneysResponseSchema.parse({
      data: [data],
      meta: { count: 1 },
    });
    const detail = learningJourneyDetailResponseSchema.parse({ data });

    expect(collection.data[0].projects[0].goals[0]).toEqual({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      description: 'Describe a habitat.',
      position: 0,
    });
    expect(collection.data[0].projects[0].connections[0]).toEqual({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      subject: 'English',
      description: 'Write an observation.',
      position: 0,
    });
    expectNoProjectId(collection);
    expectNoProjectId(detail);
  });

  it.each([
    'create',
    'update',
    'submit',
    'principal review',
    'director review',
  ])(
    'maps and parses the %s mutation response without Prisma foreign keys',
    () => {
      const response = learningJourneyMutationResponseSchema.parse({
        data: mapLearningJourney(prismaRowWithNestedForeignKeys()),
      });

      expectNoProjectId(response);
      expect(response.data.projects[0].goals[0]).not.toHaveProperty(
        'projectId',
      );
      expect(response.data.projects[0].connections[0]).not.toHaveProperty(
        'projectId',
      );
    },
  );
});
