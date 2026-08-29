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

import type {
  ObservationAssignment,
  ObservationDefinition,
  FEDCObservationRecord,
  FEDCItemResponse,
  SensoryProfileRecord,
  SensoryRating,
  SFAObservationRecord,
  SFARespondent,
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
const fallbackSensoryResponseSchema = z.object({ data: z.unknown() });
const fallbackSensoryObservationsResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({ count: z.number().int().nonnegative() }).optional(),
});
const fallbackSensoryCommandSchema = z
  .object({
    observationDate: z.string(),
    responses: z.record(z.string(), z.number().int().min(0).max(5)),
    teacherContactFrequency: z.string().nullable().optional(),
    teacherContactLength: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();
const fallbackSfaResponseSchema = z.object({ data: z.unknown() });
const fallbackSfaObservationsResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({ count: z.number().int().nonnegative() }).optional(),
});
const fallbackSfaCommandSchema = z
  .object({
    assessmentDate: z.string(),
    observationDate: z.string().optional(),
    programRecommendation: z.string().optional(),
    respondents: z.array(
      z
        .object({
          name: z.string().min(1),
          role: z.string().min(1),
          initials: z.string().min(1).max(8),
        })
        .strict(),
    ),
    primaryLanguage: z.string().optional(),
    writingMethod: z.string().optional(),
    mobilityMethod: z.string().optional(),
    conditionsAffectingPerformance: z.string().optional(),
    participationScores: z.record(z.string(), z.number().min(1).max(6)),
    taskSupports: z.record(z.string(), z.number().min(1).max(4)),
    activityPerformance: z.record(z.string(), z.number().min(1).max(4)),
    adaptations: z.array(z.string().min(1)),
    notes: z.string().nullable().optional(),
  })
  .strict();

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
  sensoryProfileObservationMutationResponseSchema?: z.ZodType<{
    data: unknown;
  }>;
  sensoryProfileObservationResponseSchema?: z.ZodType<{ data: unknown }>;
  sensoryObservationMutationResponseSchema?: z.ZodType<{ data: unknown }>;
  sensoryObservationResponseSchema?: z.ZodType<{ data: unknown }>;
  sensoryProfileObservationsResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  sensoryProfileObservationHistoryResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  sensoryObservationsResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  sensoryObservationHistoryResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  sensoryProfileObservationReferenceResponseSchema?: z.ZodType<{
    data: unknown;
  }>;
  sensoryObservationReferenceResponseSchema?: z.ZodType<{ data: unknown }>;
  sensoryProfileObservationCreateCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryProfileObservationCreateDraftCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryObservationCreateCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryObservationCreateDraftCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryProfileObservationDraftCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryProfileObservationSaveDraftCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryObservationDraftCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryObservationSaveDraftCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryProfileObservationCompleteCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sensoryObservationCompleteCommandSchema?: z.ZodType<SensoryObservationCommand>;
  sfaObservationMutationResponseSchema?: z.ZodType<{ data: unknown }>;
  sfaObservationResponseSchema?: z.ZodType<{ data: unknown }>;
  sfaObservationsResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  sfaObservationHistoryResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  sfaObservationReferenceResponseSchema?: z.ZodType<{ data: unknown }>;
  sfaObservationCreateCommandSchema?: z.ZodType<SFAObservationCommand>;
  sfaObservationCreateDraftCommandSchema?: z.ZodType<SFAObservationCommand>;
  sfaObservationDraftCommandSchema?: z.ZodType<SFAObservationCommand>;
  sfaObservationSaveDraftCommandSchema?: z.ZodType<SFAObservationCommand>;
  sfaObservationCompleteCommandSchema?: z.ZodType<SFAObservationCommand>;
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
const sensoryObservationMutationResponseSchema =
  fedcContracts.sensoryProfileObservationMutationResponseSchema ??
  fedcContracts.sensoryProfileObservationResponseSchema ??
  fedcContracts.sensoryObservationMutationResponseSchema ??
  fedcContracts.sensoryObservationResponseSchema ??
  fallbackSensoryResponseSchema;
const sensoryObservationsResponseSchema =
  fedcContracts.sensoryProfileObservationsResponseSchema ??
  fedcContracts.sensoryProfileObservationHistoryResponseSchema ??
  fedcContracts.sensoryObservationsResponseSchema ??
  fedcContracts.sensoryObservationHistoryResponseSchema ??
  fallbackSensoryObservationsResponseSchema;
const sensoryObservationReferenceResponseSchema =
  fedcContracts.sensoryProfileObservationReferenceResponseSchema ??
  fedcContracts.sensoryObservationReferenceResponseSchema ??
  fallbackSensoryResponseSchema;
const sensoryObservationCreateCommandSchema =
  fedcContracts.sensoryProfileObservationCreateCommandSchema ??
  fedcContracts.sensoryProfileObservationCreateDraftCommandSchema ??
  fedcContracts.sensoryObservationCreateCommandSchema ??
  fedcContracts.sensoryObservationCreateDraftCommandSchema ??
  fallbackSensoryCommandSchema;
const sensoryObservationDraftCommandSchema =
  fedcContracts.sensoryProfileObservationDraftCommandSchema ??
  fedcContracts.sensoryProfileObservationSaveDraftCommandSchema ??
  fedcContracts.sensoryObservationDraftCommandSchema ??
  fedcContracts.sensoryObservationSaveDraftCommandSchema ??
  fallbackSensoryCommandSchema;
const sensoryObservationCompleteCommandSchema =
  fedcContracts.sensoryProfileObservationCompleteCommandSchema ??
  fedcContracts.sensoryObservationCompleteCommandSchema ??
  fallbackSensoryCommandSchema;
const sfaObservationMutationResponseSchema =
  fedcContracts.sfaObservationMutationResponseSchema ??
  fedcContracts.sfaObservationResponseSchema ??
  fallbackSfaResponseSchema;
const sfaObservationsResponseSchema =
  fedcContracts.sfaObservationsResponseSchema ??
  fedcContracts.sfaObservationHistoryResponseSchema ??
  fallbackSfaObservationsResponseSchema;
const sfaObservationReferenceResponseSchema =
  fedcContracts.sfaObservationReferenceResponseSchema ??
  fallbackSfaResponseSchema;
const sfaObservationCreateCommandSchema =
  fedcContracts.sfaObservationCreateCommandSchema ??
  fedcContracts.sfaObservationCreateDraftCommandSchema ??
  fallbackSfaCommandSchema;
const sfaObservationDraftCommandSchema =
  fedcContracts.sfaObservationDraftCommandSchema ??
  fedcContracts.sfaObservationSaveDraftCommandSchema ??
  fallbackSfaCommandSchema;
const sfaObservationCompleteCommandSchema =
  fedcContracts.sfaObservationCompleteCommandSchema ?? fallbackSfaCommandSchema;

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

export interface SensoryObservationCommand {
  observationDate: string;
  responses: Record<string, SensoryRating>;
  teacherContactFrequency?: string | null;
  teacherContactLength?: string | null;
  notes?: string | null;
}

export interface SensoryObservationReference {
  latestObservation: SensoryProfileRecord | null;
}

export interface SFAObservationCommand {
  assessmentDate: string;
  observationDate?: string;
  programRecommendation?: string;
  respondents: Array<Pick<SFARespondent, 'name' | 'role' | 'initials'>>;
  primaryLanguage?: string;
  writingMethod?: string;
  mobilityMethod?: string;
  conditionsAffectingPerformance?: string;
  participationScores: Record<string, number>;
  taskSupports: Record<string, number>;
  activityPerformance: Record<string, number>;
  adaptations: string[];
  notes?: string | null;
}

export interface SFAObservationReference {
  latestObservation: SFAObservationRecord | null;
}

function sfaObservationCommandPayload(
  command: SFAObservationCommand,
): SFAObservationCommand {
  return {
    assessmentDate: command.assessmentDate,
    ...(command.observationDate === undefined
      ? {}
      : { observationDate: command.observationDate }),
    ...(command.programRecommendation === undefined
      ? {}
      : { programRecommendation: command.programRecommendation }),
    respondents: command.respondents.map(({ name, role, initials }) => ({
      name,
      role,
      initials,
    })),
    ...(command.primaryLanguage === undefined
      ? {}
      : { primaryLanguage: command.primaryLanguage }),
    ...(command.writingMethod === undefined
      ? {}
      : { writingMethod: command.writingMethod }),
    ...(command.mobilityMethod === undefined
      ? {}
      : { mobilityMethod: command.mobilityMethod }),
    ...(command.conditionsAffectingPerformance === undefined
      ? {}
      : {
          conditionsAffectingPerformance:
            command.conditionsAffectingPerformance,
        }),
    participationScores: command.participationScores,
    taskSupports: command.taskSupports,
    activityPerformance: command.activityPerformance,
    adaptations: command.adaptations,
    ...(command.notes === undefined ? {} : { notes: command.notes }),
  };
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

function mapSensoryResponses(value: unknown): Record<string, SensoryRating> {
  const mapped: Record<string, SensoryRating> = {};
  Object.entries(asRecord(value)).forEach(([itemId, response]) => {
    const rating =
      typeof response === 'number' ? response : asRecord(response).rating;
    if (
      typeof rating === 'number' &&
      Number.isInteger(rating) &&
      rating >= 0 &&
      rating <= 5
    ) {
      mapped[itemId] = rating as SensoryRating;
    }
  });
  return mapped;
}

function mapSensorySectionScores(
  value: unknown,
): Record<string, { raw: number; max: number }> {
  const mapped: Record<string, { raw: number; max: number }> = {};
  Object.entries(asRecord(value)).forEach(([sectionId, scoreValue]) => {
    const score = asRecord(scoreValue);
    mapped[sectionId] = {
      raw: numberValue(score.raw),
      max: numberValue(score.max),
    };
  });
  return mapped;
}

function mapNumberRecord(value: unknown): Record<string, number> {
  const mapped: Record<string, number> = {};
  Object.entries(asRecord(value)).forEach(([key, score]) => {
    if (typeof score === 'number' && Number.isFinite(score))
      mapped[key] = score;
  });
  return mapped;
}

function mapSfaRespondents(value: unknown): SFARespondent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const respondent = asRecord(entry);
    const name = text(respondent.name);
    const role = text(respondent.role);
    const initials = text(respondent.initials);
    if (!name || !role || !initials) return [];
    return [{ id: nullableText(respondent.id), name, role, initials }];
  });
}

function mapSfaSettings(
  value: unknown,
): Record<string, { rating: number; notes?: string }> {
  const mapped: Record<string, { rating: number; notes?: string }> = {};
  Object.entries(asRecord(value)).forEach(([settingId, settingValue]) => {
    const setting = asRecord(settingValue);
    if (typeof setting.rating !== 'number') return;
    mapped[settingId] = {
      rating: setting.rating,
      notes: nullableText(setting.notes),
    };
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

export function mapSensoryObservation(value: unknown): SensoryProfileRecord {
  const record = asRecord(value);
  const student = asRecord(record.student);
  const definition = asRecord(record.definition);
  const observer = asRecord(record.observer);
  const observationDate = dateOnly(record.observationDate);
  const definitionKey = text(
    definition.key,
    text(definition.definitionKey, text(record.definitionKey)),
  );
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
          title: text(definition.title, 'Sensory Profile Instrument'),
          body: asRecord(definition.body),
        }
      : undefined,
    observationType: 'SENSORY_PROFILE',
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
    teacherContactFrequency: text(record.teacherContactFrequency),
    teacherContactLength: text(record.teacherContactLength),
    status: text(record.status, 'DRAFT') as SensoryProfileRecord['status'],
    responses: mapSensoryResponses(record.responses),
    sectionScores: mapSensorySectionScores(record.sectionScores),
    totalRawScore: numberValue(record.totalRawScore),
    maxPossibleScore:
      typeof record.maxPossibleScore === 'number'
        ? record.maxPossibleScore
        : undefined,
    notes: nullableText(record.notes),
    completedAt: nullableText(record.completedAt) ?? null,
    createdAt: text(record.createdAt),
    updatedAt: text(record.updatedAt),
  };
}

export function mapSensoryObservationReference(
  value: unknown,
): SensoryObservationReference {
  if (!value) return { latestObservation: null };
  const payload = asRecord(value);
  const latest =
    payload.latestObservation ??
    payload.observation ??
    payload.latestSensoryObservation ??
    payload.latestSensoryProfileObservation ??
    value;
  return { latestObservation: mapSensoryObservation(latest) };
}

export function mapSFAObservation(value: unknown): SFAObservationRecord {
  const record = asRecord(value);
  const student = asRecord(record.student);
  const definition = asRecord(record.definition);
  const observer = asRecord(record.observer);
  const assessmentDate = dateOnly(record.assessmentDate);
  const definitionKey = text(
    definition.key,
    text(definition.definitionKey, text(record.definitionKey)),
  );
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
          title: text(definition.title, 'School Function Assessment'),
          body: asRecord(definition.body),
        }
      : undefined,
    observationType: 'SFA',
    recordYear: assessmentDate.slice(0, 4),
    assessmentDate,
    observationDate: dateOnly(record.observationDate) || undefined,
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
    coordinatorName: text(record.coordinatorName),
    status: text(
      record.status,
      'IN_PROGRESS',
    ) as SFAObservationRecord['status'],
    programRecommendation: text(record.programRecommendation),
    respondents: mapSfaRespondents(record.respondents),
    primaryLanguage: text(record.primaryLanguage),
    writingMethod: text(record.writingMethod),
    mobilityMethod: text(record.mobilityMethod),
    conditionsAffectingPerformance: text(record.conditionsAffectingPerformance),
    participationScores: mapNumberRecord(record.participationScores),
    totalParticipationRawScore:
      typeof record.totalParticipationRawScore === 'number'
        ? record.totalParticipationRawScore
        : undefined,
    settings: mapSfaSettings(record.settings),
    participationNotes: nullableText(record.participationNotes),
    participationAverage: numberValue(record.participationAverage),
    taskSupports: mapNumberRecord(record.taskSupports),
    taskSupportNotes: nullableText(record.taskSupportNotes),
    activityPerformance: mapNumberRecord(record.activityPerformance),
    adaptations: Array.isArray(record.adaptations)
      ? record.adaptations.filter(
          (adaptation): adaptation is string => typeof adaptation === 'string',
        )
      : [],
    adaptationsNotes: nullableText(record.adaptationsNotes),
    notes: nullableText(record.notes),
    completedAt: nullableText(record.completedAt) ?? null,
    createdAt: text(record.createdAt),
    updatedAt: text(record.updatedAt),
  };
}

export function mapSFAObservationReference(
  value: unknown,
): SFAObservationReference {
  if (!value) return { latestObservation: null };
  const payload = asRecord(value);
  const latest =
    payload.latestObservation ??
    payload.observation ??
    payload.latestSfaObservation ??
    payload.latestSFAObservation ??
    value;
  return { latestObservation: mapSFAObservation(latest) };
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

  async createSensoryObservation(
    organizationId: string,
    assignmentId: string,
    command: SensoryObservationCommand,
    signal?: AbortSignal,
  ): Promise<SensoryProfileRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sensory-profile-observation`,
      {
        method: 'POST',
        body: sensoryObservationCreateCommandSchema.parse(command),
        schema: sensoryObservationMutationResponseSchema,
        signal,
      },
    );
    return mapSensoryObservation(response.data);
  },

  async saveSensoryObservationDraft(
    organizationId: string,
    assignmentId: string,
    command: SensoryObservationCommand,
    signal?: AbortSignal,
  ): Promise<SensoryProfileRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sensory-profile-observation`,
      {
        method: 'PUT',
        body: sensoryObservationDraftCommandSchema.parse(command),
        schema: sensoryObservationMutationResponseSchema,
        signal,
      },
    );
    return mapSensoryObservation(response.data);
  },

  async completeSensoryObservation(
    organizationId: string,
    assignmentId: string,
    command: SensoryObservationCommand,
    signal?: AbortSignal,
  ): Promise<SensoryProfileRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sensory-profile-observation/complete`,
      {
        method: 'POST',
        body: sensoryObservationCompleteCommandSchema.parse(command),
        schema: sensoryObservationMutationResponseSchema,
        signal,
      },
    );
    return mapSensoryObservation(response.data);
  },

  async getSensoryObservation(
    organizationId: string,
    assignmentId: string,
    signal?: AbortSignal,
  ): Promise<SensoryProfileRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sensory-profile-observation`,
      { schema: sensoryObservationMutationResponseSchema, signal },
    );
    return mapSensoryObservation(response.data);
  },

  async getStudentSensoryObservations(
    organizationId: string,
    studentId: string,
    signal?: AbortSignal,
  ): Promise<SensoryProfileRecord[]> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/students/${encodeURIComponent(studentId)}/sensory-profile-observations`,
      { schema: sensoryObservationsResponseSchema, signal },
    );
    return response.data.map(mapSensoryObservation);
  },

  async getStudentSensoryReference(
    organizationId: string,
    studentId: string,
    signal?: AbortSignal,
  ): Promise<SensoryObservationReference> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/students/${encodeURIComponent(studentId)}/sensory-profile-observations/reference`,
      { schema: sensoryObservationReferenceResponseSchema, signal },
    );
    return mapSensoryObservationReference(response.data);
  },

  async createSFAObservation(
    organizationId: string,
    assignmentId: string,
    command: SFAObservationCommand,
    signal?: AbortSignal,
  ): Promise<SFAObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sfa-observation`,
      {
        method: 'POST',
        body: sfaObservationCreateCommandSchema.parse(
          sfaObservationCommandPayload(command),
        ),
        schema: sfaObservationMutationResponseSchema,
        signal,
      },
    );
    return mapSFAObservation(response.data);
  },

  async saveSFAObservationDraft(
    organizationId: string,
    assignmentId: string,
    command: SFAObservationCommand,
    signal?: AbortSignal,
  ): Promise<SFAObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sfa-observation`,
      {
        method: 'PUT',
        body: sfaObservationDraftCommandSchema.parse(
          sfaObservationCommandPayload(command),
        ),
        schema: sfaObservationMutationResponseSchema,
        signal,
      },
    );
    return mapSFAObservation(response.data);
  },

  async completeSFAObservation(
    organizationId: string,
    assignmentId: string,
    command: SFAObservationCommand,
    signal?: AbortSignal,
  ): Promise<SFAObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sfa-observation/complete`,
      {
        method: 'POST',
        body: sfaObservationCompleteCommandSchema.parse(
          sfaObservationCommandPayload(command),
        ),
        schema: sfaObservationMutationResponseSchema,
        signal,
      },
    );
    return mapSFAObservation(response.data);
  },

  async getSFAObservation(
    organizationId: string,
    assignmentId: string,
    signal?: AbortSignal,
  ): Promise<SFAObservationRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/observation-assignments/${encodeURIComponent(assignmentId)}/sfa-observation`,
      { schema: sfaObservationMutationResponseSchema, signal },
    );
    return mapSFAObservation(response.data);
  },

  async getStudentSFAObservations(
    organizationId: string,
    studentId: string,
    signal?: AbortSignal,
  ): Promise<SFAObservationRecord[]> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/students/${encodeURIComponent(studentId)}/sfa-observations`,
      { schema: sfaObservationsResponseSchema, signal },
    );
    return response.data.map(mapSFAObservation);
  },

  async getStudentSFAReference(
    organizationId: string,
    studentId: string,
    signal?: AbortSignal,
  ): Promise<SFAObservationReference> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/students/${encodeURIComponent(studentId)}/sfa-observations/reference`,
      { schema: sfaObservationReferenceResponseSchema, signal },
    );
    return mapSFAObservationReference(response.data);
  },
};
