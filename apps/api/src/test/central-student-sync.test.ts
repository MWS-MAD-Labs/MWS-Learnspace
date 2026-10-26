import { describe, expect, it, vi } from 'vitest';
import {
  dayOf,
  genderOf,
  guardiansOf,
  studentNumberOf,
  type CentralRosterRow,
  type CentralStudentRow,
} from '../service/central-student-sync-service.js';
import {
  refuseFieldsWhenManaged,
  refuseWhenManaged,
} from '../middleware/managed-by-central.js';

const student = (
  extra: Partial<CentralStudentRow> = {},
): CentralStudentRow => ({
  id: 'stu-1',
  nis: '2601',
  nisn: '0012345678',
  full_name: 'Ayu',
  nick_name: 'Ayu',
  email: 'ayu@example.test',
  gender: 'FEMALE',
  status: 'ACTIVE',
  ...extra,
});

const roster = (extra: Partial<CentralRosterRow> = {}): CentralRosterRow => ({
  email: 'ayu@example.test',
  photo_url: null,
  birth_date: '2015-03-04T00:00:00.000Z',
  address: ' Jl. Mawar 1 ',
  father_name: 'Budi',
  father_phone: '0811',
  father_email: null,
  mother_name: 'Sari',
  mother_phone: null,
  mother_email: 'sari@example.test',
  ...extra,
});

describe('a student as Central describes it', () => {
  it('takes the student number from the NIS, then the NISN, then the Central id', () => {
    expect(studentNumberOf(student())).toBe('2601');
    expect(studentNumberOf(student({ nis: null }))).toBe('0012345678');
    expect(studentNumberOf(student({ nis: ' ', nisn: null }))).toBe(
      'central-stu-1',
    );
  });

  it('reads gender and the birth day', () => {
    expect(genderOf('male')).toBe('MALE');
    expect(genderOf('FEMALE')).toBe('FEMALE');
    expect(genderOf('other')).toBe('UNSPECIFIED');
    expect(dayOf('2015-03-04T17:00:00.000Z').toISOString()).toBe(
      '2015-03-04T00:00:00.000Z',
    );
  });

  it('makes the father the primary contact, and the mother when there is no father', () => {
    const both = guardiansOf(roster());
    expect(both).toEqual([
      {
        relationship: 'Father',
        name: 'Budi',
        phone: '0811',
        email: null,
        address: 'Jl. Mawar 1',
        isPrimary: true,
      },
      {
        relationship: 'Mother',
        name: 'Sari',
        phone: null,
        email: 'sari@example.test',
        address: null,
        isPrimary: false,
      },
    ]);
    const motherOnly = guardiansOf(roster({ father_name: ' ' }));
    expect(motherOnly).toHaveLength(1);
    expect(motherOnly[0]).toMatchObject({
      relationship: 'Mother',
      isPrimary: true,
      address: 'Jl. Mawar 1',
    });
    expect(
      guardiansOf(roster({ father_name: null, mother_name: null })),
    ).toEqual([]);
  });
});

describe('refusing what Central owns', () => {
  const run = (
    handler: ReturnType<typeof refuseWhenManaged>,
    body?: unknown,
  ) => {
    const next = vi.fn();
    handler({ body } as never, {} as never, next);
    return next.mock.calls[0][0];
  };

  it('refuses outright only when Central manages the data', () => {
    expect(run(refuseWhenManaged(true))).toMatchObject({
      status: 409,
      code: 'MANAGED_BY_CENTRAL',
    });
    expect(run(refuseWhenManaged(false))).toBeUndefined();
  });

  it('refuses a field Central owns and lets the rest through', () => {
    const guard = refuseFieldsWhenManaged(true, ['fullName', 'status']);
    expect(run(guard, { fullName: 'X' })).toMatchObject({ status: 409 });
    expect(run(guard, { currentPlacement: 'Room 2' })).toBeUndefined();
    expect(run(guard, undefined)).toBeUndefined();
    expect(
      run(refuseFieldsWhenManaged(false, ['fullName']), { fullName: 'X' }),
    ).toBeUndefined();
  });
});
