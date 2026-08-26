import * as contracts from '@learnspace/contracts';
import {
  observationAssignmentCancelCommandSchema,
  observationAssignmentCreateCommandSchema,
  observationAssignmentMutationResponseSchema,
  observationAssignmentUpdateCommandSchema,
  observationAssignmentsResponseSchema,
  observationDefinitionCreateCommandSchema,
  observationDefinitionMutationResponseSchema,
  observationDefinitionVersionCreateCommandSchema,
  observationDefinitionsResponseSchema,
} from '@learnspace/contracts';
import { z } from 'zod';
import {
  SEED_OBSERVATION_ASSIGNMENTS,
  SEED_OBSERVATION_FORMS,
} from '../data/seedData';
import type {
  ObservationAssignment,
  ObservationDefinition,
  ObservationFormDefinition,
  FEDCObservationRecord,
  FEDCItemResponse,
  User,
  Student,
} from '../types';
import { apiClient } from './apiClient';

export type ObservationDefinitionCreateCommand = z.infer<
  typeof observationDefinitionCreateCommandSchema
>;
export type ObservationDefinitionVersionCreateCommand = z.infer<
  typeof observationDefinitionVersionCreateCommandSchema
>;
export type ObservationAssignmentCreateCommand = z.infer<
  typeof observationAssignmentCreateCommandSchema
>;
export type ObservationAssignmentUpdateCommand = z.infer<
  typeof observationAssignmentUpdateCommandSchema
>;
export type ObservationAssignmentCancelCommand = z.infer<
  typeof observationAssignmentCancelCommandSchema
>;
export type ObservationDefinitionsResponse = z.infer<
  typeof observationDefinitionsResponseSchema
>;
export type ObservationAssignmentsResponse = z.infer<
  typeof observationAssignmentsResponseSchema
>;
export type ObservationAssignmentMutationResponse = z.infer<
  typeof observationAssignmentMutationResponseSchema
>;

const fallbackFedcResponseSchema = z.object({ data: z.unknown() });
const fallbackFedcObservationsResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({ count: z.number().int().nonnegative() }).optional(),
});
const fallbackFedcCommandSchema = z.object({
  observationDate: z.string(),
  responses: z.record(
    z.string(),
    z.object({
      itemId: z.string(),
      rating: z.enum(['S', 'K', 'T', 'H']),
      masteredAge: z.string().optional(),
    }),
  ),
  notes: z.string().nullable().optional(),
});

type ContractSchemas = typeof contracts & {
  fedcObservationSchema?: z.ZodType<unknown>;
  fedcObservationMutationResponseSchema?: z.ZodType<{ data: unknown }>;
  fedcObservationResponseSchema?: z.ZodType<{ data: unknown }>;
  fedcObservationsResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  fedcObservationHistoryResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  fedcObservationReferenceResponseSchema?: z.ZodType<{ data: unknown }>;
  fedcObservationCreateCommandSchema?: z.ZodType<FEDCObservationCommand>;
  fedcObservationCreateDraftCommandSchema?: z.ZodType<FEDCObservationCommand>;
  fedcObservationDraftCommandSchema?: z.ZodType<FEDCObservationCommand>;
  fedcObservationSaveDraftCommandSchema?: z.ZodType<FEDCObservationCommand>;
  fedcObservationCompleteCommandSchema?: z.ZodType<FEDCObservationCommand>;
};

const fedcContracts = contracts as ContractSchemas;
const fedcObservationMutationResponseSchema =
  fedcContracts.fedcObservationMutationResponseSchema ??
  fedcContracts.fedcObservationResponseSchema ??
  fallbackFedcResponseSchema;
const fedcObservationsResponseSchema =
  fedcContracts.fedcObservationsResponseSchema ??
  fedcContracts.fedcObservationHistoryResponseSchema ??
  fallbackFedcObservationsResponseSchema;
const fedcObservationReferenceResponseSchema =
  fedcContracts.fedcObservationReferenceResponseSchema ??
  fallbackFedcResponseSchema;
const fedcObservationCreateCommandSchema =
  fedcContracts.fedcObservationCreateCommandSchema ??
  fedcContracts.fedcObservationCreateDraftCommandSchema ??
  fallbackFedcCommandSchema;
const fedcObservationDraftCommandSchema =
  fedcContracts.fedcObservationDraftCommandSchema ??
  fedcContracts.fedcObservationSaveDraftCommandSchema ??
  fallbackFedcCommandSchema;
const fedcObservationCompleteCommandSchema =
  fedcContracts.fedcObservationCompleteCommandSchema ??
  fallbackFedcCommandSchema;

export interface FEDCObservationCommand {
  observationDate: string;
  responses: Record<
    string,
    {
      itemId: string;
      rating: 'S' | 'K' | 'T' | 'H';
      masteredAge?: string;
    }
  >;
  notes?: string | null;
}

export interface FEDCObservationReference {
  latestObservation: FEDCObservationRecord | null;
}

type ApiDefinition = ObservationDefinitionsResponse['data'][number];
type ApiAssignment = ObservationAssignmentsResponse['data'][number];

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function dateOnly(value: unknown): string {
  return text(value).slice(0, 10);
}

function nullableText(value: unknown): string | undefined {
  const result = text(value);
  return result || undefined;
}

function mapFedcResponses(value: unknown): Record<string, FEDCItemResponse> {
  const mapped: Record<string, FEDCItemResponse> = {};
  const source = Array.isArray(value) ? value : Object.values(asRecord(value));
  source.forEach((entry) => {
    const response = asRecord(entry);
    const itemId = text(response.itemId);
    if (!itemId) return;
    mapped[itemId] = {
      itemId,
      rating: nullableText(response.rating) as FEDCItemResponse['rating'],
      score: typeof response.score === 'number' ? response.score : undefined,
      masteredAge: nullableText(response.masteredAge),
    };
  });
  return mapped;
}

function mapMilestoneScores(value: unknown): Record<number, number> {
  const mapped: Record<number, number> = {};
  Object.entries(asRecord(value)).forEach(([key, score]) => {
    const milestoneId = Number(key);
    if (Number.isInteger(milestoneId) && typeof score === 'number') {
      mapped[milestoneId] = score;
    }
  });
  return mapped;
}

export function mapFEDCObservation(value: unknown): FEDCObservationRecord {
  const record = asRecord(value);
  const student = asRecord(record.student);
  const definition = asRecord(record.definition);
  const observer = asRecord(record.observer);
  const definitionKey = text(
    definition.key,
    text(definition.definitionKey, text(record.definitionKey)),
  );
  const observationDate = dateOnly(record.observationDate);
  return {
    id: text(record.id),
    organizationId: nullableText(record.organizationId),
    assignmentId: nullableText(record.assignmentId),
    studentId: text(record.studentId, text(student.id)),
    student: text(student.id)
      ? {
          id: text(student.id),
          fullName: text(
            student.fullName,
            text(student.displayName, 'Student'),
          ),
          studentNumber: nullableText(student.studentNumber),
          avatarUrl: nullableText(student.avatarUrl),
        }
      : undefined,
    definition: text(definition.id)
      ? {
          id: text(definition.id),
          key: definitionKey,
          version: numberValue(definition.version, 1),
          title: text(definition.title, 'FEDC Instrument'),
          body: asRecord(definition.body),
        }
      : undefined,
    observationType: 'FEDC',
    recordYear: observationDate.slice(0, 4),
    observationDate,
    observerId: text(
      observer.userId,
      text(observer.id, text(record.observerId)),
    ),
    observerName: text(
      observer.displayName,
      text(record.observerName, 'Staff observer'),
    ),
    observer: text(observer.displayName)
      ? {
          id: nullableText(observer.id),
          userId: nullableText(observer.userId),
          displayName: text(observer.displayName),
        }
      : undefined,
    status: text(record.status, 'DRAFT') as FEDCObservationRecord['status'],
    responses: mapFedcResponses(record.responses),
    milestoneScores: mapMilestoneScores(record.milestoneScores),
    totalScore: numberValue(record.totalScore),
    maxPossibleScore: numberValue(record.maxPossibleScore),
    notes: nullableText(record.notes),
    completedAt: nullableText(record.completedAt) ?? null,
    createdAt: text(record.createdAt),
    updatedAt: text(record.updatedAt),
  };
}

export function mapFEDCObservationReference(
  value: unknown,
): FEDCObservationReference {
  if (!value) return { latestObservation: null };
  const payload = asRecord(value);
  const latest =
    payload.latestObservation ??
    payload.observation ??
    payload.latestFedcObservation ??
    value;
  return { latestObservation: mapFEDCObservation(latest) };
}

export function mapObservationDefinition(
  definition: ApiDefinition,
): ObservationDefinition {
  const record = asRecord(definition);
  const body = asRecord(record.body);
  return {
    id: text(record.id),
    definitionKey: text(record.definitionKey, text(record.id)),
    type: text(record.type, 'FEDC') as ObservationDefinition['type'],
    title: text(record.title, 'Untitled observation instrument'),
    framework: text(record.framework),
    description: text(record.description),
    targetAges: text(record.targetAges),
    defaultFrequency: text(record.defaultFrequency),
    version: numberValue(record.version, 1),
    itemCount: numberValue(body.itemCount, numberValue(record.itemCount)),
    sectionsCount: numberValue(
      body.sectionsCount,
      numberValue(record.sectionsCount),
    ),
    maxScore: numberValue(body.maxScore, numberValue(record.maxScore)),
    lastUpdated: dateOnly(record.publishedAt ?? record.updatedAt),
    updatedBy: text(
      asRecord(record.updatedBy).displayName,
      text(record.updatedByName),
    ),
    isActive: booleanValue(record.isActive, true),
    body,
  };
}

export function mapObservationAssignment(
  assignment: ApiAssignment,
): ObservationAssignment {
  const record = asRecord(assignment);
  const definition = asRecord(record.definition);
  const student = asRecord(record.student);
  const assignee = asRecord(record.assignedTo ?? record.assignee);
  const assignedBy = asRecord(record.assignedBy);
  return {
    id: text(record.id),
    studentId: text(record.studentId, text(student.id)),
    studentName: text(
      student.fullName,
      text(student.displayName, text(record.studentName, 'Student')),
    ),
    studentGrade: text(record.studentGrade) || undefined,
    definitionId: text(record.definitionId, text(definition.id)),
    definitionVersion: numberValue(
      record.definitionVersion,
      numberValue(definition.version, 1),
    ),
    instrumentType: text(
      definition.type,
      text(record.instrumentType, 'FEDC'),
    ) as ObservationAssignment['instrumentType'],
    instrumentTitle:
      text(definition.title, text(record.instrumentTitle)) || undefined,
    definitionBody: asRecord(definition.body),
    academicYear: text(record.academicYear),
    assignedToUserId: text(assignee.userId, text(record.assignedToUserId)),
    assignedToMembershipId:
      text(
        assignee.membershipId,
        text(record.assigneeMembershipId, text(record.assignedToId)),
      ) || undefined,
    assignedToUserName: text(
      assignee.displayName,
      text(record.assignedToUserName, 'Staff member'),
    ),
    assignedToRole:
      text(assignee.roleTitle, text(record.assignedToRole)) || undefined,
    assignedToUserRole:
      text(assignee.roleTitle, text(record.assignedToUserRole)) || undefined,
    assignedByUserId:
      text(assignedBy.userId, text(record.assignedByUserId)) || undefined,
    assignedByUserName:
      text(assignedBy.displayName, text(record.assignedByUserName)) ||
      undefined,
    assignedDate: dateOnly(record.assignedAt ?? record.assignedDate),
    dueDate: dateOnly(record.dueDate),
    status: text(record.status, 'PENDING') as ObservationAssignment['status'],
    priority: text(record.priority) || undefined,
    notes: text(record.notes) || undefined,
    createdAt: text(record.createdAt) || undefined,
    completedAt: text(record.completedAt) || undefined,
    cancelledAt: text(record.cancelledAt) || undefined,
    recordId: text(record.recordId) || undefined,
  };
}

export function definitionCreateCommand(
  definition: ObservationDefinition,
): ObservationDefinitionCreateCommand {
  return observationDefinitionCreateCommandSchema.parse({
    definitionKey: definition.definitionKey,
    type: definition.type,
    title: definition.title,
    framework: definition.framework || null,
    description: definition.description || null,
    targetAges: definition.targetAges || null,
    defaultFrequency: definition.defaultFrequency || null,
    body: {
      ...definition.body,
      itemCount: definition.itemCount,
      sectionsCount: definition.sectionsCount,
      maxScore: definition.maxScore,
    },
    isActive: definition.isActive,
  });
}

export function definitionVersionCommand(
  definition: ObservationDefinition,
): ObservationDefinitionVersionCreateCommand {
  return observationDefinitionVersionCreateCommandSchema.parse({
    title: definition.title,
    framework: definition.framework || null,
    description: definition.description || null,
    targetAges: definition.targetAges || null,
    defaultFrequency: definition.defaultFrequency || null,
    body: {
      ...definition.body,
      itemCount: definition.itemCount,
      sectionsCount: definition.sectionsCount,
      maxScore: definition.maxScore,
    },
    isActive: definition.isActive,
  });
}

export const observationService = {
  getDefinitions(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<ObservationDefinitionsResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-definitions`,
      { schema: observationDefinitionsResponseSchema, signal },
    );
  },

  createDefinition(
    organizationId: string,
    command: ObservationDefinitionCreateCommand,
    signal?: AbortSignal,
  ) {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-definitions`,
      {
        method: 'POST',
        body: observationDefinitionCreateCommandSchema.parse(command),
        schema: observationDefinitionMutationResponseSchema,
        signal,
      },
    );
  },

  createDefinitionVersion(
    organizationId: string,
    definitionId: string,
    command: ObservationDefinitionVersionCreateCommand,
    signal?: AbortSignal,
  ) {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-definitions/${encodeURIComponent(definitionId)}/versions`,
      {
        method: 'POST',
        body: observationDefinitionVersionCreateCommandSchema.parse(command),
        schema: observationDefinitionMutationResponseSchema,
        signal,
      },
    );
  },

  getAssignments(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<ObservationAssignmentsResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments`,
      { schema: observationAssignmentsResponseSchema, signal },
    );
  },

  createAssignment(
    organizationId: string,
    command: ObservationAssignmentCreateCommand,
    signal?: AbortSignal,
  ): Promise<ObservationAssignmentMutationResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments`,
      {
        method: 'POST',
        body: observationAssignmentCreateCommandSchema.parse(command),
        schema: observationAssignmentMutationResponseSchema,
        signal,
      },
    );
  },

  updateAssignment(
    organizationId: string,
    assignmentId: string,
    command: ObservationAssignmentUpdateCommand,
    signal?: AbortSignal,
  ): Promise<ObservationAssignmentMutationResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}`,
      {
        method: 'PATCH',
        body: observationAssignmentUpdateCommandSchema.parse(command),
        schema: observationAssignmentMutationResponseSchema,
        signal,
      },
    );
  },

  deleteAssignment(
    organizationId: string,
    assignmentId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}`,
      { method: 'DELETE', signal },
    );
  },

  cancelAssignment(
    organizationId: string,
    assignmentId: string,
    command: ObservationAssignmentCancelCommand,
    signal?: AbortSignal,
  ): Promise<ObservationAssignmentMutationResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/cancel`,
      {
        method: 'POST',
        body: observationAssignmentCancelCommandSchema.parse(command),
        schema: observationAssignmentMutationResponseSchema,
        signal,
      },
    );
  },

  async createFEDCObservation(
    organizationId: string,
    assignmentId: string,
    command: FEDCObservationCommand,
    signal?: AbortSignal,
  ): Promise<FEDCObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/fedc-observation`,
      {
        method: 'POST',
        body: fedcObservationCreateCommandSchema.parse(command),
        schema: fedcObservationMutationResponseSchema,
        signal,
      },
    );
    return mapFEDCObservation(response.data);
  },

  async saveFEDCObservationDraft(
    organizationId: string,
    assignmentId: string,
    command: FEDCObservationCommand,
    signal?: AbortSignal,
  ): Promise<FEDCObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/fedc-observation`,
      {
        method: 'PUT',
        body: fedcObservationDraftCommandSchema.parse(command),
        schema: fedcObservationMutationResponseSchema,
        signal,
      },
    );
    return mapFEDCObservation(response.data);
  },

  async completeFEDCObservation(
    organizationId: string,
    assignmentId: string,
    command: FEDCObservationCommand,
    signal?: AbortSignal,
  ): Promise<FEDCObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/fedc-observation/complete`,
      {
        method: 'POST',
        body: fedcObservationCompleteCommandSchema.parse(command),
        schema: fedcObservationMutationResponseSchema,
        signal,
      },
    );
    return mapFEDCObservation(response.data);
  },

  async getFEDCObservation(
    organizationId: string,
    assignmentId: string,
    signal?: AbortSignal,
  ): Promise<FEDCObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/fedc-observation`,
      { schema: fedcObservationMutationResponseSchema, signal },
    );
    return mapFEDCObservation(response.data);
  },

  async getStudentFEDCObservations(
    organizationId: string,
    studentId: string,
    signal?: AbortSignal,
  ): Promise<FEDCObservationRecord[]> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/students/${encodeURIComponent(studentId)}/fedc-observations`,
      { schema: fedcObservationsResponseSchema, signal },
    );
    return response.data.map(mapFEDCObservation);
  },

  async getStudentFEDCReference(
    organizationId: string,
    studentId: string,
    signal?: AbortSignal,
  ): Promise<FEDCObservationReference> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/students/${encodeURIComponent(studentId)}/fedc-observations/reference`,
      { schema: fedcObservationReferenceResponseSchema, signal },
    );
    return mapFEDCObservationReference(response.data);
  },
};

function demoDefinition(
  form: ObservationFormDefinition,
): ObservationDefinition {
  const version = Number.parseInt(form.version, 10) || 1;
  return {
    id: form.id,
    definitionKey: form.id,
    type: form.type,
    title: form.title,
    framework: form.framework,
    description: form.description,
    targetAges: form.targetAges,
    defaultFrequency: form.defaultFrequency,
    version,
    itemCount: form.itemCount,
    sectionsCount: 0,
    maxScore: 0,
    lastUpdated: form.lastUpdated,
    updatedBy: form.updatedBy,
    isActive: form.isActive,
    body: { itemCount: form.itemCount },
  };
}

let demoDefinitions = SEED_OBSERVATION_FORMS.map(demoDefinition);
let demoAssignments = SEED_OBSERVATION_ASSIGNMENTS.map((assignment) => ({
  ...assignment,
  definitionId:
    assignment.definitionId ||
    demoDefinitions.find(
      (definition) => definition.type === assignment.instrumentType,
    )?.id ||
    '',
  definitionVersion:
    assignment.definitionVersion ||
    demoDefinitions.find(
      (definition) => definition.type === assignment.instrumentType,
    )?.version ||
    1,
}));

export const demoObservationRepository = {
  getDefinitions(): ObservationDefinition[] {
    return demoDefinitions.map((definition) => ({ ...definition }));
  },
  getAssignments(): ObservationAssignment[] {
    return demoAssignments.map((assignment) => ({ ...assignment }));
  },
  saveDefinition(definition: ObservationDefinition, user: User): void {
    if (definition.isNew) {
      demoDefinitions = [
        {
          ...definition,
          id: `demo-definition-${Date.now()}`,
          definitionKey: definition.definitionKey || `custom-${Date.now()}`,
          version: 1,
          isNew: false,
          updatedBy: user.name,
          lastUpdated: new Date().toISOString().slice(0, 10),
        },
        ...demoDefinitions,
      ];
      return;
    }
    demoDefinitions = demoDefinitions.map((current) =>
      current.id === definition.id
        ? {
            ...definition,
            version: current.version + 1,
            updatedBy: user.name,
            lastUpdated: new Date().toISOString().slice(0, 10),
          }
        : current,
    );
  },
  createAssignment(input: {
    student: Student;
    assignee: User;
    definition: ObservationDefinition;
    academicYear: string;
    dueDate: string;
    priority: string;
    notes: string;
    coordinator: User;
  }): void {
    demoAssignments = [
      {
        id: `demo-assignment-${Date.now()}`,
        studentId: input.student.id,
        studentName: input.student.name ?? input.student.fullName,
        studentGrade: input.student.grade,
        definitionId: input.definition.id,
        definitionVersion: input.definition.version,
        instrumentType: input.definition.type,
        instrumentTitle: input.definition.title,
        academicYear: input.academicYear,
        assignedToUserId: input.assignee.id,
        assignedToMembershipId: input.assignee.membershipId,
        assignedToUserName: input.assignee.name,
        assignedToUserRole: input.assignee.roleTitle,
        assignedByCoordinatorId: input.coordinator.id,
        assignedByCoordinatorName: input.coordinator.name,
        assignedDate: new Date().toISOString().slice(0, 10),
        dueDate: input.dueDate,
        status: 'PENDING',
        priority: input.priority,
        notes: input.notes,
        createdAt: new Date().toISOString(),
      },
      ...demoAssignments,
    ];
  },
  deleteAssignment(assignmentId: string): void {
    demoAssignments = demoAssignments.filter(
      (assignment) => assignment.id !== assignmentId,
    );
  },
  cancelAssignment(assignmentId: string): void {
    demoAssignments = demoAssignments.map((assignment) =>
      assignment.id === assignmentId
        ? {
            ...assignment,
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
          }
        : assignment,
    );
  },
};
