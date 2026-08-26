import { describe, expect, it } from 'vitest';
import {
  fedcDefinitionBodySchema,
  fedcObservationCompleteCommandSchema,
  fedcObservationCreateDraftCommandSchema,
  fedcObservationResponseSchema,
  fedcObservationSaveDraftCommandSchema,
  observationAssignmentCancelCommandSchema,
  observationAssignmentCreateCommandSchema,
  observationAssignmentUpdateCommandSchema,
  observationDefinitionCreateCommandSchema,
  observationDefinitionVersionCreateCommandSchema,
  observationStatusSchema,
} from '@learnspace/contracts';
import { hasPermission } from '../src/authorization.js';

const definitionId = '11111111-1111-4111-8111-111111111111';
const membershipId = '22222222-2222-4222-8222-222222222222';
const studentId = '33333333-3333-4333-8333-333333333333';

const assignment = {
  definitionId,
  assignedToMembershipId: membershipId,
  studentId,
  academicYear: '2026-2027',
  dueDate: '2026-09-01',
  priority: 'HIGH',
  notes: 'Complete before the review meeting.',
};

const definition = {
  definitionKey: 'fedc-development',
  type: 'FEDC',
  title: 'FEDC Development',
  body: { sections: [{ id: 'gross-motor', items: [] }] },
};

const scorableFedcBody = {
  milestones: [
    {
      id: 1,
      title: 'Regulation',
      maxScore: 3,
      items: [
        {
          id: 'fedc-1-1',
          number: '1.1',
          text: 'Maintains regulation.',
          milestoneId: 1,
        },
      ],
    },
  ],
};

describe('observation management contracts and authorization', () => {
  it('grants the narrow management permission only to coordinators', () => {
    expect(hasPermission('SPECIAL_ED_COORDINATOR', 'observation:manage')).toBe(
      true,
    );
    expect(hasPermission('SPECIAL_ED_TEACHER', 'observation:manage')).toBe(
      false,
    );
    expect(hasPermission('SPECIALIST', 'observation:manage')).toBe(false);
    expect(hasPermission('DIRECTOR', 'observation:manage')).toBe(false);
  });

  it('includes CANCELLED in the shared lifecycle statuses', () => {
    expect(observationStatusSchema.options).toEqual([
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]);
  });

  it('accepts definition version commands while rejecting actor and tenant spoofing', () => {
    expect(
      observationDefinitionCreateCommandSchema.safeParse(definition).success,
    ).toBe(true);
    expect(
      observationDefinitionVersionCreateCommandSchema.safeParse({
        title: 'FEDC Development v2',
        body: { sections: [] },
      }).success,
    ).toBe(true);
    for (const forbiddenField of [
      'organizationId',
      'version',
      'publishedAt',
      'actorId',
      'createdById',
    ]) {
      expect(
        observationDefinitionCreateCommandSchema.safeParse({
          ...definition,
          [forbiddenField]: studentId,
        }).success,
      ).toBe(false);
    }
  });

  it('keeps generic definition publication compatible while defining a strict scorable FEDC body', () => {
    expect(
      observationDefinitionCreateCommandSchema.safeParse(definition).success,
    ).toBe(true);
    expect(fedcDefinitionBodySchema.safeParse(definition.body).success).toBe(
      false,
    );
    expect(fedcDefinitionBodySchema.safeParse(scorableFedcBody).success).toBe(
      true,
    );
  });

  it('defines strict FEDC create-draft, draft-save, and completion commands', () => {
    const response = {
      observationDate: '2026-08-26',
      responses: {
        'fedc-1-1': { itemId: 'fedc-1-1', rating: 'S' },
      },
    };
    expect(
      fedcObservationCreateDraftCommandSchema.safeParse({
        observationDate: response.observationDate,
      }).success,
    ).toBe(true);
    expect(
      fedcObservationSaveDraftCommandSchema.safeParse(response).success,
    ).toBe(true);
    expect(
      fedcObservationCompleteCommandSchema.safeParse(response).success,
    ).toBe(true);
    for (const forbiddenField of [
      'status',
      'totalScore',
      'maxPossibleScore',
      'milestoneScores',
      'observerId',
      'actorId',
      'organizationId',
      'studentId',
      'definitionId',
      'assignmentId',
    ]) {
      expect(
        fedcObservationSaveDraftCommandSchema.safeParse({
          ...response,
          [forbiddenField]: forbiddenField.includes('Score') ? 3 : studentId,
        }).success,
      ).toBe(false);
    }
    expect(
      fedcObservationSaveDraftCommandSchema.safeParse({
        ...response,
        responses: {
          'fedc-1-1': {
            itemId: 'fedc-1-1',
            rating: 'S',
            score: 3,
          },
        },
      }).success,
    ).toBe(false);
  });

  it('requires an exact scorable FEDC definition projection in record responses', () => {
    const timestamp = '2026-08-26T12:00:00.000Z';
    const parsed = fedcObservationResponseSchema.parse({
      data: {
        id: definitionId,
        organizationId: membershipId,
        assignmentId: studentId,
        studentId,
        definitionId,
        observerId: membershipId,
        observationDate: '2026-08-26',
        status: 'COMPLETED',
        responses: {
          'fedc-1-1': {
            itemId: 'fedc-1-1',
            rating: 'S',
            score: 3,
          },
        },
        milestoneScores: { '1': 3 },
        totalScore: 3,
        maxPossibleScore: 3,
        notes: null,
        completedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        student: {
          id: studentId,
          organizationId: membershipId,
          studentNumber: 'S-1',
          fullName: 'Student',
          nickname: null,
          avatarUrl: null,
        },
        observer: { id: membershipId, displayName: 'Observer' },
        definition: {
          id: definitionId,
          organizationId: membershipId,
          definitionKey: 'fedc-development',
          version: 1,
          type: 'FEDC',
          title: 'FEDC Development',
          framework: null,
          description: null,
          targetAges: null,
          defaultFrequency: null,
          body: scorableFedcBody,
          isActive: true,
          publishedAt: timestamp,
          createdAt: timestamp,
        },
      },
    });
    expect(parsed.data.definition.version).toBe(1);
    expect(parsed.data.definition.body).toEqual(scorableFedcBody);
  });

  it('defines strict assignment create, update, and cancel commands', () => {
    expect(
      observationAssignmentCreateCommandSchema.safeParse(assignment).success,
    ).toBe(true);
    expect(observationAssignmentUpdateCommandSchema.safeParse({}).success).toBe(
      false,
    );
    expect(
      observationAssignmentUpdateCommandSchema.safeParse({ notes: null })
        .success,
    ).toBe(true);
    expect(
      observationAssignmentCancelCommandSchema.safeParse({
        reason: 'No longer required.',
      }).success,
    ).toBe(true);
    for (const forbiddenField of [
      'organizationId',
      'assignedById',
      'cancelledById',
      'status',
      'actorId',
    ]) {
      expect(
        observationAssignmentCreateCommandSchema.safeParse({
          ...assignment,
          [forbiddenField]: studentId,
        }).success,
      ).toBe(false);
    }
  });
});
