import {
  fedcDefinitionBodySchema,
  fedcResponsesCommandSchema,
  type FedcDefinitionBody,
  type FedcRating,
  type FedcScoredResponse,
} from '@learnspace/contracts';

const ratingScores: Record<FedcRating, number> = {
  T: 1,
  K: 2,
  S: 3,
  H: 0,
};

export class FedcScoringError extends Error {
  constructor(
    readonly code:
      | 'FEDC_DEFINITION_UNSCORABLE'
      | 'FEDC_RESPONSES_INVALID'
      | 'FEDC_RESPONSES_INCOMPLETE',
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'FedcScoringError';
  }
}

function parseDefinition(body: unknown): FedcDefinitionBody {
  const parsed = fedcDefinitionBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new FedcScoringError(
      'FEDC_DEFINITION_UNSCORABLE',
      'The assigned FEDC definition does not contain a valid scoring model.',
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

export function scoreFedcResponses(input: {
  definitionBody: unknown;
  responses: unknown;
  requireComplete: boolean;
}) {
  const definition = parseDefinition(input.definitionBody);
  const parsedResponses = fedcResponsesCommandSchema.safeParse(input.responses);
  if (!parsedResponses.success) {
    throw new FedcScoringError(
      'FEDC_RESPONSES_INVALID',
      'The FEDC responses are invalid.',
      {
        issues: parsedResponses.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    );
  }

  const itemToMilestone = new Map<string, number>();
  for (const milestone of definition.milestones) {
    for (const item of milestone.items) {
      itemToMilestone.set(item.id, milestone.id);
    }
  }

  const issues: Array<{ path: string; message: string }> = [];
  for (const [responseKey, response] of Object.entries(parsedResponses.data)) {
    if (response.itemId !== responseKey) {
      issues.push({
        path: `responses.${responseKey}.itemId`,
        message: 'FEDC response itemId must match its response key.',
      });
    }
    if (!itemToMilestone.has(response.itemId)) {
      issues.push({
        path: `responses.${responseKey}.itemId`,
        message: `Unknown FEDC item "${response.itemId}".`,
      });
    }
  }
  if (issues.length > 0) {
    throw new FedcScoringError(
      'FEDC_RESPONSES_INVALID',
      'The FEDC responses do not match the assigned definition.',
      { issues },
    );
  }

  if (input.requireComplete) {
    const missingItemIds = [...itemToMilestone.keys()].filter(
      (itemId) => parsedResponses.data[itemId] === undefined,
    );
    if (missingItemIds.length > 0) {
      throw new FedcScoringError(
        'FEDC_RESPONSES_INCOMPLETE',
        'Every item in the assigned FEDC definition must be rated before completion.',
        { missingItemIds },
      );
    }
  }

  const milestoneScores: Record<string, number> = Object.fromEntries(
    definition.milestones.map((milestone) => [String(milestone.id), 0]),
  );
  const responses: Record<string, FedcScoredResponse> = {};
  let totalScore = 0;

  for (const [responseKey, response] of Object.entries(parsedResponses.data)) {
    const score = ratingScores[response.rating];
    const milestoneId = itemToMilestone.get(response.itemId)!;
    milestoneScores[String(milestoneId)] += score;
    totalScore += score;
    responses[responseKey] = { ...response, score };
  }

  return {
    definition,
    responses,
    milestoneScores,
    totalScore,
    maxPossibleScore: definition.milestones.reduce(
      (total, milestone) => total + milestone.maxScore,
      0,
    ),
  };
}
