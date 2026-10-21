import { z } from 'zod';
import {
  collectionMetaSchema,
  schoolDateSchema,
  uuidSchema,
} from './common.js';

export const organizationSummarySchema = z
  .object({ id: uuidSchema, slug: z.string().min(1), name: z.string().min(1) })
  .strict();
export const organizationsResponseSchema = z
  .object({
    data: z.array(organizationSummarySchema),
    meta: collectionMetaSchema,
  })
  .strict();

export const ianaTimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Expected a valid IANA timezone identifier.');
export const organizationSettingsSchema = z
  .object({
    organizationId: uuidSchema,
    name: z.string().min(1),
    timezone: ianaTimezoneSchema,
  })
  .strict();
export const organizationSettingsResponseSchema = z
  .object({ data: organizationSettingsSchema })
  .strict();
export const organizationSettingsUpdateCommandSchema = z
  .object({ timezone: ianaTimezoneSchema })
  .strict();
export const organizationSchoolDateResponseSchema = z
  .object({
    data: z.object({
      organizationId: uuidSchema,
      timezone: ianaTimezoneSchema,
      schoolDate: schoolDateSchema,
    }),
  })
  .strict();

export type OrganizationsResponse = z.infer<typeof organizationsResponseSchema>;
export type OrganizationSettingsResponse = z.infer<
  typeof organizationSettingsResponseSchema
>;
export type OrganizationSettingsUpdateCommand = z.infer<
  typeof organizationSettingsUpdateCommandSchema
>;
export type OrganizationSchoolDateResponse = z.infer<
  typeof organizationSchoolDateResponseSchema
>;
