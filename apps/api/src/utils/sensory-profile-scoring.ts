import {
  sensoryProfileDefinitionBodySchema,
  sensoryProfileResponsesCommandSchema,
  type SensoryProfileDefinitionBody,
  type SensoryProfileSection,
} from '@learnspace/contracts';

const sectionKeys: Record<SensoryProfileSection, string> = {
  Auditory: 'auditory',
  Visual: 'visual',
  Touch: 'touch',
  Movement: 'movement',
  Behavioral: 'behavioral',
};

export class SensoryProfileScoringError extends Error {
  constructor(
    readonly code:
      | 'SENSORY_PROFILE_DEFINITION_UNSCORABLE'
      | 'SENSORY_PROFILE_RESPONSES_INVALID'
      | 'SENSORY_PROFILE_RESPONSES_INCOMPLETE',
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SensoryProfileScoringError';
  }
}

function parseDefinition(body: unknown): SensoryProfileDefinitionBody {
  const parsed = sensoryProfileDefinitionBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new SensoryProfileScoringError(
      'SENSORY_PROFILE_DEFINITION_UNSCORABLE',
      'The assigned Sensory Profile definition does not contain a valid scoring model.',
      {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    );
  }
  return parsed.data;
}

export function scoreSensoryProfileResponses(input: {
  definitionBody: unknown;
  responses: unknown;
  requireComplete: boolean;
}) {
  const definition = parseDefinition(input.definitionBody);
  const parsedResponses = sensoryProfileResponsesCommandSchema.safeParse(
    input.responses,
  );
  if (!parsedResponses.success) {
    throw new SensoryProfileScoringError(
      'SENSORY_PROFILE_RESPONSES_INVALID',
      'The Sensory Profile responses are invalid.',
      {
        issues: parsedResponses.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    );
  }

  const itemIds = new Set(definition.items.map((item) => item.id));
  const issues = Object.keys(parsedResponses.data)
    .filter((itemId) => !itemIds.has(itemId))
    .map((itemId) => ({
      path: `responses.${itemId}`,
      message: `Unknown Sensory Profile item "${itemId}".`,
    }));
  if (issues.length > 0) {
    throw new SensoryProfileScoringError(
      'SENSORY_PROFILE_RESPONSES_INVALID',
      'The Sensory Profile responses do not match the assigned definition.',
      { issues },
    );
  }

  if (input.requireComplete) {
    const missingItemIds = definition.items
      .map((item) => item.id)
      .filter((itemId) => parsedResponses.data[itemId] === undefined);
    if (missingItemIds.length > 0) {
      throw new SensoryProfileScoringError(
        'SENSORY_PROFILE_RESPONSES_INCOMPLETE',
        'Every item in the assigned Sensory Profile definition must be rated before completion.',
        { missingItemIds },
      );
    }
  }

  const sectionScores = {
    auditory: { raw: 0, max: 0 },
    visual: { raw: 0, max: 0 },
    touch: { raw: 0, max: 0 },
    movement: { raw: 0, max: 0 },
    behavioral: { raw: 0, max: 0 },
  };
  let totalRawScore = 0;

  for (const item of definition.items) {
    const section =
      sectionScores[sectionKeys[item.section] as keyof typeof sectionScores];
    section.max += 5;
    const rating = parsedResponses.data[item.id];
    if (rating !== undefined) {
      section.raw += rating;
      totalRawScore += rating;
    }
  }

  return {
    definition,
    responses: parsedResponses.data,
    sectionScores,
    totalRawScore,
  };
}
