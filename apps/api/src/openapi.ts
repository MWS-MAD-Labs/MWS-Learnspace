import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ZodTypeAny } from 'zod';
import {
  academicYearsResponseSchema,
  aggregateNotificationsResponseSchema,
  aggregateSearchResponseSchema,
  apiErrorSchema,
  attendanceBulkSaveCommandSchema,
  attendanceBulkSaveResponseSchema,
  attendanceRosterResponseSchema,
  classesResponseSchema,
  dashboardSummaryResponseSchema,
  currentSessionResponseSchema,
  fedcObservationCompleteCommandSchema,
  fedcObservationCreateDraftCommandSchema,
  fedcObservationHistoryResponseSchema,
  fedcObservationReferenceResponseSchema,
  fedcObservationResponseSchema,
  fedcObservationSaveDraftCommandSchema,
  gpkAssignmentEndCommandSchema,
  gpkAssignmentMutationResponseSchema,
  gpkAssignmentsResponseSchema,
  gpkAssignmentUpsertCommandSchema,
  gradesResponseSchema,
  iepCreateCommandSchema,
  iepDetailResponseSchema,
  iepMutationResponseSchema,
  iepReviewCommandSchema,
  iepUpdateCommandSchema,
  iepWorkflowCommandSchema,
  iepsResponseSchema,
  reportingAggregateResponseSchema,
  organizationAccountCreateCommandSchema,
  organizationAccountMutationResponseSchema,
  organizationAccountsResponseSchema,
  organizationAccountUpdateCommandSchema,
  organizationSchoolDateResponseSchema,
  organizationSettingsResponseSchema,
  organizationSettingsUpdateCommandSchema,
  organizationsResponseSchema,
  observationAssignmentCancelCommandSchema,
  observationAssignmentCreateCommandSchema,
  observationAssignmentMutationResponseSchema,
  observationAssignmentsResponseSchema,
  observationAssignmentUpdateCommandSchema,
  observationDefinitionCreateCommandSchema,
  observationDefinitionMutationResponseSchema,
  observationDefinitionsResponseSchema,
  observationDefinitionVersionCreateCommandSchema,
  sensoryProfileObservationCompleteCommandSchema,
  sensoryProfileObservationCreateDraftCommandSchema,
  sensoryProfileObservationHistoryResponseSchema,
  sensoryProfileObservationReferenceResponseSchema,
  sensoryProfileObservationResponseSchema,
  sensoryProfileObservationSaveDraftCommandSchema,
  sfaObservationCompleteCommandSchema,
  sfaObservationCreateDraftCommandSchema,
  sfaObservationHistoryResponseSchema,
  sfaObservationReferenceResponseSchema,
  sfaObservationResponseSchema,
  sfaObservationSaveDraftCommandSchema,
  staffDirectoryResponseSchema,
  studentCreateCommandSchema,
  studentDetailResponseSchema,
  studentMutationResponseSchema,
  studentsResponseSchema,
  studentUpdateCommandSchema,
  subjectsResponseSchema,
  unitsResponseSchema,
  versionResponseSchema,
} from '@learnspace/contracts';

type JsonSchema = Record<string, unknown>;
type SchemaDefinition = {
  _def: Record<string, unknown>;
  isOptional(): boolean;
};

const components: Record<string, ZodTypeAny> = {
  ApiError: apiErrorSchema,
  VersionResponse: versionResponseSchema,
  CurrentSessionResponse: currentSessionResponseSchema,
  DashboardSummaryResponse: dashboardSummaryResponseSchema,
  AggregateSearchResponse: aggregateSearchResponseSchema,
  AggregateNotificationsResponse: aggregateNotificationsResponseSchema,
  ReportingAggregateResponse: reportingAggregateResponseSchema,
  OrganizationsResponse: organizationsResponseSchema,
  AcademicYearsResponse: academicYearsResponseSchema,
  UnitsResponse: unitsResponseSchema,
  GradesResponse: gradesResponseSchema,
  ClassesResponse: classesResponseSchema,
  IepsResponse: iepsResponseSchema,
  IepDetailResponse: iepDetailResponseSchema,
  IepCreateCommand: iepCreateCommandSchema,
  IepUpdateCommand: iepUpdateCommandSchema,
  IepWorkflowCommand: iepWorkflowCommandSchema,
  IepReviewCommand: iepReviewCommandSchema,
  IepMutationResponse: iepMutationResponseSchema,
  SubjectsResponse: subjectsResponseSchema,
  StaffDirectoryResponse: staffDirectoryResponseSchema,
  OrganizationAccountsResponse: organizationAccountsResponseSchema,
  OrganizationSchoolDateResponse: organizationSchoolDateResponseSchema,
  OrganizationSettingsResponse: organizationSettingsResponseSchema,
  OrganizationSettingsUpdateCommand: organizationSettingsUpdateCommandSchema,
  OrganizationAccountCreateCommand: organizationAccountCreateCommandSchema,
  OrganizationAccountUpdateCommand: organizationAccountUpdateCommandSchema,
  OrganizationAccountMutationResponse:
    organizationAccountMutationResponseSchema,
  StudentsResponse: studentsResponseSchema,
  StudentDetailResponse: studentDetailResponseSchema,
  StudentCreateCommand: studentCreateCommandSchema,
  StudentUpdateCommand: studentUpdateCommandSchema,
  StudentMutationResponse: studentMutationResponseSchema,
  GpkAssignmentsResponse: gpkAssignmentsResponseSchema,
  GpkAssignmentUpsertCommand: gpkAssignmentUpsertCommandSchema,
  GpkAssignmentEndCommand: gpkAssignmentEndCommandSchema,
  GpkAssignmentMutationResponse: gpkAssignmentMutationResponseSchema,
  AttendanceRosterResponse: attendanceRosterResponseSchema,
  AttendanceBulkSaveCommand: attendanceBulkSaveCommandSchema,
  AttendanceBulkSaveResponse: attendanceBulkSaveResponseSchema,
  ObservationDefinitionsResponse: observationDefinitionsResponseSchema,
  ObservationDefinitionCreateCommand: observationDefinitionCreateCommandSchema,
  ObservationDefinitionVersionCreateCommand:
    observationDefinitionVersionCreateCommandSchema,
  ObservationDefinitionMutationResponse:
    observationDefinitionMutationResponseSchema,
  ObservationAssignmentsResponse: observationAssignmentsResponseSchema,
  ObservationAssignmentCreateCommand: observationAssignmentCreateCommandSchema,
  ObservationAssignmentUpdateCommand: observationAssignmentUpdateCommandSchema,
  ObservationAssignmentCancelCommand: observationAssignmentCancelCommandSchema,
  ObservationAssignmentMutationResponse:
    observationAssignmentMutationResponseSchema,
  FedcObservationCreateDraftCommand: fedcObservationCreateDraftCommandSchema,
  FedcObservationSaveDraftCommand: fedcObservationSaveDraftCommandSchema,
  FedcObservationCompleteCommand: fedcObservationCompleteCommandSchema,
  FedcObservationResponse: fedcObservationResponseSchema,
  FedcObservationHistoryResponse: fedcObservationHistoryResponseSchema,
  FedcObservationReferenceResponse: fedcObservationReferenceResponseSchema,
  SensoryProfileObservationCreateDraftCommand:
    sensoryProfileObservationCreateDraftCommandSchema,
  SensoryProfileObservationSaveDraftCommand:
    sensoryProfileObservationSaveDraftCommandSchema,
  SensoryProfileObservationCompleteCommand:
    sensoryProfileObservationCompleteCommandSchema,
  SensoryProfileObservationResponse: sensoryProfileObservationResponseSchema,
  SensoryProfileObservationHistoryResponse:
    sensoryProfileObservationHistoryResponseSchema,
  SensoryProfileObservationReferenceResponse:
    sensoryProfileObservationReferenceResponseSchema,
  SfaObservationCreateDraftCommand: sfaObservationCreateDraftCommandSchema,
  SfaObservationSaveDraftCommand: sfaObservationSaveDraftCommandSchema,
  SfaObservationCompleteCommand: sfaObservationCompleteCommandSchema,
  SfaObservationResponse: sfaObservationResponseSchema,
  SfaObservationHistoryResponse: sfaObservationHistoryResponseSchema,
  SfaObservationReferenceResponse: sfaObservationReferenceResponseSchema,
};

function zodDefinition(schema: ZodTypeAny): SchemaDefinition {
  return schema as unknown as SchemaDefinition;
}

function stringSchema(definition: Record<string, unknown>): JsonSchema {
  const result: JsonSchema = { type: 'string' };
  for (const check of (definition.checks ?? []) as Array<
    Record<string, unknown>
  >) {
    if (check.kind === 'min') result.minLength = check.value;
    if (check.kind === 'max') result.maxLength = check.value;
    if (check.kind === 'uuid') result.format = 'uuid';
    if (check.kind === 'email') result.format = 'email';
    if (check.kind === 'url') result.format = 'uri';
    if (check.kind === 'datetime') result.format = 'date-time';
    if (check.kind === 'date') result.format = 'date';
    if (check.kind === 'regex' && check.regex instanceof RegExp) {
      result.pattern = check.regex.source;
    }
  }
  return result;
}

function numberSchema(definition: Record<string, unknown>): JsonSchema {
  const result: JsonSchema = { type: 'number' };
  for (const check of (definition.checks ?? []) as Array<
    Record<string, unknown>
  >) {
    if (check.kind === 'int') result.type = 'integer';
    if (check.kind === 'min' && typeof check.value === 'number') {
      result.minimum = check.value;
    }
    if (check.kind === 'max' && typeof check.value === 'number') {
      result.maximum = check.value;
    }
  }
  return result;
}

export function zodToJsonSchema(schema: ZodTypeAny): JsonSchema {
  const definition = zodDefinition(schema)._def;
  switch (definition.typeName) {
    case 'ZodString':
      return stringSchema(definition);
    case 'ZodNumber':
      return numberSchema(definition);
    case 'ZodLiteral':
      return { const: definition.value };
    case 'ZodEnum':
      return { type: 'string', enum: definition.values };
    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema(definition.type as ZodTypeAny),
        ...((definition.minLength as { value?: number } | null)?.value ===
        undefined
          ? {}
          : { minItems: (definition.minLength as { value: number }).value }),
        ...((definition.maxLength as { value?: number } | null)?.value ===
        undefined
          ? {}
          : { maxItems: (definition.maxLength as { value: number }).value }),
      };
    case 'ZodObject': {
      const shape = (definition.shape as () => Record<string, ZodTypeAny>)();
      const required = Object.entries(shape)
        .filter(([, value]) => !zodDefinition(value).isOptional())
        .map(([key]) => key);
      return {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, value]) => [
            key,
            zodToJsonSchema(value),
          ]),
        ),
        ...(required.length ? { required } : {}),
        additionalProperties: definition.unknownKeys === 'passthrough',
      };
    }
    case 'ZodRecord':
      return {
        type: 'object',
        additionalProperties: zodToJsonSchema(
          definition.valueType as ZodTypeAny,
        ),
      };
    case 'ZodOptional':
    case 'ZodDefault':
      return zodToJsonSchema(definition.innerType as ZodTypeAny);
    case 'ZodNullable':
      return {
        anyOf: [
          zodToJsonSchema(definition.innerType as ZodTypeAny),
          { type: 'null' },
        ],
      };
    case 'ZodUnion':
      return {
        anyOf: (definition.options as ZodTypeAny[]).map(zodToJsonSchema),
      };
    case 'ZodLazy':
      return {};
    case 'ZodEffects':
      return zodToJsonSchema(definition.schema as ZodTypeAny);
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodNull':
      return { type: 'null' };
    case 'ZodUnknown':
    case 'ZodAny':
      return {};
    default:
      throw new Error(
        `Unsupported Zod OpenAPI type: ${String(definition.typeName)}`,
      );
  }
}

const errorResponses = {
  '400': {
    description: 'Invalid request',
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
    },
  },
  '401': {
    description: 'Authentication required',
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
    },
  },
  '403': {
    description: 'Authorization denied without resource enumeration',
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
    },
  },
  '500': {
    description: 'Unexpected server error',
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/ApiError' } },
    },
  },
};

function jsonResponse(schemaName: string, description = 'Successful response') {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

const organizationParameter = {
  name: 'organizationId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const classParameter = {
  name: 'classId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const studentParameter = {
  name: 'studentId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const membershipParameter = {
  name: 'membershipId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const assignmentParameter = {
  name: 'assignmentId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const definitionParameter = {
  name: 'definitionId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const csrfParameter = {
  name: 'x-csrf-token',
  in: 'header',
  required: true,
  schema: { type: 'string', minLength: 1 },
};
const schoolDateParameter = {
  name: 'schoolDate',
  in: 'query',
  required: true,
  schema: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
};

function iepWorkflowPath(
  operationId: string,
  commandSchema: string,
  description: string,
) {
  return {
    post: {
      tags: ['IEPs'],
      operationId,
      description,
      parameters: [
        organizationParameter,
        {
          name: 'iepId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        csrfParameter,
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${commandSchema}` },
          },
        },
      },
      responses: {
        '200': jsonResponse('IepMutationResponse'),
        ...errorResponses,
        '409': jsonResponse('ApiError', 'IEP workflow or version conflict'),
      },
    },
  };
}

function collectionOperation(
  tag: string,
  operationId: string,
  schemaName: string,
) {
  return {
    tags: [tag],
    operationId,
    parameters: [organizationParameter],
    responses: { '200': jsonResponse(schemaName), ...errorResponses },
  };
}

export function generateOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Learnspace API',
      version: '0.2.0',
      description:
        'Versioned Learnspace backend API. Runtime payloads are validated with shared Zod schemas.',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/version': {
        get: {
          tags: ['System'],
          operationId: 'getVersion',
          responses: {
            '200': jsonResponse('VersionResponse'),
            '500': errorResponses['500'],
          },
        },
      },
      '/auth/session': {
        get: {
          tags: ['Authentication'],
          operationId: 'getCurrentSession',
          responses: {
            '200': jsonResponse('CurrentSessionResponse'),
            '401': errorResponses['401'],
            '500': errorResponses['500'],
          },
        },
      },
      '/organizations': {
        get: {
          tags: ['Academic data'],
          operationId: 'listAvailableOrganizations',
          responses: {
            '200': jsonResponse('OrganizationsResponse'),
            '401': errorResponses['401'],
            '500': errorResponses['500'],
          },
        },
      },
      '/organizations/{organizationId}/school-date': {
        get: collectionOperation(
          'Academic data',
          'getOrganizationSchoolDate',
          'OrganizationSchoolDateResponse',
        ),
      },
      '/organizations/{organizationId}/settings': {
        get: collectionOperation(
          'Organization administration',
          'getOrganizationSettings',
          'OrganizationSettingsResponse',
        ),
        patch: {
          tags: ['Organization administration'],
          operationId: 'updateOrganizationSettings',
          parameters: [organizationParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrganizationSettingsUpdateCommand',
                },
              },
            },
          },
          responses: {
            '200': jsonResponse('OrganizationSettingsResponse'),
            ...errorResponses,
          },
        },
      },
      '/organizations/{organizationId}/dashboard-summary': {
        get: collectionOperation(
          'Aggregates',
          'getDashboardSummary',
          'DashboardSummaryResponse',
        ),
      },
      '/organizations/{organizationId}/search': {
        get: {
          ...collectionOperation(
            'Aggregates',
            'searchAuthorizedRecords',
            'AggregateSearchResponse',
          ),
          parameters: [
            organizationParameter,
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string', minLength: 2, maxLength: 100 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
            },
            {
              name: 'offset',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 0,
                maximum: 1000,
                default: 0,
              },
            },
          ],
        },
      },
      '/organizations/{organizationId}/notifications': {
        get: collectionOperation(
          'Aggregates',
          'listAuthorizedNotifications',
          'AggregateNotificationsResponse',
        ),
      },
      '/organizations/{organizationId}/reporting-aggregate': {
        get: collectionOperation(
          'Aggregates',
          'getReportingAggregate',
          'ReportingAggregateResponse',
        ),
      },
      '/organizations/{organizationId}/academic-years': {
        get: collectionOperation(
          'Academic data',
          'listAcademicYears',
          'AcademicYearsResponse',
        ),
      },
      '/organizations/{organizationId}/units': {
        get: collectionOperation('Academic data', 'listUnits', 'UnitsResponse'),
      },
      '/organizations/{organizationId}/grades': {
        get: collectionOperation(
          'Academic data',
          'listGrades',
          'GradesResponse',
        ),
      },
      '/organizations/{organizationId}/classes': {
        get: collectionOperation(
          'Academic data',
          'listClasses',
          'ClassesResponse',
        ),
      },
      '/organizations/{organizationId}/subjects': {
        get: collectionOperation(
          'Academic data',
          'listSubjects',
          'SubjectsResponse',
        ),
      },
      '/organizations/{organizationId}/accounts': {
        get: collectionOperation(
          'Organization administration',
          'listOrganizationAccounts',
          'OrganizationAccountsResponse',
        ),
        post: {
          tags: ['Organization administration'],
          operationId: 'createOrganizationAccount',
          description:
            'Creates an organization membership and, when necessary, its global user identity. Existing global users are linked without changing their identity fields.',
          parameters: [organizationParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrganizationAccountCreateCommand',
                },
              },
            },
          },
          responses: {
            '201': jsonResponse(
              'OrganizationAccountMutationResponse',
              'Organization account created',
            ),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'Account conflict'),
          },
        },
      },
      '/organizations/{organizationId}/accounts/{membershipId}': {
        patch: {
          tags: ['Organization administration'],
          operationId: 'updateOrganizationAccount',
          description:
            'Updates organization-local membership role, status, and scopes. Email, display name, avatar URL, and user status are global identity fields and cannot be changed when the user belongs to another organization.',
          parameters: [
            organizationParameter,
            membershipParameter,
            csrfParameter,
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OrganizationAccountUpdateCommand',
                },
              },
            },
          },
          responses: {
            '200': jsonResponse('OrganizationAccountMutationResponse'),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'Account or self-lockout conflict'),
          },
        },
      },
      '/organizations/{organizationId}/staff': {
        get: collectionOperation(
          'Staff administration',
          'listOrganizationStaff',
          'StaffDirectoryResponse',
        ),
      },
      '/organizations/{organizationId}/students': {
        get: {
          tags: ['Students'],
          operationId: 'listStudents',
          parameters: [
            organizationParameter,
            { ...schoolDateParameter, required: false },
            ...['classId', 'unitId', 'gradeId'].map((name) => ({
              name,
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'uuid' },
            })),
          ],
          responses: {
            '200': jsonResponse('StudentsResponse'),
            ...errorResponses,
          },
        },
        post: {
          tags: ['Students'],
          operationId: 'createStudent',
          parameters: [organizationParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StudentCreateCommand' },
              },
            },
          },
          responses: {
            '201': jsonResponse('StudentMutationResponse', 'Student created'),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'Student number conflict'),
          },
        },
      },
      '/organizations/{organizationId}/students/{studentId}': {
        get: {
          tags: ['Students'],
          operationId: 'getStudent',
          parameters: [
            organizationParameter,
            studentParameter,
            { ...schoolDateParameter, required: false },
          ],
          responses: {
            '200': jsonResponse('StudentDetailResponse'),
            ...errorResponses,
          },
        },
        patch: {
          tags: ['Students'],
          operationId: 'updateStudent',
          parameters: [organizationParameter, studentParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StudentUpdateCommand' },
              },
            },
          },
          responses: {
            '200': jsonResponse('StudentMutationResponse'),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'Student number conflict'),
          },
        },
      },
      '/organizations/{organizationId}/gpk-assignments': {
        get: {
          tags: ['Staff administration'],
          operationId: 'listGpkAssignments',
          parameters: [
            organizationParameter,
            { ...schoolDateParameter, required: false },
            ...['studentId', 'membershipId'].map((name) => ({
              name,
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'uuid' },
            })),
          ],
          responses: {
            '200': jsonResponse('GpkAssignmentsResponse'),
            ...errorResponses,
          },
        },
      },
      '/organizations/{organizationId}/students/{studentId}/gpk-assignment': {
        put: {
          tags: ['Staff administration'],
          operationId: 'assignGpkTeacher',
          parameters: [organizationParameter, studentParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GpkAssignmentUpsertCommand',
                },
              },
            },
          },
          responses: {
            '200': jsonResponse('GpkAssignmentMutationResponse'),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'Assignment or capacity conflict'),
          },
        },
      },
      '/organizations/{organizationId}/gpk-assignments/{assignmentId}/end': {
        post: {
          tags: ['Staff administration'],
          operationId: 'endGpkAssignment',
          parameters: [
            organizationParameter,
            assignmentParameter,
            csrfParameter,
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GpkAssignmentEndCommand',
                },
              },
            },
          },
          responses: {
            '200': jsonResponse('GpkAssignmentMutationResponse'),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'Assignment already ended'),
          },
        },
      },
      '/organizations/{organizationId}/observation-definitions': {
        get: collectionOperation(
          'Observations',
          'listObservationDefinitions',
          'ObservationDefinitionsResponse',
        ),
        post: {
          tags: ['Observations'],
          operationId: 'createObservationDefinition',
          parameters: [organizationParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ObservationDefinitionCreateCommand',
                },
              },
            },
          },
          responses: {
            '201': jsonResponse(
              'ObservationDefinitionMutationResponse',
              'Observation definition created',
            ),
            ...errorResponses,
            '409': jsonResponse(
              'ApiError',
              'Observation definition already exists',
            ),
          },
        },
      },
      '/organizations/{organizationId}/observation-definitions/{definitionId}/versions':
        {
          post: {
            tags: ['Observations'],
            operationId: 'createObservationDefinitionVersion',
            parameters: [
              organizationParameter,
              definitionParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ObservationDefinitionVersionCreateCommand',
                  },
                },
              },
            },
            responses: {
              '201': jsonResponse(
                'ObservationDefinitionMutationResponse',
                'Observation definition version created',
              ),
              ...errorResponses,
              '409': jsonResponse(
                'ApiError',
                'Observation definition version conflict',
              ),
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments': {
        get: collectionOperation(
          'Observations',
          'listObservationAssignments',
          'ObservationAssignmentsResponse',
        ),
        post: {
          tags: ['Observations'],
          operationId: 'createObservationAssignment',
          parameters: [organizationParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ObservationAssignmentCreateCommand',
                },
              },
            },
          },
          responses: {
            '201': jsonResponse(
              'ObservationAssignmentMutationResponse',
              'Observation assignment created',
            ),
            ...errorResponses,
          },
        },
      },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}':
        {
          patch: {
            tags: ['Observations'],
            operationId: 'updateObservationAssignment',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ObservationAssignmentUpdateCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('ObservationAssignmentMutationResponse'),
              ...errorResponses,
              '409': jsonResponse(
                'ApiError',
                'Observation assignment state conflict',
              ),
            },
          },
          delete: {
            tags: ['Observations'],
            operationId: 'deleteObservationAssignment',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            responses: {
              '204': { description: 'Observation assignment deleted' },
              ...errorResponses,
              '409': jsonResponse(
                'ApiError',
                'Observation assignment state conflict',
              ),
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}/cancel':
        {
          post: {
            tags: ['Observations'],
            operationId: 'cancelObservationAssignment',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ObservationAssignmentCancelCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('ObservationAssignmentMutationResponse'),
              ...errorResponses,
              '409': jsonResponse(
                'ApiError',
                'Observation assignment state conflict',
              ),
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}/fedc-observation':
        {
          get: {
            tags: ['Observations'],
            operationId: 'getFedcObservationByAssignment',
            parameters: [organizationParameter, assignmentParameter],
            responses: {
              '200': jsonResponse('FedcObservationResponse'),
              ...errorResponses,
            },
          },
          post: {
            tags: ['Observations'],
            operationId: 'createFedcObservationDraft',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/FedcObservationCreateDraftCommand',
                  },
                },
              },
            },
            responses: {
              '201': jsonResponse(
                'FedcObservationResponse',
                'FEDC draft created',
              ),
              ...errorResponses,
              '409': jsonResponse('ApiError', 'FEDC lifecycle conflict'),
            },
          },
          put: {
            tags: ['Observations'],
            operationId: 'saveFedcObservationDraft',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/FedcObservationSaveDraftCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('FedcObservationResponse'),
              ...errorResponses,
              '409': jsonResponse('ApiError', 'FEDC lifecycle conflict'),
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}/fedc-observation/complete':
        {
          post: {
            tags: ['Observations'],
            operationId: 'completeFedcObservation',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/FedcObservationCompleteCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('FedcObservationResponse'),
              ...errorResponses,
              '409': jsonResponse('ApiError', 'FEDC lifecycle conflict'),
            },
          },
        },
      '/organizations/{organizationId}/students/{studentId}/fedc-observations':
        {
          get: {
            tags: ['Observations'],
            operationId: 'listStudentFedcObservations',
            parameters: [organizationParameter, studentParameter],
            responses: {
              '200': jsonResponse('FedcObservationHistoryResponse'),
              ...errorResponses,
            },
          },
        },
      '/organizations/{organizationId}/students/{studentId}/fedc-observations/reference':
        {
          get: {
            tags: ['Observations'],
            operationId: 'getStudentFedcReference',
            parameters: [organizationParameter, studentParameter],
            responses: {
              '200': jsonResponse('FedcObservationReferenceResponse'),
              ...errorResponses,
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}/sensory-profile-observation':
        {
          get: {
            tags: ['Observations'],
            operationId: 'getSensoryProfileObservationByAssignment',
            parameters: [organizationParameter, assignmentParameter],
            responses: {
              '200': jsonResponse('SensoryProfileObservationResponse'),
              ...errorResponses,
            },
          },
          post: {
            tags: ['Observations'],
            operationId: 'createSensoryProfileObservationDraft',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SensoryProfileObservationCreateDraftCommand',
                  },
                },
              },
            },
            responses: {
              '201': jsonResponse(
                'SensoryProfileObservationResponse',
                'Sensory Profile draft created',
              ),
              ...errorResponses,
              '409': jsonResponse(
                'ApiError',
                'Sensory Profile lifecycle conflict',
              ),
            },
          },
          put: {
            tags: ['Observations'],
            operationId: 'saveSensoryProfileObservationDraft',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SensoryProfileObservationSaveDraftCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('SensoryProfileObservationResponse'),
              ...errorResponses,
              '409': jsonResponse(
                'ApiError',
                'Sensory Profile lifecycle conflict',
              ),
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}/sensory-profile-observation/complete':
        {
          post: {
            tags: ['Observations'],
            operationId: 'completeSensoryProfileObservation',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SensoryProfileObservationCompleteCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('SensoryProfileObservationResponse'),
              ...errorResponses,
              '409': jsonResponse(
                'ApiError',
                'Sensory Profile lifecycle conflict',
              ),
            },
          },
        },
      '/organizations/{organizationId}/students/{studentId}/sensory-profile-observations':
        {
          get: {
            tags: ['Observations'],
            operationId: 'listStudentSensoryProfileObservations',
            parameters: [organizationParameter, studentParameter],
            responses: {
              '200': jsonResponse('SensoryProfileObservationHistoryResponse'),
              ...errorResponses,
            },
          },
        },
      '/organizations/{organizationId}/students/{studentId}/sensory-profile-observations/reference':
        {
          get: {
            tags: ['Observations'],
            operationId: 'getStudentSensoryProfileReference',
            parameters: [organizationParameter, studentParameter],
            responses: {
              '200': jsonResponse('SensoryProfileObservationReferenceResponse'),
              ...errorResponses,
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}/sfa-observation':
        {
          get: {
            tags: ['Observations'],
            operationId: 'getSfaObservationByAssignment',
            parameters: [organizationParameter, assignmentParameter],
            responses: {
              '200': jsonResponse('SfaObservationResponse'),
              ...errorResponses,
            },
          },
          post: {
            tags: ['Observations'],
            operationId: 'createSfaObservationDraft',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SfaObservationCreateDraftCommand',
                  },
                },
              },
            },
            responses: {
              '201': jsonResponse(
                'SfaObservationResponse',
                'SFA draft created',
              ),
              ...errorResponses,
              '409': jsonResponse('ApiError', 'SFA lifecycle conflict'),
            },
          },
          put: {
            tags: ['Observations'],
            operationId: 'saveSfaObservationDraft',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SfaObservationSaveDraftCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('SfaObservationResponse'),
              ...errorResponses,
              '409': jsonResponse('ApiError', 'SFA lifecycle conflict'),
            },
          },
        },
      '/organizations/{organizationId}/observation-assignments/{assignmentId}/sfa-observation/complete':
        {
          post: {
            tags: ['Observations'],
            operationId: 'completeSfaObservation',
            parameters: [
              organizationParameter,
              assignmentParameter,
              csrfParameter,
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SfaObservationCompleteCommand',
                  },
                },
              },
            },
            responses: {
              '200': jsonResponse('SfaObservationResponse'),
              ...errorResponses,
              '409': jsonResponse('ApiError', 'SFA lifecycle conflict'),
            },
          },
        },
      '/organizations/{organizationId}/students/{studentId}/sfa-observations': {
        get: {
          tags: ['Observations'],
          operationId: 'listStudentSfaObservations',
          parameters: [organizationParameter, studentParameter],
          responses: {
            '200': jsonResponse('SfaObservationHistoryResponse'),
            ...errorResponses,
          },
        },
      },
      '/organizations/{organizationId}/students/{studentId}/sfa-observations/reference':
        {
          get: {
            tags: ['Observations'],
            operationId: 'getStudentSfaReference',
            parameters: [organizationParameter, studentParameter],
            responses: {
              '200': jsonResponse('SfaObservationReferenceResponse'),
              ...errorResponses,
            },
          },
        },
      '/organizations/{organizationId}/ieps': {
        get: {
          tags: ['IEPs'],
          operationId: 'listIeps',
          parameters: [
            organizationParameter,
            ...['studentId', 'academicYearId', 'semesterId'].map((name) => ({
              name,
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'uuid' },
            })),
            {
              name: 'state',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: [
                  'DRAFT',
                  'PRINCIPAL_REVIEW',
                  'COORDINATOR_REVIEW',
                  'DIRECTOR_APPROVAL',
                  'APPROVED',
                  'ACTIVE',
                  'ARCHIVED',
                ],
              },
            },
          ],
          responses: {
            '200': jsonResponse('IepsResponse'),
            ...errorResponses,
          },
        },
        post: {
          tags: ['IEPs'],
          operationId: 'createIep',
          parameters: [organizationParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IepCreateCommand' },
              },
            },
          },
          responses: {
            '201': jsonResponse('IepMutationResponse', 'IEP draft created'),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'IEP content conflict'),
          },
        },
      },
      '/organizations/{organizationId}/ieps/{iepId}': {
        get: {
          tags: ['IEPs'],
          operationId: 'getIep',
          parameters: [
            organizationParameter,
            {
              name: 'iepId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': jsonResponse('IepDetailResponse'),
            ...errorResponses,
          },
        },
        put: {
          tags: ['IEPs'],
          operationId: 'updateIepDraft',
          description: 'Replaces the full authored aggregate for a DRAFT IEP.',
          parameters: [
            organizationParameter,
            {
              name: 'iepId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            csrfParameter,
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IepUpdateCommand' },
              },
            },
          },
          responses: {
            '200': jsonResponse('IepMutationResponse'),
            ...errorResponses,
            '409': jsonResponse('ApiError', 'IEP version or content conflict'),
          },
        },
      },
      '/organizations/{organizationId}/ieps/{iepId}/submit': iepWorkflowPath(
        'submitIep',
        'IepWorkflowCommand',
        'Submit a DRAFT IEP for coordinator review.',
      ),
      '/organizations/{organizationId}/ieps/{iepId}/coordinator-review':
        iepWorkflowPath(
          'reviewIepAsCoordinator',
          'IepReviewCommand',
          'Approve an IEP for director approval or return it to draft.',
        ),
      '/organizations/{organizationId}/ieps/{iepId}/director-review':
        iepWorkflowPath(
          'reviewIepAsDirector',
          'IepReviewCommand',
          'Approve an IEP or return it to coordinator review.',
        ),
      '/organizations/{organizationId}/ieps/{iepId}/activate': iepWorkflowPath(
        'activateIep',
        'IepWorkflowCommand',
        'Activate an approved IEP and archive any prior active replacement.',
      ),
      '/organizations/{organizationId}/ieps/{iepId}/archive': iepWorkflowPath(
        'archiveIep',
        'IepWorkflowCommand',
        'Archive an active IEP.',
      ),
      '/organizations/{organizationId}/classes/{classId}/attendance': {
        get: {
          tags: ['Attendance'],
          operationId: 'getAttendanceRoster',
          parameters: [
            organizationParameter,
            classParameter,
            schoolDateParameter,
          ],
          responses: {
            '200': jsonResponse('AttendanceRosterResponse'),
            ...errorResponses,
          },
        },
        put: {
          tags: ['Attendance'],
          operationId: 'saveAttendanceRoster',
          parameters: [organizationParameter, classParameter, csrfParameter],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AttendanceBulkSaveCommand',
                },
              },
            },
          },
          responses: {
            '200': jsonResponse('AttendanceBulkSaveResponse'),
            ...errorResponses,
            '409': {
              description: 'Optimistic concurrency conflict',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiError' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: Object.fromEntries(
        Object.entries(components).map(([name, schema]) => [
          name,
          zodToJsonSchema(schema),
        ]),
      ),
    },
  };
}

export function serializedOpenApiDocument(): string {
  return `${JSON.stringify(generateOpenApiDocument(), null, 2)}\n`;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  const output = resolve(process.cwd(), '../../docs/api/openapi.json');
  writeFileSync(output, serializedOpenApiDocument());
  console.log(`Wrote ${output}`);
}
