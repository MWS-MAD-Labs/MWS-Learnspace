import { z } from 'zod';

const uuidSchema = z.string().guid({ error: 'Invalid uuid' });
const uuidMapSchema = z.record(z.string().trim().min(1), uuidSchema);

export const importManifestSchema = z
  .object({
    targetOrganizationId: uuidSchema,
    sourceKey: z.string().trim().min(1).max(200),
    operatorUserId: uuidSchema,
    enrollmentAcademicYear: z.string().trim().min(1),
    users: z.record(
      z.string().trim().min(1),
      z
        .object({
          targetUserId: uuidSchema,
          targetMembershipId: uuidSchema,
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
