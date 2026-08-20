import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../../src/database.js';
import { seedDatabase } from '../../../../prisma/seed.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
let prisma: PrismaClient;

integration('PostgreSQL schema lifecycle', () => {
  beforeAll(async () => {
    execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy', '--schema', '../../prisma/schema.prisma'],
      { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
    );
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('reports the migrated database ready', async () => {
    const database = createDatabase(databaseUrl!, prisma);
    await expect(database.check()).resolves.toBeUndefined();
  });

  it('enforces organization-scoped identity uniqueness', async () => {
    const suffix = crypto.randomUUID();
    const organization = await prisma.organization.create({
      data: { slug: `integration-${suffix}`, name: 'Integration School' },
    });
    await prisma.student.create({
      data: {
        organizationId: organization.id,
        studentNumber: '001',
        fullName: 'Student One',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
      },
    });

    await expect(
      prisma.student.create({
        data: {
          organizationId: organization.id,
          studentNumber: '001',
          fullName: 'Duplicate Student',
          dateOfBirth: new Date('2019-01-02T00:00:00.000Z'),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('retains historical enrollments and rejects duplicate attendance', async () => {
    const suffix = crypto.randomUUID();
    const organization = await prisma.organization.create({
      data: { slug: `history-${suffix}`, name: 'History School' },
    });
    const user = await prisma.user.create({
      data: { email: `teacher-${suffix}@example.test`, displayName: 'Teacher' },
    });
    const recorderMembership = await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'GRADE_TEACHER',
      },
    });
    const year = await prisma.academicYear.create({
      data: {
        organizationId: organization.id,
        name: `2026-${suffix}`,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    const unit = await prisma.unit.create({
      data: {
        organizationId: organization.id,
        code: `U-${suffix}`,
        name: `Unit ${suffix}`,
      },
    });
    const grade = await prisma.grade.create({
      data: {
        organizationId: organization.id,
        unitId: unit.id,
        code: `G-${suffix}`,
        name: 'Grade',
        position: 1,
      },
    });
    const firstClass = await prisma.schoolClass.create({
      data: {
        organizationId: organization.id,
        unitId: unit.id,
        gradeId: grade.id,
        code: `A-${suffix}`,
        name: 'Class A',
      },
    });
    const secondClass = await prisma.schoolClass.create({
      data: {
        organizationId: organization.id,
        unitId: unit.id,
        gradeId: grade.id,
        code: `B-${suffix}`,
        name: 'Class B',
      },
    });
    const student = await prisma.student.create({
      data: {
        organizationId: organization.id,
        studentNumber: `S-${suffix}`,
        fullName: 'History Student',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
      },
    });
    const firstEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        academicYearId: year.id,
        classId: firstClass.id,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    await prisma.enrollment.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        academicYearId: year.id,
        classId: secondClass.id,
        startsOn: new Date('2027-01-01T00:00:00.000Z'),
      },
    });
    expect(
      await prisma.enrollment.count({ where: { studentId: student.id } }),
    ).toBe(2);

    const attendance = {
      organizationId: organization.id,
      studentId: student.id,
      enrollmentId: firstEnrollment.id,
      classId: firstClass.id,
      schoolDate: new Date('2026-08-19T00:00:00.000Z'),
      status: 'PRESENT' as const,
      recordedById: user.id,
    };
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: attendance,
    });
    await expect(
      prisma.attendanceRecord.create({ data: attendance }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await prisma.membership.update({
      where: { id: recorderMembership.id },
      data: { status: 'DISABLED' },
    });
    await expect(
      prisma.attendanceRecord.update({
        where: { id: attendanceRecord.id },
        data: { notes: 'Historical recorder attribution is preserved.' },
      }),
    ).resolves.toMatchObject({
      id: attendanceRecord.id,
      recordedById: user.id,
      notes: 'Historical recorder attribution is preserved.',
    });
  });

  it('prevents weekly progress from referencing a goal on another IEP', async () => {
    const suffix = crypto.randomUUID();
    const organization = await prisma.organization.create({
      data: { slug: `iep-${suffix}`, name: 'IEP School' },
    });
    const user = await prisma.user.create({
      data: { email: `iep-${suffix}@example.test`, displayName: 'IEP Teacher' },
    });
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'SPECIAL_ED_TEACHER',
      },
    });
    const year = await prisma.academicYear.create({
      data: {
        organizationId: organization.id,
        name: `IEP-${suffix}`,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    const student = await prisma.student.create({
      data: {
        organizationId: organization.id,
        studentNumber: `IEP-${suffix}`,
        fullName: 'IEP Student',
        dateOfBirth: new Date('2018-01-01T00:00:00.000Z'),
      },
    });
    const iepData = {
      organizationId: organization.id,
      studentId: student.id,
      academicYearId: year.id,
      consideration: 'Demo',
      primaryClassification: 'Demo',
      currentPlacement: 'Demo',
      progressMeasurementMethods: [],
      parentCommunicationMethods: [],
      startsOn: new Date('2026-07-01T00:00:00.000Z'),
      endsOn: new Date('2027-06-30T00:00:00.000Z'),
      createdById: user.id,
      updatedById: user.id,
    };
    const firstIep = await prisma.iEP.create({ data: iepData });
    const secondIep = await prisma.iEP.create({ data: iepData });
    const goal = await prisma.iEPGoal.create({
      data: {
        iepId: secondIep.id,
        code: 'G1',
        performanceArea: 'Academic',
        measurableGoal: 'Demo goal',
        evaluationMethod: 'Observation',
        schedule: 'Weekly',
      },
    });
    const report = await prisma.weeklyReport.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        iepId: firstIep.id,
        year: 2026,
        weekNumber: 1,
        weekStart: new Date('2026-08-17T00:00:00.000Z'),
        weekEnd: new Date('2026-08-21T00:00:00.000Z'),
        teacherId: user.id,
        descriptiveObservation: 'Demo',
        homeConnection: 'Demo',
      },
    });

    await expect(
      prisma.weeklyGoalProgress.create({
        data: {
          weeklyReportId: report.id,
          iepId: firstIep.id,
          goalId: goal.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });

    await expect(
      prisma.goalAchievementEvent.create({
        data: {
          organizationId: organization.id,
          iepId: firstIep.id,
          goalId: goal.id,
          weeklyReportId: report.id,
          actorId: user.id,
          achieved: true,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects cross-organization references across tenant aggregates', async () => {
    const suffix = crypto.randomUUID();
    const [organizationA, organizationB] = await Promise.all([
      prisma.organization.create({
        data: { slug: `tenant-a-${suffix}`, name: 'Tenant A' },
      }),
      prisma.organization.create({
        data: { slug: `tenant-b-${suffix}`, name: 'Tenant B' },
      }),
    ]);
    const user = await prisma.user.create({
      data: { email: `tenant-${suffix}@example.test`, displayName: 'Teacher' },
    });
    const membershipA = await prisma.membership.create({
      data: {
        organizationId: organizationA.id,
        userId: user.id,
        role: 'GRADE_TEACHER',
      },
    });
    const yearA = await prisma.academicYear.create({
      data: {
        organizationId: organizationA.id,
        name: `A-${suffix}`,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    const unitA = await prisma.unit.create({
      data: {
        organizationId: organizationA.id,
        code: `UA-${suffix}`,
        name: `Unit A ${suffix}`,
      },
    });
    const unitB = await prisma.unit.create({
      data: {
        organizationId: organizationB.id,
        code: `UB-${suffix}`,
        name: `Unit B ${suffix}`,
      },
    });
    const gradeA = await prisma.grade.create({
      data: {
        organizationId: organizationA.id,
        unitId: unitA.id,
        code: `GA-${suffix}`,
        name: 'Grade A',
        position: 1,
      },
    });
    const classA = await prisma.schoolClass.create({
      data: {
        organizationId: organizationA.id,
        unitId: unitA.id,
        gradeId: gradeA.id,
        code: `CA-${suffix}`,
        name: 'Class A',
      },
    });
    const subjectA = await prisma.subject.create({
      data: {
        organizationId: organizationA.id,
        code: `SA-${suffix}`,
        name: `Subject A ${suffix}`,
      },
    });
    const subjectB = await prisma.subject.create({
      data: {
        organizationId: organizationB.id,
        code: `SB-${suffix}`,
        name: `Subject B ${suffix}`,
      },
    });
    const semesterA = await prisma.semester.create({
      data: {
        organizationId: organizationA.id,
        academicYearId: yearA.id,
        name: 'Semester 1',
        position: 1,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    const studentA = await prisma.student.create({
      data: {
        organizationId: organizationA.id,
        studentNumber: `A-${suffix}`,
        fullName: 'Student A',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
      },
    });
    const studentB = await prisma.student.create({
      data: {
        organizationId: organizationB.id,
        studentNumber: `B-${suffix}`,
        fullName: 'Student B',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
      },
    });
    const enrollmentA = await prisma.enrollment.create({
      data: {
        organizationId: organizationA.id,
        studentId: studentA.id,
        academicYearId: yearA.id,
        classId: classA.id,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
      },
    });

    await expect(
      prisma.grade.create({
        data: {
          organizationId: organizationA.id,
          unitId: unitB.id,
          code: `BAD-G-${suffix}`,
          name: 'Bad Grade',
          position: 2,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.membershipUnit.create({
        data: { membershipId: membershipA.id, unitId: unitB.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.enrollment.create({
        data: {
          organizationId: organizationA.id,
          studentId: studentB.id,
          academicYearId: yearA.id,
          classId: classA.id,
          startsOn: new Date('2026-08-01T00:00:00.000Z'),
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.guardianContact.create({
        data: {
          organizationId: organizationA.id,
          studentId: studentB.id,
          name: 'Wrong Tenant Guardian',
          relationship: 'Guardian',
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.staffStudentAssignment.create({
        data: {
          organizationId: organizationA.id,
          membershipId: membershipA.id,
          studentId: studentB.id,
          roleContext: 'GPK',
          startsOn: new Date('2026-07-01T00:00:00.000Z'),
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.attendanceRecord.create({
        data: {
          organizationId: organizationA.id,
          studentId: studentB.id,
          enrollmentId: enrollmentA.id,
          classId: classA.id,
          schoolDate: new Date('2026-08-20T00:00:00.000Z'),
          status: 'PRESENT',
          recordedById: user.id,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.learningJourney.create({
        data: {
          organizationId: organizationA.id,
          title: 'Cross-tenant journey',
          academicYearId: yearA.id,
          semesterId: semesterA.id,
          unitId: unitA.id,
          gradeId: gradeA.id,
          subjectId: subjectB.id,
          createdById: user.id,
          updatedById: user.id,
        },
      }),
    ).rejects.toThrow();

    const definitionA = await prisma.observationDefinition.create({
      data: {
        organizationId: organizationA.id,
        definitionKey: `fedc-${suffix}`,
        version: 1,
        type: 'FEDC',
        title: 'FEDC',
        body: {},
      },
    });
    await expect(
      prisma.observationAssignment.create({
        data: {
          organizationId: organizationA.id,
          studentId: studentB.id,
          definitionId: definitionA.id,
          assignedToId: membershipA.id,
          academicYear: '2026-2027',
          dueDate: new Date('2026-09-01T00:00:00.000Z'),
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.iEP.create({
        data: {
          organizationId: organizationA.id,
          studentId: studentB.id,
          academicYearId: yearA.id,
          consideration: 'Cross-tenant',
          primaryClassification: 'Demo',
          currentPlacement: 'Demo',
          progressMeasurementMethods: [],
          parentCommunicationMethods: [],
          startsOn: new Date('2026-07-01T00:00:00.000Z'),
          endsOn: new Date('2027-06-30T00:00:00.000Z'),
          createdById: user.id,
          updatedById: user.id,
        },
      }),
    ).rejects.toThrow();

    const iepA = await prisma.iEP.create({
      data: {
        organizationId: organizationA.id,
        studentId: studentA.id,
        academicYearId: yearA.id,
        consideration: 'Tenant A',
        primaryClassification: 'Demo',
        currentPlacement: 'Demo',
        progressMeasurementMethods: [],
        parentCommunicationMethods: [],
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await expect(
      prisma.weeklyReport.create({
        data: {
          organizationId: organizationB.id,
          studentId: studentB.id,
          iepId: iepA.id,
          year: 2026,
          weekNumber: 2,
          weekStart: new Date('2026-08-24T00:00:00.000Z'),
          weekEnd: new Date('2026-08-28T00:00:00.000Z'),
          teacherId: user.id,
          descriptiveObservation: 'Cross-tenant',
          homeConnection: 'Cross-tenant',
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.workflowEvent.create({
        data: {
          organizationId: organizationB.id,
          aggregateType: 'IEP',
          aggregateId: iepA.id,
          fromState: 'DRAFT',
          toState: 'COORDINATOR_REVIEW',
          action: 'SUBMITTED',
          actorId: user.id,
        },
      }),
    ).rejects.toThrow();

    expect(subjectA.organizationId).toBe(organizationA.id);
  });

  it('requires tenant actors to have an active user and membership', async () => {
    const suffix = crypto.randomUUID();
    const [organizationA, organizationB] = await Promise.all([
      prisma.organization.create({
        data: { slug: `actor-a-${suffix}`, name: 'Actor Tenant A' },
      }),
      prisma.organization.create({
        data: { slug: `actor-b-${suffix}`, name: 'Actor Tenant B' },
      }),
    ]);
    const [
      noMembershipUser,
      foreignUser,
      disabledMembershipUser,
      disabledUser,
    ] = await Promise.all([
      prisma.user.create({
        data: {
          email: `none-${suffix}@example.test`,
          displayName: 'No Membership',
        },
      }),
      prisma.user.create({
        data: {
          email: `foreign-${suffix}@example.test`,
          displayName: 'Foreign Member',
        },
      }),
      prisma.user.create({
        data: {
          email: `disabled-membership-${suffix}@example.test`,
          displayName: 'Disabled Membership',
        },
      }),
      prisma.user.create({
        data: {
          email: `disabled-user-${suffix}@example.test`,
          displayName: 'Disabled User',
          status: 'DISABLED',
        },
      }),
    ]);
    await Promise.all([
      prisma.membership.create({
        data: {
          organizationId: organizationB.id,
          userId: foreignUser.id,
          role: 'SPECIALIST',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId: organizationA.id,
          userId: disabledMembershipUser.id,
          role: 'SPECIALIST',
          status: 'DISABLED',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId: organizationA.id,
          userId: disabledUser.id,
          role: 'SPECIALIST',
        },
      }),
    ]);

    const installedTriggers = await prisma.$queryRaw<Array<{ tgname: string }>>`
      SELECT tgname
      FROM pg_trigger
      WHERE NOT tgisinternal
        AND tgname = ANY(ARRAY[
          'AttendanceRecord_recorder_membership',
          'LearningJourney_creator_membership',
          'LearningJourney_updater_membership',
          'ObservationAssignment_assigner_membership',
          'FEDCObservation_observer_membership',
          'SensoryProfileObservation_observer_membership',
          'SFAObservation_observer_membership',
          'IEP_creator_membership',
          'IEP_updater_membership',
          'WeeklyReport_teacher_membership',
          'WorkflowEvent_actor_membership',
          'GoalAchievementEvent_actor_membership',
          'AuditEvent_actor_membership'
        ])
    `;
    expect(installedTriggers).toHaveLength(13);

    for (const actorId of [
      noMembershipUser.id,
      foreignUser.id,
      disabledMembershipUser.id,
      disabledUser.id,
    ]) {
      await expect(
        prisma.auditEvent.create({
          data: {
            organizationId: organizationA.id,
            actorId,
            action: 'ACTOR_MEMBERSHIP_TEST',
            targetType: 'Organization',
            targetId: organizationA.id,
            requestId: crypto.randomUUID(),
            result: 'DENIED',
          },
        }),
      ).rejects.toThrow();
    }

    const [membershipOwner, replacementUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `membership-owner-${suffix}@example.test`,
          displayName: 'Membership Owner',
        },
      }),
      prisma.user.create({
        data: {
          email: `membership-replacement-${suffix}@example.test`,
          displayName: 'Replacement User',
        },
      }),
    ]);
    const immutableMembership = await prisma.membership.create({
      data: {
        organizationId: organizationA.id,
        userId: membershipOwner.id,
        role: 'SPECIALIST',
      },
    });
    await expect(
      prisma.membership.update({
        where: { id: immutableMembership.id },
        data: { userId: replacementUser.id },
      }),
    ).rejects.toThrow();

    const auditActor = await prisma.user.create({
      data: {
        email: `audit-actor-${suffix}@example.test`,
        displayName: 'Audit Actor',
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: organizationA.id,
        userId: auditActor.id,
        role: 'SPECIALIST',
      },
    });
    await prisma.auditEvent.create({
      data: {
        organizationId: organizationA.id,
        actorId: auditActor.id,
        action: 'AUDIT_ACTOR_RESTRICT_TEST',
        targetType: 'Organization',
        targetId: organizationA.id,
        requestId: crypto.randomUUID(),
        result: 'SUCCEEDED',
      },
    });
    await expect(
      prisma.user.delete({ where: { id: auditActor.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('protects completed observations and used definitions', async () => {
    const suffix = crypto.randomUUID();
    const organization = await prisma.organization.create({
      data: { slug: `immutable-${suffix}`, name: 'Immutable School' },
    });
    const user = await prisma.user.create({
      data: {
        email: `immutable-${suffix}@example.test`,
        displayName: 'Observer',
      },
    });
    const membership = await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'SPECIALIST',
      },
    });
    const student = await prisma.student.create({
      data: {
        organizationId: organization.id,
        studentNumber: `IMM-${suffix}`,
        fullName: 'Immutable Student',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
      },
    });
    const definition = await prisma.observationDefinition.create({
      data: {
        organizationId: organization.id,
        definitionKey: `immutable-fedc-${suffix}`,
        version: 1,
        type: 'FEDC',
        title: 'Immutable FEDC',
        body: { items: [] },
      },
    });
    const assignment = await prisma.observationAssignment.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        definitionId: definition.id,
        assignedToId: membership.id,
        academicYear: '2026-2027',
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
      },
    });
    const observation = await prisma.fEDCObservation.create({
      data: {
        organizationId: organization.id,
        assignmentId: assignment.id,
        studentId: student.id,
        definitionId: definition.id,
        observerId: user.id,
        observationDate: new Date('2026-08-19T00:00:00.000Z'),
        status: 'COMPLETED',
        responses: {},
        milestoneScores: {},
        totalScore: 0,
        maxPossibleScore: 1,
        completedAt: new Date('2026-08-19T00:00:00.000Z'),
      },
    });

    await expect(
      prisma.fEDCObservation.update({
        where: { id: observation.id },
        data: { notes: 'Mutated' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.fEDCObservation.delete({ where: { id: observation.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.observationDefinition.update({
        where: { id: definition.id },
        data: { title: 'Mutated definition' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.observationDefinition.delete({ where: { id: definition.id } }),
    ).rejects.toThrow();

    const sensoryDefinition = await prisma.observationDefinition.create({
      data: {
        organizationId: organization.id,
        definitionKey: `immutable-sensory-${suffix}`,
        version: 1,
        type: 'SENSORY_PROFILE',
        title: 'Immutable Sensory Profile',
        body: { items: [] },
      },
    });
    const sensoryAssignment = await prisma.observationAssignment.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        definitionId: sensoryDefinition.id,
        assignedToId: membership.id,
        academicYear: '2026-2027',
        dueDate: new Date('2026-09-02T00:00:00.000Z'),
      },
    });
    const sensory = await prisma.sensoryProfileObservation.create({
      data: {
        organizationId: organization.id,
        assignmentId: sensoryAssignment.id,
        studentId: student.id,
        definitionId: sensoryDefinition.id,
        observerId: user.id,
        observationDate: new Date('2026-08-20T00:00:00.000Z'),
        status: 'COMPLETED',
        responses: {},
        sectionScores: {},
        totalRawScore: 0,
        completedAt: new Date('2026-08-20T00:00:00.000Z'),
      },
    });
    await expect(
      prisma.sensoryProfileObservation.update({
        where: { id: sensory.id },
        data: { notes: 'Mutated' },
      }),
    ).rejects.toThrow();

    const sfaDefinition = await prisma.observationDefinition.create({
      data: {
        organizationId: organization.id,
        definitionKey: `immutable-sfa-${suffix}`,
        version: 1,
        type: 'SFA',
        title: 'Immutable SFA',
        body: { items: [] },
      },
    });
    const sfaAssignment = await prisma.observationAssignment.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        definitionId: sfaDefinition.id,
        assignedToId: membership.id,
        academicYear: '2026-2027',
        dueDate: new Date('2026-09-03T00:00:00.000Z'),
      },
    });
    const sfa = await prisma.sFAObservation.create({
      data: {
        organizationId: organization.id,
        assignmentId: sfaAssignment.id,
        studentId: student.id,
        definitionId: sfaDefinition.id,
        observerId: user.id,
        assessmentDate: new Date('2026-08-21T00:00:00.000Z'),
        status: 'COMPLETED',
        programRecommendation: 'Regular',
        respondents: [],
        participationScores: {},
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
        participationAverage: 1,
        completedAt: new Date('2026-08-21T00:00:00.000Z'),
      },
    });
    await expect(
      prisma.sFAObservation.delete({ where: { id: sfa.id } }),
    ).rejects.toThrow();
  });

  it('seeds idempotently', async () => {
    await seedDatabase(prisma);
    await seedDatabase(prisma);
    expect(
      await prisma.organization.count({ where: { slug: 'learnspace-demo' } }),
    ).toBe(1);
    expect(
      await prisma.student.count({ where: { studentNumber: 'DEMO-001' } }),
    ).toBe(1);
  });
});
