import { z } from 'zod';

export * from './resources.js';
export * from './exportFormat.js';
export * from './iep.js';
export * from './weeklyReport.js';
export * from './aggregates.js';

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['live', 'ready', 'unavailable']),
  dependencies: z.record(z.string(), z.enum(['up', 'down'])).optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const versionResponseSchema = z.object({
  name: z.literal('learnspace-api'),
  version: z.string().min(1),
});

export type VersionResponse = z.infer<typeof versionResponseSchema>;

export const membershipRoleSchema = z.enum([
  'PRINCIPAL',
  'DIRECTOR',
  'GRADE_TEACHER',
  'SUBJECT_TEACHER',
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
]);

export const authModeSchema = z.enum(['off', 'shadow', 'shared']);

const authHubBootstrapSchema = z.object({
  homeUrl: z.string().url(),
});

export const authBootstrapResponseSchema = z.discriminatedUnion('authMode', [
  z.object({ authMode: z.literal('off') }),
  z.object({
    authMode: z.literal('shadow'),
    hub: authHubBootstrapSchema,
  }),
  z.object({
    authMode: z.literal('shared'),
    hub: authHubBootstrapSchema,
  }),
]);

export type AuthBootstrapResponse = z.infer<typeof authBootstrapResponseSchema>;

export const currentSessionResponseSchema = z.object({
  authMode: authModeSchema.optional(),
  hub: z
    .object({
      homeUrl: z.string().url(),
      refreshUrl: z.string().url(),
    })
    .optional(),
  expiresIn: z.number().int().positive().optional(),
  user: z.object({
    id: z.string().guid({ error: 'Invalid uuid' }),
    email: z.string().email(),
    name: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
    status: z.literal('ACTIVE'),
  }),
  memberships: z.array(
    z.object({
      id: z.string().guid({ error: 'Invalid uuid' }),
      organizationId: z.string().guid({ error: 'Invalid uuid' }),
      organizationName: z.string().min(1),
      role: membershipRoleSchema,
      roleTitle: z.string().nullable(),
      unitIds: z.array(z.string().guid({ error: 'Invalid uuid' })),
      gradeIds: z.array(z.string().guid({ error: 'Invalid uuid' })),
      subjectIds: z.array(z.string().guid({ error: 'Invalid uuid' })),
      assignedStudentIds: z.array(z.string().guid({ error: 'Invalid uuid' })),
      permissions: z.array(z.string()),
    }),
  ),
  expiresAt: z.string().datetime(),
});

export type CurrentSessionResponse = z.infer<
  typeof currentSessionResponseSchema
>;
