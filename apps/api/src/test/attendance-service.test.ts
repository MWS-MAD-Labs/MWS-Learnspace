import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { attendanceVersion } from '../model/attendance-model.js';
import { createAttendanceService } from '../service/attendance-service.js';

describe('attendance service', () => {
  it('builds optimistic versions from record count and latest update', () => {
    expect(attendanceVersion([])).toBe('0:none');
    expect(
      attendanceVersion([
        { updatedAt: new Date('2026-08-24T09:00:00.000Z') },
        { updatedAt: new Date('2026-08-24T10:30:00.000Z') },
      ]),
    ).toBe('2:2026-08-24T10:30:00.000Z');
  });

  it('translates serializable transaction conflicts to the attendance conflict', async () => {
    const prisma = {
      $transaction: async () => {
        throw { code: 'P2034' };
      },
    } as unknown as PrismaClient;
    const service = createAttendanceService(prisma);

    await expect(
      service.saveRoster({
        organizationId: '00000000-0000-4000-8000-000000000001',
        classId: '00000000-0000-4000-8000-000000000002',
        actorId: '00000000-0000-4000-8000-000000000003',
        requestId: 'request-id',
        membership: {
          organizationId: '00000000-0000-4000-8000-000000000001',
          role: 'GRADE_TEACHER',
          unitIds: [],
          gradeIds: ['00000000-0000-4000-8000-000000000004'],
          subjectIds: [],
          assignedStudentIds: [],
        },
        command: {
          schoolDate: '2026-08-24',
          expectedVersion: '0:none',
          records: [
            {
              studentId: '00000000-0000-4000-8000-000000000005',
              status: 'PRESENT',
            },
          ],
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 409,
        code: 'ATTENDANCE_VERSION_CONFLICT',
      }),
    );
  });
});
