import { z } from 'zod';

const uuidMapSchema = z.record(z.string().trim().min(1), z.string().uuid());

export const importManifestSchema = z
  .object({
    targetOrganizationId: z.string().uuid(),
    sourceKey: z.string().trim().min(1).max(200),
    operatorUserId: z.string().uuid(),
    enrollmentAcademicYear: z.string().trim().min(1),
    users: z.record(
      z.string().trim().min(1),
      z
        .object({
          targetUserId: z.string().uuid(),
          targetMembershipId: z.string().uuid(),
        })
        .strict(),
    ),
    academicYears: uuidMapSchema,
    semesters: uuidMapSchema,
    units: uuidMapSchema,
    grades: uuidMapSchema,
    classes: uuidMapSchema,
    subjects: uuidMapSchema,
  })
  .strict();

export type ImportManifest = z.infer<typeof importManifestSchema>;
