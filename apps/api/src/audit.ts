import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const safeText = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine(
    (value) =>
      !/\b(password|secret|token|cookie|authorization|phone|email|address|payload)\b/i.test(
        value,
      ),
    'audit metadata contains prohibited content',
  );
const fieldName = z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/);

const auditMetadataSchema = z
  .object({
    changedFields: z.array(fieldName).max(50).optional(),
    reason: safeText.optional(),
    route: z
      .string()
      .regex(/^\/[A-Za-z0-9/_:.-]{0,255}$/)
      .optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
    source: safeText.optional(),
  })
  .strict();

type AuditMetadata = z.infer<typeof auditMetadataSchema>;
type AuditResultValue = 'SUCCEEDED' | 'DENIED' | 'FAILED';

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): AuditMetadata | undefined {
  if (!metadata) return undefined;

  const result = auditMetadataSchema.safeParse(metadata);
  if (!result.success) return undefined;
  return result.data;
}

export type CreateAuditEventInput = {
  organizationId: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  requestId: string;
  result: AuditResultValue;
  metadata?: Record<string, unknown>;
};

export function createAuditRepository(prisma: PrismaClient) {
  return {
    append(input: CreateAuditEventInput) {
      return prisma.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.actorId,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          requestId: input.requestId,
          result: input.result,
          metadata: sanitizeAuditMetadata(input.metadata),
        },
      });
    },
  };
}
