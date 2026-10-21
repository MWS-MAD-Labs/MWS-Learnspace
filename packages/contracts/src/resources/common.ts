import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const schoolDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Expected an ISO 8601 calendar date (YYYY-MM-DD).',
  )
  .date('Expected a valid calendar date.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Expected a valid calendar date.');

export const strictBooleanSchema = z.custom<boolean>(
  (value) => typeof value === 'boolean',
  'Expected a boolean.',
);

export const collectionMetaSchema = z
  .object({ count: z.number().int().nonnegative() })
  .strict();

export function nullableTrimmedText(maximum: number) {
  return z.string().trim().min(1).max(maximum).nullable();
}
