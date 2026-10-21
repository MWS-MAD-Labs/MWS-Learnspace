import { z } from 'zod';
import {
  collectionMetaSchema,
  schoolDateSchema,
  uuidSchema,
} from './common.js';

export const academicYearSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    name: z.string().min(1),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema,
  })
  .strict();
export const academicYearsResponseSchema = z
  .object({ data: z.array(academicYearSchema), meta: collectionMetaSchema })
  .strict();

export const unitSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export const unitsResponseSchema = z
  .object({ data: z.array(unitSchema), meta: collectionMetaSchema })
  .strict();

export const gradeSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    unitId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
    position: z.number().int(),
  })
  .strict();
export const gradesResponseSchema = z
  .object({ data: z.array(gradeSchema), meta: collectionMetaSchema })
  .strict();

export const classSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    unitId: uuidSchema,
    gradeId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export const classesResponseSchema = z
  .object({ data: z.array(classSchema), meta: collectionMetaSchema })
  .strict();

export const subjectSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    code: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export const subjectsResponseSchema = z
  .object({ data: z.array(subjectSchema), meta: collectionMetaSchema })
  .strict();

export const semesterSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    academicYearId: uuidSchema,
    name: z.string().min(1),
    position: z.number().int(),
    startsOn: schoolDateSchema,
    endsOn: schoolDateSchema,
  })
  .strict();
export const semestersResponseSchema = z
  .object({ data: z.array(semesterSchema), meta: collectionMetaSchema })
  .strict();

export type AcademicYearsResponse = z.infer<typeof academicYearsResponseSchema>;
export type SemestersResponse = z.infer<typeof semestersResponseSchema>;
export type UnitsResponse = z.infer<typeof unitsResponseSchema>;
export type GradesResponse = z.infer<typeof gradesResponseSchema>;
export type ClassesResponse = z.infer<typeof classesResponseSchema>;
export type SubjectsResponse = z.infer<typeof subjectsResponseSchema>;
