import { z } from 'zod';

export * from './resources.js';
export * from './exportFormat.js';
export * from './iep.js';

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
  dependencies: z.record(z.enum(['up', 'down'])).optional(),
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

export const currentSessionResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
    status: z.literal('ACTIVE'),
  }),
  memberships: z.array(
    z.object({
      id: z.string().uuid(),
      organizationId: z.string().uuid(),
      organizationName: z.string().min(1),
      role: membershipRoleSchema,
      roleTitle: z.string().nullable(),
      unitIds: z.array(z.string().uuid()),
      gradeIds: z.array(z.string().uuid()),
      subjectIds: z.array(z.string().uuid()),
      assignedStudentIds: z.array(z.string().uuid()),
      permissions: z.array(z.string()),
    }),
  ),
  expiresAt: z.string().datetime(),
});

export type CurrentSessionResponse = z.infer<
  typeof currentSessionResponseSchema
>;
