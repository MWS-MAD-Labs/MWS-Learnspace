import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  attendanceBulkSaveCommandSchema,
  attendanceRosterResponseSchema,
} from '@learnspace/contracts';
import {
  generateOpenApiDocument,
  serializedOpenApiDocument,
} from '../src/openapi.js';

const ids = {
  organization: '11111111-1111-4111-8111-111111111111',
  class: '22222222-2222-4222-8222-222222222222',
  grade: '33333333-3333-4333-8333-333333333333',
  unit: '44444444-4444-4444-8444-444444444444',
  student: '55555555-5555-4555-8555-555555555555',
  enrollment: '66666666-6666-4666-8666-666666666666',
};

describe('OpenAPI contract', () => {
  it('matches the committed generated specification', () => {
    const committed = readFileSync(
      resolve(process.cwd(), '../../docs/api/openapi.json'),
      'utf8',
    );
    expect(committed).toBe(serializedOpenApiDocument());
    expect(generateOpenApiDocument().openapi).toBe('3.1.0');
  });

  it('uses the runtime schemas for attendance request and response examples', () => {
    expect(
      attendanceBulkSaveCommandSchema.parse({
        schoolDate: '2026-08-24',
        expectedVersion: '0:none',
        records: [{ studentId: ids.student, status: 'PRESENT' }],
      }),
    ).toBeTruthy();
    expect(
      attendanceRosterResponseSchema.parse({
        data: {
          organizationId: ids.organization,
          class: {
            id: ids.class,
            organizationId: ids.organization,
            unitId: ids.unit,
            gradeId: ids.grade,
            code: 'G1-A',
            name: 'Grade 1A',
          },
          schoolDate: '2026-08-24',
          version: '0:none',
          roster: [
            {
              student: {
                id: ids.student,
                organizationId: ids.organization,
                studentNumber: '001',
                fullName: 'Student One',
                nickname: null,
                avatarUrl: null,
              },
              enrollmentId: ids.enrollment,
              attendance: null,
            },
          ],
        },
      }),
    ).toBeTruthy();
  });
});
