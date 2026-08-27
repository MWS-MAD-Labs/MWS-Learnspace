import {
  schoolDateSchema,
  sfaActivityPerformanceCommandSchema,
  sfaAdaptationsCommandSchema,
  sfaDefinitionBodySchema,
  sfaParticipationScoresCommandSchema,
  sfaRespondentSchema,
  sfaTaskSupportsCommandSchema,
  type SfaDefinitionBody,
} from '@learnspace/contracts';

export class SfaScoringError extends Error {
  constructor(
    readonly code:
      | 'SFA_DEFINITION_UNSCORABLE'
      | 'SFA_RESPONSES_INVALID'
      | 'SFA_RESPONSES_INCOMPLETE',
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SfaScoringError';
  }
}

function parseDefinition(body: unknown): SfaDefinitionBody {
  const parsed = sfaDefinitionBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new SfaScoringError(
      'SFA_DEFINITION_UNSCORABLE',
      'The assigned SFA definition does not contain a valid scoring model.',
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

function parseResponses(input: {
  participationScores?: unknown;
  taskSupports?: unknown;
  activityPerformance?: unknown;
  adaptations?: unknown;
  respondents?: unknown;
}) {
  const values = {
    participationScores: input.participationScores ?? {},
    taskSupports: input.taskSupports ?? {},
    activityPerformance: input.activityPerformance ?? {},
    adaptations: input.adaptations ?? [],
    respondents: input.respondents ?? [],
  };
  const schemas = {
    participationScores: sfaParticipationScoresCommandSchema,
    taskSupports: sfaTaskSupportsCommandSchema,
    activityPerformance: sfaActivityPerformanceCommandSchema,
    adaptations: sfaAdaptationsCommandSchema,
    respondents: sfaRespondentSchema.array().max(100),
  };
  const parsed = {
    participationScores: schemas.participationScores.safeParse(
      values.participationScores,
    ),
    taskSupports: schemas.taskSupports.safeParse(values.taskSupports),
    activityPerformance: schemas.activityPerformance.safeParse(
      values.activityPerformance,
    ),
    adaptations: schemas.adaptations.safeParse(values.adaptations),
    respondents: schemas.respondents.safeParse(values.respondents),
  };
  const issues = Object.entries(parsed).flatMap(([field, result]) =>
    result.success
      ? []
      : result.error.issues.map((issue) => ({
          path: [field, ...issue.path].join('.'),
          message: issue.message,
        })),
  );

  if (issues.length > 0) {
    throw new SfaScoringError(
      'SFA_RESPONSES_INVALID',
      'The SFA responses are invalid.',
      { issues },
    );
  }

  return {
    participationScores: parsed.participationScores.data!,
    taskSupports: parsed.taskSupports.data!,
    activityPerformance: parsed.activityPerformance.data!,
    adaptations: parsed.adaptations.data!,
    respondents: parsed.respondents.data!,
  };
}

export function scoreSfaResponses(input: {
  definitionBody: unknown;
  participationScores?: unknown;
  taskSupports?: unknown;
  activityPerformance?: unknown;
  adaptations?: unknown;
  respondents?: unknown;
  programRecommendation?: unknown;
  assessmentDate?: unknown;
  requireComplete: boolean;
}) {
  const definition = parseDefinition(input.definitionBody);
  const responses = parseResponses(input);
  const participationItemIds = new Set(
    definition.participationItems.map((item) => item.id),
  );
  const taskSupportItemIds = new Set(
    definition.taskSupportItems.map((item) => item.id),
  );
  const activityPerformanceItemIds = new Set(
    definition.activityPerformanceItems.map((item) => item.id),
  );
  const adaptationOptionIds = new Set(
    definition.adaptationOptions.map((item) => item.id),
  );

  const issues: Array<{ path: string; message: string }> = [];
  for (const itemId of Object.keys(responses.participationScores)) {
    if (!participationItemIds.has(itemId)) {
      issues.push({
        path: `participationScores.${itemId}`,
        message: `Unknown SFA participation item "${itemId}".`,
      });
    }
  }
  for (const itemId of Object.keys(responses.taskSupports)) {
    if (!taskSupportItemIds.has(itemId)) {
      issues.push({
        path: `taskSupports.${itemId}`,
        message: `Unknown SFA task support item "${itemId}".`,
      });
    }
  }
  for (const itemId of Object.keys(responses.activityPerformance)) {
    if (!activityPerformanceItemIds.has(itemId)) {
      issues.push({
        path: `activityPerformance.${itemId}`,
        message: `Unknown SFA activity performance item "${itemId}".`,
      });
    }
  }
  responses.adaptations.forEach((itemId, itemIndex) => {
    if (!adaptationOptionIds.has(itemId)) {
      issues.push({
        path: `adaptations.${itemIndex}`,
        message: `Unknown SFA adaptation option "${itemId}".`,
      });
    }
  });

  if (issues.length > 0) {
    throw new SfaScoringError(
      'SFA_RESPONSES_INVALID',
      'The SFA responses do not match the assigned definition.',
      { issues },
    );
  }

  if (input.requireComplete) {
    const missingParticipationItemIds = definition.participationItems
      .map((item) => item.id)
      .filter((itemId) => responses.participationScores[itemId] === undefined);
    const missingTaskSupportItemIds = definition.taskSupportItems
      .map((item) => item.id)
      .filter((itemId) => responses.taskSupports[itemId] === undefined);
    const missingActivityPerformanceItemIds =
      definition.activityPerformanceItems
        .map((item) => item.id)
        .filter(
          (itemId) => responses.activityPerformance[itemId] === undefined,
        );
    const missingRespondent = responses.respondents.length === 0;
    const missingProgramRecommendation =
      typeof input.programRecommendation !== 'string' ||
      input.programRecommendation.trim().length === 0;
    const missingAssessmentDate = !schoolDateSchema.safeParse(
      input.assessmentDate,
    ).success;

    if (
      missingParticipationItemIds.length > 0 ||
      missingTaskSupportItemIds.length > 0 ||
      missingActivityPerformanceItemIds.length > 0 ||
      missingRespondent ||
      missingProgramRecommendation ||
      missingAssessmentDate
    ) {
      throw new SfaScoringError(
        'SFA_RESPONSES_INCOMPLETE',
        'Every SFA item and required completion field must be provided before completion.',
        {
          missingParticipationItemIds,
          missingTaskSupportItemIds,
          missingActivityPerformanceItemIds,
          missingRespondent,
          missingProgramRecommendation,
          missingAssessmentDate,
        },
      );
    }
  }

  const participationRatings = Object.values(responses.participationScores);
  const totalParticipationRawScore = participationRatings.reduce(
    (total, rating) => total + rating,
    0,
  );
  const participationAverage =
    participationRatings.length === 0
      ? 0
      : Math.round(
          (totalParticipationRawScore / participationRatings.length) * 100,
        ) / 100;

  return {
    definition,
    ...responses,
    totalParticipationRawScore,
    participationAverage,
  };
}
