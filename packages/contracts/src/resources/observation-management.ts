import { z } from 'zod';
import {
  collectionMetaSchema,
  nullableTrimmedText,
  schoolDateSchema,
  strictBooleanSchema,
  uuidSchema,
} from './common.js';
import { staffMembershipRoleSchema, studentSummarySchema } from './people.js';

export const observationTypeSchema = z.enum(['FEDC', 'SENSORY_PROFILE', 'SFA']);
export type ObservationType = z.infer<typeof observationTypeSchema>;

export const observationStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type ObservationStatus = z.infer<typeof observationStatusSchema>;

const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
type JsonValue =
  | z.infer<typeof jsonPrimitiveSchema>
  | JsonValue[]
  | { [key: string]: JsonValue };
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);
const observationDefinitionBodySchema = z.record(z.string(), jsonValueSchema);

const observationDefinitionBodyFields = {
  title: z.string().trim().min(1).max(256),
  framework: nullableTrimmedText(256).optional(),
  description: nullableTrimmedText(10000).optional(),
  targetAges: nullableTrimmedText(256).optional(),
  defaultFrequency: nullableTrimmedText(256).optional(),
  body: observationDefinitionBodySchema,
  isActive: strictBooleanSchema.optional(),
};

export const observationDefinitionSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    definitionKey: z.string().min(1),
    version: z.number().int().positive(),
    type: observationTypeSchema,
    title: z.string().min(1),
    framework: z.string().nullable(),
    description: z.string().nullable(),
    targetAges: z.string().nullable(),
    defaultFrequency: z.string().nullable(),
    body: observationDefinitionBodySchema,
    isActive: strictBooleanSchema,
    publishedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const observationDefinitionsResponseSchema = z
  .object({
    data: z.array(observationDefinitionSchema),
    meta: collectionMetaSchema,
  })
  .strict();
export const observationDefinitionMutationResponseSchema = z
  .object({ data: observationDefinitionSchema })
  .strict();
export const observationDefinitionCreateCommandSchema = z
  .object({
    definitionKey: z.string().trim().min(1).max(128),
    type: observationTypeSchema,
    ...observationDefinitionBodyFields,
  })
  .strict();
export const observationDefinitionVersionCreateCommandSchema = z
  .object(observationDefinitionBodyFields)
  .strict();

export const observationPersonSummarySchema = z
  .object({ id: uuidSchema, displayName: z.string().min(1) })
  .strict();
const observationAssigneeSummarySchema = z
  .object({
    membershipId: uuidSchema,
    userId: uuidSchema,
    displayName: z.string().min(1),
    role: staffMembershipRoleSchema,
    roleTitle: z.string().nullable(),
  })
  .strict();
const observationDefinitionSummarySchema = z
  .object({
    id: uuidSchema,
    definitionKey: z.string().min(1),
    version: z.number().int().positive(),
    type: observationTypeSchema,
    title: z.string().min(1),
    body: observationDefinitionBodySchema,
    isActive: strictBooleanSchema,
    publishedAt: z.string().datetime(),
  })
  .strict();

export const observationAssignmentSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    status: observationStatusSchema,
    academicYear: z.string().min(1),
    dueDate: schoolDateSchema,
    priority: z.string().nullable(),
    notes: z.string().nullable(),
    assignedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    cancelledAt: z.string().datetime().nullable(),
    cancellationReason: z.string().nullable(),
    student: studentSummarySchema,
    definition: observationDefinitionSummarySchema,
    assignedTo: observationAssigneeSummarySchema,
    assignedBy: observationPersonSummarySchema.nullable(),
    cancelledBy: observationPersonSummarySchema.nullable(),
    hasObservationRecord: strictBooleanSchema,
  })
  .strict();
export const observationAssignmentsResponseSchema = z
  .object({
    data: z.array(observationAssignmentSchema),
    meta: collectionMetaSchema,
  })
  .strict();

const observationAssignmentWriteFields = {
  definitionId: uuidSchema,
  assignedToMembershipId: uuidSchema,
  studentId: uuidSchema,
  academicYear: z.string().trim().min(1).max(64),
  dueDate: schoolDateSchema,
  priority: nullableTrimmedText(64).optional(),
  notes: nullableTrimmedText(4000).optional(),
};
export const observationAssignmentCreateCommandSchema = z
  .object(observationAssignmentWriteFields)
  .strict();
export const observationAssignmentUpdateCommandSchema = z
  .object({
    definitionId: uuidSchema.optional(),
    assignedToMembershipId: uuidSchema.optional(),
    studentId: uuidSchema.optional(),
    academicYear: z.string().trim().min(1).max(64).optional(),
    dueDate: schoolDateSchema.optional(),
    priority: nullableTrimmedText(64).optional(),
    notes: nullableTrimmedText(4000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one assignment field is required.',
  });
export const observationAssignmentCancelCommandSchema = z
  .object({ reason: z.string().trim().min(1).max(1000) })
  .strict();
export const observationAssignmentMutationResponseSchema = z
  .object({ data: observationAssignmentSchema })
  .strict();

export type ObservationDefinition = z.infer<typeof observationDefinitionSchema>;
export type ObservationAssignment = z.infer<typeof observationAssignmentSchema>;
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
