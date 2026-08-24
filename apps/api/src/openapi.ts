import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ZodTypeAny } from 'zod';
import {
  academicYearsResponseSchema,
  apiErrorSchema,
  attendanceBulkSaveCommandSchema,
  attendanceBulkSaveResponseSchema,
  attendanceRosterResponseSchema,
  classesResponseSchema,
  currentSessionResponseSchema,
  gradesResponseSchema,
  organizationsResponseSchema,
  studentDetailResponseSchema,
  studentsResponseSchema,
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
  OrganizationsResponse: organizationsResponseSchema,
  AcademicYearsResponse: academicYearsResponseSchema,
  UnitsResponse: unitsResponseSchema,
  GradesResponse: gradesResponseSchema,
  ClassesResponse: classesResponseSchema,
  SubjectsResponse: subjectsResponseSchema,
  StudentsResponse: studentsResponseSchema,
  StudentDetailResponse: studentDetailResponseSchema,
  AttendanceRosterResponse: attendanceRosterResponseSchema,
  AttendanceBulkSaveCommand: attendanceBulkSaveCommandSchema,
  AttendanceBulkSaveResponse: attendanceBulkSaveResponseSchema,
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
    case 'ZodEffects':
      return zodToJsonSchema(definition.schema as ZodTypeAny);
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
const schoolDateParameter = {
  name: 'schoolDate',
  in: 'query',
  required: true,
  schema: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
};

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
      },
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
          parameters: [
            organizationParameter,
            classParameter,
            {
              name: 'x-csrf-token',
              in: 'header',
              required: true,
              schema: { type: 'string', minLength: 1 },
            },
          ],
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
