import { Prisma } from '@prisma/client';
import { HttpError } from '../middleware/http-errors.js';

export const definitionSelect = {
  id: true,
  organizationId: true,
  definitionKey: true,
  version: true,
  type: true,
  title: true,
  framework: true,
  description: true,
  targetAges: true,
  defaultFrequency: true,
  body: true,
  isActive: true,
  publishedAt: true,
  createdAt: true,
} satisfies Prisma.ObservationDefinitionSelect;

type DefinitionRow = Prisma.ObservationDefinitionGetPayload<{
  select: typeof definitionSelect;
}>;

export function mapDefinition(row: DefinitionRow) {
  if (!row.publishedAt) {
    throw new HttpError(
      500,
      'OBSERVATION_DEFINITION_INVALID',
      'The observation definition is not published.',
    );
  }
  return {
    ...row,
    publishedAt: row.publishedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
