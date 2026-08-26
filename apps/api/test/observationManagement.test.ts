import { describe, expect, it } from 'vitest';
import {
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
