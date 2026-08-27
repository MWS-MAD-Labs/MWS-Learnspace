import { createHash, randomUUID } from 'node:crypto';
import {
  Prisma,
  PrismaClient,
  type AccommodationCategory,
  type Gender,
  type ObservationStatus,
  type ServiceType,
  type WorkflowState,
} from '@prisma/client';
import type { LearnspaceExportV1 } from '@learnspace/contracts';
import {
  appendReportAchievementEvents,
  projectIepGoals,
} from '../iepGoalProjection.js';
import type { ImportManifest } from './importManifest.js';
import {
  emptyCounts,
  type ImportCounts,
  type ImportMode,
  type ImportReport,
} from './importTypes.js';

type LegacyRecord = Record<string, unknown> & { id: string };
type Tx = Prisma.TransactionClient;

class DryRunRollback extends Error {
  constructor(readonly collections: Record<string, ImportCounts>) {
    super('Dry run completed; rolling back transaction.');
    this.name = 'DryRunRollback';
  }
}

const uuidFromSource = (namespace: string, sourceId: string) => {
  const hex = createHash('sha256')
    .update(`${namespace}:${sourceId}`)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hex[12] = '5';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};
const dateOnly = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be a YYYY-MM-DD date.`);
  }
  return new Date(`${value}T00:00:00.000Z`);
};
const dateTime = (value: unknown, label: string) => {
  if (typeof value !== 'string')
    throw new Error(`${label} must be a timestamp.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is invalid.`);
  return parsed;
};
const requiredString = (record: LegacyRecord, field: string) => {
  const value = record[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${record.id}.${field} is required for database import.`);
  }
  return value;
};
const optionalString = (value: unknown) =>
  typeof value === 'string' && value !== '' ? value : undefined;
const requiredArray = (record: LegacyRecord, field: string): LegacyRecord[] => {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new Error(`${record.id}.${field} must be an array.`);
  }
  return value as LegacyRecord[];
};
const requiredNumber = (record: LegacyRecord, field: string) => {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${record.id}.${field} must be a finite number.`);
  }
  return value;
};
const requiredInt = (record: LegacyRecord, field: string) => {
  const value = requiredNumber(record, field);
  if (!Number.isInteger(value)) {
    throw new Error(`${record.id}.${field} must be an integer.`);
  }
  return value;
};
const requiredYear = (record: LegacyRecord, field: string) => {
  const value = requiredString(record, field);
  if (!/^\d{4}$/.test(value)) {
    throw new Error(`${record.id}.${field} must be a four-digit year.`);
  }
  return Number.parseInt(value, 10);
};
const jsonValue = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;
const gender = (value: string): Gender =>
  ({
    Male: 'MALE',
    Female: 'FEMALE',
    Other: 'OTHER',
    Unspecified: 'UNSPECIFIED',
  })[value] as Gender;
const observationStatus = (value: unknown): ObservationStatus => {
  if (value === 'Completed' || value === 'COMPLETED') return 'COMPLETED';
  if (value === 'Pending' || value === 'PENDING') return 'PENDING';
  return 'IN_PROGRESS';
};
const serviceType = (value: unknown): ServiceType => {
  if (value === '1:1') return 'INDIVIDUAL';
  if (value === 'Group') return 'GROUP';
  if (value === 'Consultation') return 'CONSULTATION';
  throw new Error(`Unsupported IEP service type "${String(value)}".`);
};
const workflowState = (value: unknown): WorkflowState => {
  if (value === 'Active') return 'ACTIVE';
  if (value === 'Archived') return 'ARCHIVED';
  if (value === 'Approved') return 'APPROVED';
  if (value === 'In Review' || value === 'Completed')
    return 'COORDINATOR_REVIEW';
  return 'DRAFT';
};
const addCount = (
  collections: Record<string, ImportCounts>,
  collection: string,
  outcome: keyof ImportCounts,
  amount = 1,
) => {
  collections[collection] ??= emptyCounts();
  collections[collection][outcome] += amount;
};
const totalCounts = (collections: Record<string, ImportCounts>) =>
  Object.values(collections).reduce((total, value) => {
    total.accepted += value.accepted;
    total.transformed += value.transformed;
    total.skipped += value.skipped;
    total.rejected += value.rejected;
    return total;
  }, emptyCounts());

async function validateTargets(
  prisma: PrismaClient | Tx,
  document: LearnspaceExportV1,
  manifest: ImportManifest,
) {
  if (document.organization.sourceKey !== manifest.sourceKey) {
    throw new Error('Export source key does not match the import manifest.');
  }
  if (
    document.organization.targetOrganizationId !== null &&
    document.organization.targetOrganizationId !== manifest.targetOrganizationId
  ) {
    throw new Error('Export target organization does not match the manifest.');
  }
  const organization = await prisma.organization.findUnique({
    where: { id: manifest.targetOrganizationId },
  });
  if (!organization || organization.status !== 'ACTIVE') {
    throw new Error('Target organization is missing or disabled.');
  }
  const operator = await prisma.user.findUnique({
    where: { id: manifest.operatorUserId },
  });
  if (!operator || operator.status !== 'ACTIVE') {
    throw new Error('Import operator is missing or disabled.');
  }
  for (const sourceUser of document.records.users) {
    const mapping = manifest.users[sourceUser.id];
    if (!mapping)
      throw new Error(`Missing user mapping for "${sourceUser.id}".`);
    const membership = await prisma.membership.findUnique({
      where: { id: mapping.targetMembershipId },
      include: { user: true },
    });
    if (
      !membership ||
      membership.organizationId !== manifest.targetOrganizationId ||
      membership.userId !== mapping.targetUserId ||
      membership.status !== 'ACTIVE' ||
      membership.user.status !== 'ACTIVE'
    ) {
      throw new Error(
        `Invalid target user/membership mapping for "${sourceUser.id}".`,
      );
    }
  }
  const mappingChecks: Array<
    [
      string,
      Record<string, string>,
      (id: string) => Promise<{ organizationId: string } | null>,
    ]
  > = [
    [
      'academic year',
      manifest.academicYears,
      (id) => prisma.academicYear.findUnique({ where: { id } }),
    ],
    [
      'semester',
      manifest.semesters,
      (id) => prisma.semester.findUnique({ where: { id } }),
    ],
    ['unit', manifest.units, (id) => prisma.unit.findUnique({ where: { id } })],
    [
      'grade',
      manifest.grades,
      (id) => prisma.grade.findUnique({ where: { id } }),
    ],
    [
      'class',
      manifest.classes,
      (id) => prisma.schoolClass.findUnique({ where: { id } }),
    ],
    [
      'subject',
      manifest.subjects,
      (id) => prisma.subject.findUnique({ where: { id } }),
    ],
  ];
  for (const [label, mappings, lookup] of mappingChecks) {
    for (const [source, id] of Object.entries(mappings)) {
      const target = await lookup(id);
      if (!target || target.organizationId !== manifest.targetOrganizationId) {
        throw new Error(`Invalid ${label} mapping for "${source}".`);
      }
    }
  }
}

async function persistExport(
  tx: Tx,
  document: LearnspaceExportV1,
  manifest: ImportManifest,
  collections: Record<string, ImportCounts>,
) {
  const organizationId = manifest.targetOrganizationId;
  const namespace = `${organizationId}:${manifest.sourceKey}`;
  const userId = (sourceId: string) => {
    const value = manifest.users[sourceId]?.targetUserId;
    if (!value) throw new Error(`Missing user mapping for "${sourceId}".`);
    return value;
  };
  const membershipId = (sourceId: string) => {
    const value = manifest.users[sourceId]?.targetMembershipId;
    if (!value)
      throw new Error(`Missing membership mapping for "${sourceId}".`);
    return value;
  };
  const mapped = (
    map: Record<string, string>,
    source: string,
    label: string,
  ) => {
    const value = map[source];
    if (!value) throw new Error(`Missing ${label} mapping for "${source}".`);
    return value;
  };

  document.records.users.forEach(() =>
    addCount(collections, 'users', 'skipped'),
  );

  const studentIds = new Map<string, string>();
  for (const student of document.records.students as LegacyRecord[]) {
    const id = uuidFromSource(namespace, `student:${student.id}`);
    studentIds.set(student.id, id);
    await tx.student.create({
      data: {
        id,
        organizationId,
        studentNumber: requiredString(student, 'studentNumber'),
        fullName: requiredString(student, 'fullName'),
        nickname: optionalString(student.nickname),
        gender: gender(requiredString(student, 'gender')),
        dateOfBirth: dateOnly(student.dateOfBirth, `${student.id}.dateOfBirth`),
        address: optionalString(student.address),
        specialNeedsFlag: student.specialNeedsFlag === true,
        status: student.active === false ? 'DISABLED' : 'ACTIVE',
        avatarUrl: optionalString(student.avatarUrl),
        primaryClassification:
          optionalString(student.primaryClassification) ??
          optionalString(student.primaryDiagnosis),
        currentPlacement: optionalString(student.currentPlacement),
        createdAt: dateTime(
          student.createdAt ?? document.exportedAt,
          `${student.id}.createdAt`,
        ),
        updatedAt: dateTime(
          student.updatedAt ?? document.exportedAt,
          `${student.id}.updatedAt`,
        ),
      },
    });
    addCount(collections, 'students', 'accepted');
    addCount(collections, 'students', 'transformed');

    const academicYearId = mapped(
      manifest.academicYears,
      manifest.enrollmentAcademicYear,
      'academic year',
    );
    const academicYear = await tx.academicYear.findUniqueOrThrow({
      where: { id: academicYearId },
    });
    const classId = mapped(
      manifest.classes,
      requiredString(student, 'className'),
      'class',
    );
    await tx.enrollment.create({
      data: {
        id: uuidFromSource(namespace, `enrollment:${student.id}`),
        organizationId,
        studentId: id,
        academicYearId,
        classId,
        startsOn: academicYear.startsOn,
      },
    });
    addCount(collections, 'enrollments', 'accepted');

    const guardianName = optionalString(student.parentGuardianName);
    if (guardianName) {
      await tx.guardianContact.create({
        data: {
          id: uuidFromSource(namespace, `guardian:${student.id}`),
          organizationId,
          studentId: id,
          name: guardianName,
          relationship: 'Parent/Guardian',
          phone: optionalString(student.parentGuardianPhone),
          address: optionalString(student.address),
          isPrimary: true,
        },
      });
      addCount(collections, 'guardianContacts', 'accepted');
      addCount(collections, 'guardianContacts', 'transformed');
    }
    const gpkSourceId = optionalString(student.assignedGPKTeacherId);
    if (gpkSourceId) {
      const sourceUser = (document.records.users as LegacyRecord[]).find(
        ({ id: sourceUserId }) => sourceUserId === gpkSourceId,
      );
      await tx.staffStudentAssignment.create({
        data: {
          id: uuidFromSource(namespace, `gpk:${student.id}`),
          organizationId,
          membershipId: membershipId(gpkSourceId),
          studentId: id,
          roleContext: 'GPK',
          startsOn: academicYear.startsOn,
          maxCaseload:
            typeof student.gpkMaxCaseload === 'number'
              ? student.gpkMaxCaseload
              : typeof sourceUser?.maxSpecialNeedsStudents === 'number'
                ? sourceUser.maxSpecialNeedsStudents
                : undefined,
        },
      });
      addCount(collections, 'staffAssignments', 'accepted');
    }
  }

  const journeyIds = new Map<string, string>();
  for (const journey of document.records.learningJourneys as LegacyRecord[]) {
    const id = uuidFromSource(namespace, `journey:${journey.id}`);
    journeyIds.set(journey.id, id);
    await tx.learningJourney.create({
      data: {
        id,
        organizationId,
        title: requiredString(journey, 'title'),
        academicYearId: mapped(
          manifest.academicYears,
          requiredString(journey, 'academicYear'),
          'academic year',
        ),
        semesterId: mapped(
          manifest.semesters,
          `${requiredString(journey, 'academicYear')}::${requiredString(journey, 'semester')}`,
          'semester',
        ),
        unitId: mapped(manifest.units, requiredString(journey, 'unit'), 'unit'),
        gradeId: mapped(
          manifest.grades,
          requiredString(journey, 'grade'),
          'grade',
        ),
        subjectId: mapped(
          manifest.subjects,
          requiredString(journey, 'subject'),
          'subject',
        ),
        state: workflowState(journey.status),
        createdById: userId(requiredString(journey, 'createdBy')),
        updatedById: userId(requiredString(journey, 'updatedBy')),
        createdAt: dateTime(journey.createdAt, `${journey.id}.createdAt`),
        updatedAt: dateTime(journey.updatedAt, `${journey.id}.updatedAt`),
      },
    });
    addCount(collections, 'learningJourneys', 'accepted');
    addCount(collections, 'learningJourneys', 'transformed');
    for (const ownerSourceId of journey.ownerIds as string[]) {
      await tx.learningJourneyOwner.create({
        data: {
          learningJourneyId: id,
          membershipId: membershipId(ownerSourceId),
        },
      });
      addCount(collections, 'learningJourneyOwners', 'accepted');
    }
    for (const [projectIndex, project] of requiredArray(
      journey,
      'projects',
    ).entries()) {
      const projectId = uuidFromSource(
        namespace,
        `journey-project:${project.id}`,
      );
      const startsOn =
        project.startDate ??
        `${requiredString(project, 'startMonth').slice(0, 7)}-01`;
      const endDateValue =
        project.endDate ??
        `${requiredString(project, 'endMonth').slice(0, 7)}-28`;
      await tx.learningJourneyProject.create({
        data: {
          id: projectId,
          learningJourneyId: id,
          title: requiredString(project, 'title'),
          description: requiredString(project, 'description'),
          startsOn: dateOnly(startsOn, `${project.id}.startsOn`),
          endsOn: dateOnly(endDateValue, `${project.id}.endsOn`),
          color: optionalString(project.color),
          position:
            typeof project.order === 'number' ? project.order : projectIndex,
        },
      });
      addCount(collections, 'learningJourneyProjects', 'accepted');
      for (const [goalIndex, goal] of requiredArray(
        project,
        'learningGoals',
      ).entries()) {
        await tx.learningGoal.create({
          data: {
            id: uuidFromSource(namespace, `learning-goal:${goal.id}`),
            projectId,
            description: requiredString(goal, 'description'),
            position: typeof goal.order === 'number' ? goal.order : goalIndex,
          },
        });
        addCount(collections, 'learningGoals', 'accepted');
      }
      for (const [connectionIndex, connection] of requiredArray(
        project,
        'crossCurricularConnections',
      ).entries()) {
        await tx.crossCurricularConnection.create({
          data: {
            id: uuidFromSource(namespace, `connection:${connection.id}`),
            projectId,
            subject: requiredString(connection, 'subject'),
            description: requiredString(connection, 'description'),
            position: connectionIndex,
          },
        });
        addCount(collections, 'crossCurricularConnections', 'accepted');
      }
    }
  }

  const definitionIds = new Map<string, string>();
  const definitionByType = new Map<string, string>();
  for (const definition of document.records
    .observationDefinitions as LegacyRecord[]) {
    const id = uuidFromSource(namespace, `definition:${definition.id}`);
    const type = requiredString(definition, 'type') as
      'FEDC' | 'SENSORY_PROFILE' | 'SFA';
    definitionIds.set(definition.id, id);
    definitionByType.set(type, id);
    const sourceVersion = requiredString(definition, 'version');
    const parsedVersion = Number.parseInt(sourceVersion, 10);
    if (!Number.isInteger(parsedVersion)) {
      throw new Error(`${definition.id}.version must start with an integer.`);
    }
    await tx.observationDefinition.create({
      data: {
        id,
        organizationId,
        definitionKey: definition.id,
        version: parsedVersion,
        type,
        title: requiredString(definition, 'title'),
        framework: optionalString(definition.framework),
        description: optionalString(definition.description),
        targetAges: optionalString(definition.targetAges),
        defaultFrequency: optionalString(definition.defaultFrequency),
        body: jsonValue(definition),
        isActive: definition.isActive === true,
        publishedAt: dateTime(
          definition.lastUpdated,
          `${definition.id}.lastUpdated`,
        ),
      },
    });
    addCount(collections, 'observationDefinitions', 'accepted');
    addCount(collections, 'observationDefinitions', 'transformed');
  }

  const assignmentIds = new Map<string, string>();
  const assignmentByRecord = new Map<
    string,
    { id: string; definitionId: string }
  >();
  for (const assignment of document.records
    .observationAssignments as LegacyRecord[]) {
    const id = uuidFromSource(namespace, `assignment:${assignment.id}`);
    const definitionId = definitionByType.get(
      requiredString(assignment, 'instrumentType'),
    );
    if (!definitionId)
      throw new Error(`No definition for assignment "${assignment.id}".`);
    assignmentIds.set(assignment.id, id);
    await tx.observationAssignment.create({
      data: {
        id,
        organizationId,
        studentId: studentIds.get(requiredString(assignment, 'studentId'))!,
        definitionId,
        assignedToId: membershipId(
          requiredString(assignment, 'assignedToUserId'),
        ),
        assignedById: optionalString(assignment.assignedByUserId)
          ? userId(requiredString(assignment, 'assignedByUserId'))
          : optionalString(assignment.assignedByCoordinatorId)
            ? userId(requiredString(assignment, 'assignedByCoordinatorId'))
            : undefined,
        academicYear: requiredString(assignment, 'academicYear'),
        dueDate: dateOnly(assignment.dueDate, `${assignment.id}.dueDate`),
        priority: optionalString(assignment.priority),
        notes: optionalString(assignment.notes),
        status: observationStatus(assignment.status),
        assignedAt: dateTime(
          assignment.assignedDate ??
            assignment.createdAt ??
            document.exportedAt,
          `${assignment.id}.assignedAt`,
        ),
        completedAt: optionalString(assignment.completedAt)
          ? dateTime(assignment.completedAt, `${assignment.id}.completedAt`)
          : undefined,
      },
    });
    const recordId = optionalString(assignment.recordId);
    if (recordId) assignmentByRecord.set(recordId, { id, definitionId });
    addCount(collections, 'observationAssignments', 'accepted');
    addCount(collections, 'observationAssignments', 'transformed');
  }

  const ensureObservationAssignment = async (
    record: LegacyRecord,
    type: 'FEDC' | 'SENSORY_PROFILE' | 'SFA',
    observedOn: Date,
  ) => {
    const existing = assignmentByRecord.get(record.id);
    if (existing) return existing;
    const definitionId = definitionByType.get(type);
    if (!definitionId)
      throw new Error(`No ${type} definition for "${record.id}".`);
    const id = uuidFromSource(namespace, `synthetic-assignment:${record.id}`);
    await tx.observationAssignment.create({
      data: {
        id,
        organizationId,
        studentId: studentIds.get(requiredString(record, 'studentId'))!,
        definitionId,
        assignedToId: membershipId(requiredString(record, 'observerId')),
        assignedById: userId(requiredString(record, 'observerId')),
        academicYear: record.recordYear
          ? String(record.recordYear)
          : String(observedOn.getUTCFullYear()),
        dueDate: observedOn,
        status: observationStatus(record.status),
        assignedAt: dateTime(record.createdAt, `${record.id}.createdAt`),
        completedAt:
          record.status === 'Completed'
            ? dateTime(record.updatedAt, `${record.id}.updatedAt`)
            : undefined,
        notes:
          'Synthesized during legacy import because no assignment was stored.',
      },
    });
    addCount(collections, 'observationAssignments', 'accepted');
    addCount(collections, 'observationAssignments', 'transformed');
    return { id, definitionId };
  };

  for (const record of document.records.fedcObservations as LegacyRecord[]) {
    const observedOn = dateOnly(
      record.observationDate,
      `${record.id}.observationDate`,
    );
    const assignment = await ensureObservationAssignment(
      record,
      'FEDC',
      observedOn,
    );
    await tx.fEDCObservation.create({
      data: {
        id: uuidFromSource(namespace, `fedc:${record.id}`),
        organizationId,
        assignmentId: assignment.id,
        studentId: studentIds.get(requiredString(record, 'studentId'))!,
        definitionId: assignment.definitionId,
        observerId: userId(requiredString(record, 'observerId')),
        observationDate: observedOn,
        status: observationStatus(record.status),
        responses: jsonValue(record.responses),
        milestoneScores: jsonValue(record.milestoneScores),
        totalScore: requiredInt(record, 'totalScore'),
        maxPossibleScore: requiredInt(record, 'maxPossibleScore'),
        notes: optionalString(record.notes),
        completedAt:
          record.status === 'Completed'
            ? dateTime(record.updatedAt, `${record.id}.updatedAt`)
            : undefined,
        createdAt: dateTime(record.createdAt, `${record.id}.createdAt`),
        updatedAt: dateTime(record.updatedAt, `${record.id}.updatedAt`),
      },
    });
    addCount(collections, 'fedcObservations', 'accepted');
  }
  for (const record of document.records
    .sensoryProfileObservations as LegacyRecord[]) {
    const observedOn = dateOnly(
      record.observationDate,
      `${record.id}.observationDate`,
    );
    const assignment = await ensureObservationAssignment(
      record,
      'SENSORY_PROFILE',
      observedOn,
    );
    await tx.sensoryProfileObservation.create({
      data: {
        id: uuidFromSource(namespace, `sensory:${record.id}`),
        organizationId,
        assignmentId: assignment.id,
        studentId: studentIds.get(requiredString(record, 'studentId'))!,
        definitionId: assignment.definitionId,
        observerId: userId(requiredString(record, 'observerId')),
        observationDate: observedOn,
        status: observationStatus(record.status),
        teacherContactFrequency: optionalString(record.teacherContactFrequency),
        teacherContactLength: optionalString(record.teacherContactLength),
        responses: jsonValue(record.responses),
        sectionScores: jsonValue(record.sectionScores),
        totalRawScore: requiredInt(record, 'totalRawScore'),
        notes: optionalString(record.notes),
        completedAt:
          record.status === 'Completed'
            ? dateTime(record.updatedAt, `${record.id}.updatedAt`)
            : undefined,
        createdAt: dateTime(record.createdAt, `${record.id}.createdAt`),
        updatedAt: dateTime(record.updatedAt, `${record.id}.updatedAt`),
      },
    });
    addCount(collections, 'sensoryProfileObservations', 'accepted');
  }
  for (const record of document.records.sfaObservations as LegacyRecord[]) {
    const assessedOn = dateOnly(
      record.assessmentDate,
      `${record.id}.assessmentDate`,
    );
    const assignment = await ensureObservationAssignment(
      record,
      'SFA',
      assessedOn,
    );
    const notes = [
      record.participationNotes,
      record.taskSupportNotes,
      record.adaptationsNotes,
    ]
      .filter(
        (value): value is string => typeof value === 'string' && value !== '',
      )
      .join('\n');
    await tx.sFAObservation.create({
      data: {
        id: uuidFromSource(namespace, `sfa:${record.id}`),
        organizationId,
        assignmentId: assignment.id,
        studentId: studentIds.get(requiredString(record, 'studentId'))!,
        definitionId: assignment.definitionId,
        observerId: userId(requiredString(record, 'observerId')),
        assessmentDate: assessedOn,
        observationDate: optionalString(record.observationDate)
          ? dateOnly(record.observationDate, `${record.id}.observationDate`)
          : undefined,
        status: observationStatus(record.status),
        programRecommendation: requiredString(record, 'programRecommendation'),
        primaryLanguage: optionalString(record.primaryLanguage),
        writingMethod: optionalString(record.writingMethod),
        mobilityMethod: optionalString(record.mobilityMethod),
        conditionsAffectingPerformance: optionalString(
          record.conditionsAffectingPerformance,
        ),
        respondents: jsonValue(record.respondents),
        participationScores: jsonValue(record.participationScores),
        settings: record.settings ? jsonValue(record.settings) : undefined,
        taskSupports: jsonValue(record.taskSupports),
        activityPerformance: jsonValue(record.activityPerformance),
        adaptations: jsonValue(record.adaptations),
        participationAverage: new Prisma.Decimal(
          requiredNumber(record, 'participationAverage'),
        ),
        totalParticipationRawScore:
          typeof record.totalParticipationRawScore === 'number'
            ? record.totalParticipationRawScore
            : undefined,
        notes: notes || undefined,
        completedAt:
          record.status === 'Completed'
            ? dateTime(record.updatedAt, `${record.id}.updatedAt`)
            : undefined,
        createdAt: dateTime(record.createdAt, `${record.id}.createdAt`),
        updatedAt: dateTime(record.updatedAt, `${record.id}.updatedAt`),
      },
    });
    addCount(collections, 'sfaObservations', 'accepted');
  }

  const iepIds = new Map<string, string>();
  const goalIds = new Map<string, string>();
  for (const iep of document.records.ieps as LegacyRecord[]) {
    const id = uuidFromSource(namespace, `iep:${iep.id}`);
    iepIds.set(iep.id, id);
    const academicYearId = mapped(
      manifest.academicYears,
      requiredString(iep, 'academicYear'),
      'academic year',
    );
    const academicYear = await tx.academicYear.findUniqueOrThrow({
      where: { id: academicYearId },
    });
    const parentApproval = iep.parentApproval as Record<string, unknown>;
    await tx.iEP.create({
      data: {
        id,
        organizationId,
        studentId: studentIds.get(requiredString(iep, 'studentId'))!,
        academicYearId,
        semesterId: optionalString(iep.semester)
          ? mapped(
              manifest.semesters,
              `${requiredString(iep, 'academicYear')}::${requiredString(iep, 'semester')}`,
              'semester',
            )
          : undefined,
        state: workflowState(iep.status),
        consideration: requiredString(iep, 'consideration'),
        primaryClassification: requiredString(iep, 'primaryClassification'),
        currentPlacement: requiredString(iep, 'currentPlacement'),
        homePartnershipSupport: optionalString(iep.homePartnershipSupport),
        homePartnershipRecommendations: optionalString(
          iep.homePartnershipRecommendations,
        ),
        progressMeasurementMethods: jsonValue(iep.progressMeasurementMethods),
        parentCommunicationMethods: jsonValue(iep.parentCommunicationMethods),
        parentApproved: parentApproval?.agreed === true,
        parentName: optionalString(parentApproval?.parentName),
        parentApprovalDate: optionalString(parentApproval?.date)
          ? dateOnly(parentApproval.date, `${iep.id}.parentApproval.date`)
          : undefined,
        startsOn: academicYear.startsOn,
        endsOn: academicYear.endsOn,
        createdById: userId(requiredString(iep, 'createdBy')),
        updatedById: userId(requiredString(iep, 'updatedBy')),
        createdAt: dateTime(iep.createdAt, `${iep.id}.createdAt`),
        updatedAt: dateTime(iep.updatedAt, `${iep.id}.updatedAt`),
      },
    });
    addCount(collections, 'ieps', 'accepted');
    addCount(collections, 'ieps', 'transformed');
    for (const [index, member] of requiredArray(iep, 'teamMembers').entries()) {
      await tx.iEPTeamMember.create({
        data: {
          id: uuidFromSource(namespace, `iep-member:${member.id}`),
          iepId: id,
          role: requiredString(member, 'role'),
          name: requiredString(member, 'name'),
          initials: optionalString(member.initial),
          confirmed: member.confirmed === true,
          position: index,
        },
      });
      addCount(collections, 'iepTeamMembers', 'accepted');
    }
    for (const [index, area] of requiredArray(
      iep,
      'performanceAreas',
    ).entries()) {
      await tx.iEPPerformanceArea.create({
        data: {
          id: uuidFromSource(namespace, `iep-area:${area.id}`),
          iepId: id,
          name: requiredString(area, 'name'),
          category: requiredString(area, 'category'),
          strengths: requiredString(area, 'strengths'),
          needs: requiredString(area, 'needs'),
          impactOfNeed: optionalString(area.impactOfNeed),
          informationSource: optionalString(area.informationSource),
          assessmentProcess: optionalString(area.assessmentProcess),
          assessmentDate: optionalString(area.assessmentDate)
            ? dateOnly(area.assessmentDate, `${area.id}.assessmentDate`)
            : undefined,
          summaryOfResults: optionalString(area.summaryOfResults),
          position: index,
        },
      });
      addCount(collections, 'iepPerformanceAreas', 'accepted');
    }
    let accommodationPosition = 0;
    const createAccommodation = async (
      category: AccommodationCategory,
      description: string,
      subject?: string,
      code?: string,
    ) => {
      await tx.iEPAccommodation.create({
        data: {
          id: uuidFromSource(
            namespace,
            `iep-accommodation:${iep.id}:${category}:${accommodationPosition}`,
          ),
          iepId: id,
          category,
          subject,
          code,
          description,
          position: accommodationPosition++,
        },
      });
      addCount(collections, 'iepAccommodations', 'accepted');
    };
    for (const [subject, code] of Object.entries(
      (iep.academicAccommodations ?? {}) as Record<string, unknown>,
    )) {
      if (typeof code === 'string' && code !== '')
        await createAccommodation(
          'ACADEMIC',
          `Legacy academic accommodation code: ${code}`,
          subject,
          code,
        );
    }
    for (const [field, category] of [
      ['instructionalAccommodations', 'INSTRUCTIONAL'],
      ['environmentalAccommodations', 'ENVIRONMENTAL'],
      ['assessmentAccommodations', 'ASSESSMENT'],
    ] as const) {
      for (const description of (iep[field] as string[]) ?? [])
        await createAccommodation(category, description);
    }
    for (const [index, goal] of requiredArray(iep, 'goals').entries()) {
      const goalId = uuidFromSource(namespace, `iep-goal:${goal.id}`);
      goalIds.set(`${iep.id}:${goal.id}`, goalId);
      await tx.iEPGoal.create({
        data: {
          id: goalId,
          iepId: id,
          code: requiredString(goal, 'code'),
          performanceArea: requiredString(goal, 'performanceArea'),
          longTermGoal: optionalString(goal.longTermGoal),
          shortTermGoal: optionalString(goal.shortTermGoal),
          measurableGoal: requiredString(goal, 'measurableGoal'),
          strategyActivity: optionalString(goal.strategyActivity),
          learningExpectation: optionalString(goal.learningExpectation),
          learningStrategy: optionalString(goal.learningStrategy),
          evaluationMethod: requiredString(goal, 'evaluationMethod'),
          schedule: requiredString(goal, 'schedule'),
          targetDate: optionalString(goal.targetDate)
            ? dateOnly(goal.targetDate, `${goal.id}.targetDate`)
            : undefined,
          active: goal.active !== false,
          position: index,
        },
      });
      addCount(collections, 'iepGoals', 'accepted');
    }
    for (const [index, service] of requiredArray(
      iep,
      'serviceSchedule',
    ).entries()) {
      await tx.iEPServiceSchedule.create({
        data: {
          id: uuidFromSource(namespace, `iep-service:${service.id}`),
          iepId: id,
          serviceName: requiredString(service, 'serviceName'),
          type: serviceType(service.type),
          duration: requiredString(service, 'duration'),
          frequency: optionalString(service.frequency),
          location: requiredString(service, 'location'),
          days: optionalString(service.days),
          position: index,
        },
      });
      addCount(collections, 'iepServices', 'accepted');
    }
  }

  for (const report of document.records.weeklyReports as LegacyRecord[]) {
    const id = uuidFromSource(namespace, `weekly-report:${report.id}`);
    const sourceIepId = requiredString(report, 'iepId');
    const targetIepId = iepIds.get(sourceIepId);
    if (!targetIepId) throw new Error(`Unknown IEP "${sourceIepId}".`);
    const teacherId = userId(requiredString(report, 'teacherId'));
    await tx.weeklyReport.create({
      data: {
        id,
        organizationId,
        studentId: studentIds.get(requiredString(report, 'studentId'))!,
        iepId: targetIepId,
        year: requiredYear(report, 'year'),
        weekNumber: Number(report.weekNumber),
        weekStart: dateOnly(report.weekStart, `${report.id}.weekStart`),
        weekEnd: dateOnly(report.weekEnd, `${report.id}.weekEnd`),
        teacherId,
        state: workflowState(report.status),
        descriptiveObservation: requiredString(
          report,
          'descriptiveObservation',
        ),
        homeConnection: requiredString(report, 'homeConnection'),
        createdAt: dateTime(report.createdAt, `${report.id}.createdAt`),
        updatedAt: dateTime(report.updatedAt, `${report.id}.updatedAt`),
      },
    });
    addCount(collections, 'weeklyReports', 'accepted');
    addCount(collections, 'weeklyReports', 'transformed');
    const projectionGoalIds: string[] = [];
    const achievementSources: Array<{
      goalId: string;
      markedAchievedThisWeek: boolean;
      achievedDate?: string;
      achievedNote?: string;
    }> = [];
    for (const progress of requiredArray(report, 'goalProgress')) {
      const goalId = goalIds.get(
        `${sourceIepId}:${requiredString(progress, 'goalId')}`,
      );
      if (!goalId) throw new Error(`Unknown IEP goal "${progress.goalId}".`);
      projectionGoalIds.push(goalId);
      achievementSources.push({
        goalId,
        markedAchievedThisWeek: progress.markedAchievedThisWeek === true,
        achievedDate: optionalString(progress.achievedDate),
        achievedNote: optionalString(progress.achievedNote),
      });
      await tx.weeklyGoalProgress.create({
        data: {
          id: uuidFromSource(
            namespace,
            `weekly-progress:${report.id}:${progress.goalId}`,
          ),
          weeklyReportId: id,
          iepId: targetIepId,
          goalId,
          addressedThisWeek: progress.addressedThisWeek === true,
          rating:
            typeof progress.rating === 'number' ? progress.rating : undefined,
          notes: optionalString(progress.notes),
          markedAchievedThisWeek: progress.markedAchievedThisWeek === true,
          achievedDate: optionalString(progress.achievedDate)
            ? dateOnly(
                progress.achievedDate,
                `${progress.id ?? progress.goalId}.achievedDate`,
              )
            : undefined,
          achievedNote: optionalString(progress.achievedNote),
        },
      });
      addCount(collections, 'weeklyGoalProgress', 'accepted');
    }
    await appendReportAchievementEvents(tx, {
      organizationId,
      iepId: targetIepId,
      weeklyReportId: id,
      sourceReportVersion: 1,
      actorId: teacherId,
      occurredAt: dateTime(report.updatedAt, `${report.id}.updatedAt`),
      current: achievementSources,
    });
    await projectIepGoals(tx, targetIepId, projectionGoalIds);
  }
}

const findImportRun = async (
  prisma: PrismaClient | Tx,
  manifest: ImportManifest,
  exportSha256: string,
) => {
  const previous = await prisma.importRun.findFirst({
    where: {
      organizationId: manifest.targetOrganizationId,
      sourceKey: manifest.sourceKey,
    },
  });
  if (previous && previous.exportSha256 !== exportSha256) {
    throw new Error(
      'A different export has already been applied for this source key.',
    );
  }
  return previous;
};

const addRepeatSkips = (
  document: LearnspaceExportV1,
  collections: Record<string, ImportCounts>,
) => {
  const sourceCollections = document.records as unknown as Record<
    string,
    unknown[]
  >;
  for (const [name, records] of Object.entries(sourceCollections)) {
    addCount(collections, name, 'skipped', records.length);
  }
};

export async function importExport(options: {
  prisma: PrismaClient;
  document: LearnspaceExportV1;
  exportSha256: string;
  manifest: ImportManifest;
  mode: ImportMode;
}): Promise<ImportReport> {
  const { prisma, document, exportSha256, manifest, mode } = options;
  const collections: Record<string, ImportCounts> = {};

  if (mode === 'dry-run') {
    let existingImportRunId: string | undefined;
    try {
      await prisma.$transaction(
        async (tx) => {
          await validateTargets(tx, document, manifest);
          const existing = await findImportRun(tx, manifest, exportSha256);
          if (existing) {
            existingImportRunId = existing.id;
            addRepeatSkips(document, collections);
            return;
          }
          await persistExport(tx, document, manifest, collections);
          throw new DryRunRollback(collections);
        },
        { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 120_000 },
      );
    } catch (error) {
      if (!(error instanceof DryRunRollback)) throw error;
    }
    return {
      mode,
      format: document.format,
      version: document.version,
      exportSha256,
      organizationId: manifest.targetOrganizationId,
      sourceKey: manifest.sourceKey,
      counts: totalCounts(collections),
      collections,
      diagnostics: [],
      importRunId: existingImportRunId,
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await validateTargets(tx, document, manifest);
        const existing = await findImportRun(tx, manifest, exportSha256);
        if (existing) return { run: existing, repeated: true } as const;

        await persistExport(tx, document, manifest, collections);
        const counts = totalCounts(collections);
        const run = await tx.importRun.create({
          data: {
            organizationId: manifest.targetOrganizationId,
            sourceKey: manifest.sourceKey,
            format: document.format,
            formatVersion: document.version,
            exportSha256,
            operatorId: manifest.operatorUserId,
            acceptedCount: counts.accepted,
            transformedCount: counts.transformed,
            skippedCount: counts.skipped,
            rejectedCount: counts.rejected,
            summary: jsonValue(collections),
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: manifest.targetOrganizationId,
            actorId: manifest.operatorUserId,
            action: 'PROTOTYPE_IMPORT_APPLIED',
            targetType: 'ImportRun',
            targetId: run.id,
            requestId: randomUUID(),
            result: 'SUCCEEDED',
            metadata: { source: 'learnspace-export-v1' },
          },
        });
        return { run, repeated: false } as const;
      },
      { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 120_000 },
    );

    if (result.repeated) addRepeatSkips(document, collections);
    return {
      mode,
      format: document.format,
      version: document.version,
      exportSha256,
      organizationId: manifest.targetOrganizationId,
      sourceKey: manifest.sourceKey,
      counts: totalCounts(collections),
      collections,
      diagnostics: [],
      importRunId: result.run.id,
    };
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002' || prismaError.code === 'P2034') {
      const existing = await findImportRun(prisma, manifest, exportSha256);
      if (existing) {
        addRepeatSkips(document, collections);
        return {
          mode,
          format: document.format,
          version: document.version,
          exportSha256,
          organizationId: manifest.targetOrganizationId,
          sourceKey: manifest.sourceKey,
          counts: totalCounts(collections),
          collections,
          diagnostics: [],
          importRunId: existing.id,
        };
      }
    }
    throw error;
  }
}
