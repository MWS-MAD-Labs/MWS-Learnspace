import * as contracts from '@learnspace/contracts';
import { z } from 'zod';
import type {
  IEPGoal,
  IEPPerformanceArea,
  IEPRecord,
  IEPServiceScheduleItem,
  IEPTeamMember,
  WorkflowHistoryEntry,
} from '../types';
import { apiClient } from './apiClient';
import { learningJourneyService } from './learningJourneyService';

const fallbackIEPResponseSchema = z.object({ data: z.unknown() });
const fallbackIEPsResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({ count: z.number().int().nonnegative() }).optional(),
});
const fallbackIEPCommandSchema = z.object({}).passthrough();

type ContractSchemas = typeof contracts & {
  iepResponseSchema?: z.ZodType<{ data: unknown }>;
  iepDetailResponseSchema?: z.ZodType<{ data: unknown }>;
  iepMutationResponseSchema?: z.ZodType<{ data: unknown }>;
  iepsResponseSchema?: z.ZodType<{ data: unknown[]; meta?: { count: number } }>;
  iepListResponseSchema?: z.ZodType<{
    data: unknown[];
    meta?: { count: number };
  }>;
  iepCreateCommandSchema?: z.ZodType<IEPCommand>;
  iepPlanCreateCommandSchema?: z.ZodType<IEPCommand>;
  iepUpdateCommandSchema?: z.ZodType<IEPCommand>;
  iepPlanUpdateCommandSchema?: z.ZodType<IEPCommand>;
  iepWorkflowCommandSchema?: z.ZodType<{ expectedVersion: number }>;
  iepReviewCommandSchema?: z.ZodType<{
    expectedVersion: number;
    decision: 'APPROVE' | 'RETURN';
    comment?: string;
  }>;
};

const iepContracts = contracts as ContractSchemas;
const iepResponseSchema =
  iepContracts.iepMutationResponseSchema ??
  iepContracts.iepDetailResponseSchema ??
  iepContracts.iepResponseSchema ??
  fallbackIEPResponseSchema;
const iepsResponseSchema =
  iepContracts.iepsResponseSchema ??
  iepContracts.iepListResponseSchema ??
  fallbackIEPsResponseSchema;
const iepCreateCommandSchema =
  iepContracts.iepCreateCommandSchema ??
  iepContracts.iepPlanCreateCommandSchema ??
  fallbackIEPCommandSchema;
const iepUpdateCommandSchema =
  iepContracts.iepUpdateCommandSchema ??
  iepContracts.iepPlanUpdateCommandSchema ??
  fallbackIEPCommandSchema;
const iepWorkflowCommandSchema =
  iepContracts.iepWorkflowCommandSchema ??
  z.object({ expectedVersion: z.number().int().positive() }).strict();
const iepReviewCommandSchema =
  iepContracts.iepReviewCommandSchema ??
  z
    .object({
      expectedVersion: z.number().int().positive(),
      decision: z.enum(['APPROVE', 'RETURN']),
      comment: z.string().trim().min(1).optional(),
    })
    .strict();

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return arrayValue(value).filter(
    (item): item is string => typeof item === 'string',
  );
}

function dateOnly(value: unknown): string | undefined {
  const text = optionalString(value);
  return text ? text.slice(0, 10) : undefined;
}

function workflowStatus(
  state: string,
): Pick<
  IEPRecord,
  | 'status'
  | 'draftStatus'
  | 'coordinatorReviewStatus'
  | 'directorApprovalStatus'
> {
  if (state === 'DRAFT') {
    return {
      status: 'Draft',
      draftStatus: 'On Progress',
      coordinatorReviewStatus: 'Not Started',
      directorApprovalStatus: 'Not Started',
    };
  }
  if (state === 'COORDINATOR_REVIEW' || state === 'PRINCIPAL_REVIEW') {
    return {
      status: 'In Review',
      draftStatus: 'Done',
      coordinatorReviewStatus: 'On Progress',
      directorApprovalStatus: 'Not Started',
    };
  }
  if (state === 'DIRECTOR_APPROVAL') {
    return {
      status: 'In Review',
      draftStatus: 'Done',
      coordinatorReviewStatus: 'Done',
      directorApprovalStatus: 'On Progress',
    };
  }
  if (state === 'APPROVED' || state === 'ACTIVE') {
    return {
      status: state === 'ACTIVE' ? 'Active' : 'Approved',
      draftStatus: 'Done',
      coordinatorReviewStatus: 'Done',
      directorApprovalStatus: 'Done',
    };
  }
  return {
    status: 'Archived',
    draftStatus: 'Done',
    coordinatorReviewStatus: 'Done',
    directorApprovalStatus: 'Done',
  };
}

function serviceType(value: unknown): IEPServiceScheduleItem['type'] {
  if (value === 'INDIVIDUAL' || value === '1:1') return '1:1';
  if (value === 'GROUP' || value === 'Group') return 'Group';
  return 'Consultation';
}

function workflowHistory(value: unknown): WorkflowHistoryEntry[] {
  return arrayValue(value).map((raw, index) => {
    const event = asRecord(raw);
    const actor = asRecord(event.actor);
    return {
      id: stringValue(event.id, `iep-event-${index}`),
      stage: stringValue(
        event.fromState,
        'Draft',
      ) as WorkflowHistoryEntry['stage'],
      action: stringValue(event.action, 'Updated'),
      status: stringValue(event.toState, stringValue(event.status, 'Updated')),
      actorId: optionalString(actor.id) ?? optionalString(event.actorId),
      actorName:
        optionalString(actor.displayName) ?? optionalString(event.actorName),
      actorRole:
        optionalString(actor.roleTitle) ??
        optionalString(actor.role) ??
        optionalString(event.actorRole),
      timestamp: stringValue(
        event.occurredAt,
        stringValue(event.timestamp, new Date(0).toISOString()),
      ),
      comment: optionalString(event.comment),
      notes: optionalString(event.comment) ?? optionalString(event.notes),
    };
  });
}

function mapTeamMember(value: unknown, index: number): IEPTeamMember {
  const member = asRecord(value);
  return {
    id: stringValue(member.id, `team-member-${index}`),
    role: stringValue(member.role),
    name: stringValue(member.name),
    initial: stringValue(member.initials, stringValue(member.initial)),
    confirmed: booleanValue(member.confirmed),
  };
}

function mapPerformanceArea(value: unknown, index: number): IEPPerformanceArea {
  const area = asRecord(value);
  return {
    id: stringValue(area.id, `performance-area-${index}`),
    name: stringValue(area.name),
    category: stringValue(
      area.category,
      'Academic',
    ) as IEPPerformanceArea['category'],
    strengths: stringValue(area.strengths),
    needs: stringValue(area.needs),
    impactOfNeed: optionalString(area.impactOfNeed),
    informationSource: optionalString(area.informationSource),
    assessmentProcess: optionalString(area.assessmentProcess),
    assessmentDate: dateOnly(area.assessmentDate),
    summaryOfResults: optionalString(area.summaryOfResults),
  };
}

function mapGoal(value: unknown, index: number): IEPGoal {
  const goal = asRecord(value);
  const achievement = asRecord(goal.achievement);
  const latestProgress = asRecord(goal.latestProgress);
  const progressHistory = arrayValue(
    goal.progressHistory ?? goal.addressedHistory ?? goal.weeklyProgress,
  ).map((entry) => {
    const progress = asRecord(entry);
    return {
      reportId: stringValue(
        progress.reportId,
        stringValue(progress.weeklyReportId),
      ),
      weekNumber: numberValue(progress.weekNumber) ?? 0,
      weekRange: optionalString(progress.weekRange),
      date: stringValue(
        progress.date,
        stringValue(progress.addressedDate, stringValue(progress.weekEnd)),
      ),
      rating: numberValue(progress.rating) as 1 | 2 | 3 | 4 | 5 | undefined,
      notes: optionalString(progress.notes),
      markedAchieved: booleanValue(
        progress.markedAchieved,
        booleanValue(progress.achieved),
      ),
    };
  });
  const achieved = booleanValue(
    goal.achieved,
    booleanValue(achievement.achieved),
  );
  return {
    id: stringValue(goal.id, `goal-${index}`),
    code: stringValue(goal.code, `GL-${String(index + 1).padStart(3, '0')}`),
    performanceArea: stringValue(goal.performanceArea),
    longTermGoal: optionalString(goal.longTermGoal),
    shortTermGoal: optionalString(goal.shortTermGoal),
    measurableGoal: stringValue(goal.measurableGoal),
    strategyActivity: optionalString(goal.strategyActivity),
    learningExpectation: optionalString(goal.learningExpectation),
    learningStrategy: optionalString(goal.learningStrategy),
    evaluationMethod: stringValue(goal.evaluationMethod),
    schedule: stringValue(goal.schedule),
    targetDate: dateOnly(goal.targetDate),
    active: booleanValue(goal.active, true),
    achieved,
    achievedDate: dateOnly(goal.achievedDate ?? achievement.achievedAt),
    achievedNote:
      optionalString(goal.achievedNote) ?? optionalString(achievement.note),
    achievedInReportId:
      optionalString(goal.achievedInReportId) ??
      optionalString(achievement.weeklyReportId),
    lastAddressedDate: dateOnly(
      goal.lastAddressedDate ?? latestProgress.weekEnd ?? latestProgress.date,
    ),
    lastAddressedWeek:
      numberValue(goal.lastAddressedWeek) ??
      numberValue(latestProgress.weekNumber),
    lastAddressedRating: (numberValue(goal.lastAddressedRating) ??
      numberValue(latestProgress.rating)) as 1 | 2 | 3 | 4 | 5 | undefined,
    timesAddressed:
      numberValue(goal.timesAddressed) ??
      (progressHistory.length ? progressHistory.length : undefined),
    addressedHistory: progressHistory,
  };
}

function mapService(value: unknown, index: number): IEPServiceScheduleItem {
  const service = asRecord(value);
  return {
    id: stringValue(service.id, `service-${index}`),
    serviceName: stringValue(service.serviceName),
    type: serviceType(service.type),
    duration: stringValue(service.duration),
    frequency: optionalString(service.frequency),
    location: stringValue(service.location),
    days: optionalString(service.days),
  };
}

function accommodations(value: unknown) {
  const academicAccommodations: IEPRecord['academicAccommodations'] = {};
  const instructionalAccommodations: string[] = [];
  const environmentalAccommodations: string[] = [];
  const assessmentAccommodations: string[] = [];
  arrayValue(value).forEach((raw) => {
    const item = asRecord(raw);
    const category = stringValue(item.category);
    const description = stringValue(item.description);
    if (category === 'ACADEMIC') {
      const subject = optionalString(item.subject);
      const code = optionalString(item.code);
      if (subject && code) academicAccommodations[subject] = code;
    } else if (category === 'INSTRUCTIONAL' && description) {
      instructionalAccommodations.push(description);
    } else if (category === 'ENVIRONMENTAL' && description) {
      environmentalAccommodations.push(description);
    } else if (category === 'ASSESSMENT' && description) {
      assessmentAccommodations.push(description);
    }
  });
  return {
    academicAccommodations,
    instructionalAccommodations,
    environmentalAccommodations,
    assessmentAccommodations,
  };
}

export function mapIEPToLegacy(value: unknown): IEPRecord {
  const iep = asRecord(value);
  const academicYear = asRecord(iep.academicYear);
  const semester = asRecord(iep.semester);
  const student = asRecord(iep.student);
  const parentApproval = asRecord(iep.parentApproval);
  const accommodationFields = accommodations(iep.accommodations);
  const state = stringValue(iep.state, 'DRAFT');
  const academicYearName = stringValue(
    academicYear.name,
    stringValue(iep.academicYear, '2026-2027'),
  );
  return {
    id: stringValue(iep.id),
    organizationId: optionalString(iep.organizationId),
    version: numberValue(iep.version),
    studentId: stringValue(iep.studentId, stringValue(student.id)),
    studentName:
      optionalString(student.fullName) ?? optionalString(iep.studentName),
    grade: optionalString(iep.grade),
    academicYearId:
      optionalString(academicYear.id) ?? optionalString(iep.academicYearId),
    semesterId: optionalString(semester.id) ?? optionalString(iep.semesterId),
    state,
    year: stringValue(iep.year, academicYearName.slice(0, 4)),
    academicYear: academicYearName,
    semester: stringValue(semester.name, stringValue(iep.semester)),
    unit: stringValue(iep.unit),
    ...workflowStatus(state),
    assignedTeacherId: optionalString(iep.assignedTeacherId),
    assignedTeacherName: optionalString(iep.assignedTeacherName),
    workflowHistory: workflowHistory(iep.workflowEvents ?? iep.workflowHistory),
    consideration: stringValue(iep.consideration),
    primaryClassification: stringValue(iep.primaryClassification),
    currentPlacement: stringValue(iep.currentPlacement),
    teamMembers: arrayValue(iep.teamMembers).map(mapTeamMember),
    performanceAreas: arrayValue(iep.performanceAreas).map(mapPerformanceArea),
    ...accommodationFields,
    goals: arrayValue(iep.goals).map(mapGoal),
    serviceSchedule: arrayValue(iep.services ?? iep.serviceSchedule).map(
      mapService,
    ),
    progressMeasurementMethods: stringArray(iep.progressMeasurementMethods),
    parentCommunicationMethods: stringArray(iep.parentCommunicationMethods),
    homePartnershipSupport: stringValue(iep.homePartnershipSupport),
    homePartnershipRecommendations: stringValue(
      iep.homePartnershipRecommendations,
    ),
    parentApproval: {
      agreed: booleanValue(
        iep.parentApproved,
        booleanValue(parentApproval.agreed),
      ),
      parentName: stringValue(
        iep.parentName,
        stringValue(parentApproval.parentName),
      ),
      date: dateOnly(iep.parentApprovalDate ?? parentApproval.date) ?? '',
    },
    startsOn: dateOnly(iep.startsOn),
    endsOn: dateOnly(iep.endsOn),
    createdBy: stringValue(
      iep.createdById,
      stringValue(asRecord(iep.createdBy).id),
    ),
    createdAt: stringValue(iep.createdAt),
    updatedBy: stringValue(
      iep.updatedById,
      stringValue(asRecord(iep.updatedBy).id),
    ),
    updatedAt: stringValue(iep.updatedAt),
  };
}

function accommodationCommand(iep: IEPRecord) {
  const academic = Object.entries(iep.academicAccommodations).flatMap(
    ([subject, code]) =>
      code ? [{ category: 'ACADEMIC', subject, code, description: code }] : [],
  );
  return [
    ...academic,
    ...iep.instructionalAccommodations.map((description) => ({
      category: 'INSTRUCTIONAL',
      description,
    })),
    ...iep.environmentalAccommodations.map((description) => ({
      category: 'ENVIRONMENTAL',
      description,
    })),
    ...iep.assessmentAccommodations.map((description) => ({
      category: 'ASSESSMENT',
      description,
    })),
  ].map((item, position) => ({ ...item, position }));
}

export type IEPCommand = {
  expectedVersion?: number;
  studentId: string;
  academicYearId: string;
  semesterId: string | null;
  consideration: string;
  primaryClassification: string;
  currentPlacement: string;
  homePartnershipSupport?: string;
  homePartnershipRecommendations?: string;
  progressMeasurementMethods: string[];
  parentCommunicationMethods: string[];
  parentApproved: boolean;
  parentName?: string;
  parentApprovalDate: string | null;
  startsOn: string;
  endsOn: string;
  teamMembers: Array<Record<string, unknown>>;
  performanceAreas: Array<Record<string, unknown>>;
  accommodations: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
};

function parseCommand(schema: z.ZodTypeAny, command: IEPCommand): unknown {
  return schema.parse(command);
}

async function commandFor(
  organizationId: string,
  iep: IEPRecord,
  signal?: AbortSignal,
): Promise<IEPCommand> {
  let academicYearId = iep.academicYearId;
  let semesterId = iep.semesterId;
  let startsOn = iep.startsOn;
  let endsOn = iep.endsOn;
  if (
    !academicYearId ||
    !startsOn ||
    !endsOn ||
    (!semesterId && iep.semester)
  ) {
    const [academicYears, semesters] = await Promise.all([
      learningJourneyService.getAcademicYears(organizationId, signal),
      learningJourneyService.getSemesters(organizationId, signal),
    ]);
    const academicYear = academicYears.data.find(
      (item) => item.name === iep.academicYear,
    );
    academicYearId ??= academicYear?.id;
    const semester = semesters.data.find(
      (item) =>
        item.name === iep.semester &&
        (!academicYearId || item.academicYearId === academicYearId),
    );
    if (!startsOn || !endsOn) {
      startsOn = academicYear?.startsOn;
      endsOn = academicYear?.endsOn;
      semesterId = null;
    } else if (
      !semesterId &&
      semester &&
      startsOn >= semester.startsOn &&
      endsOn <= semester.endsOn
    ) {
      semesterId = semester.id;
    }
  }
  if (!academicYearId || !startsOn || !endsOn) {
    throw new Error('The IEP academic year could not be resolved.');
  }
  return {
    ...(iep.version !== undefined ? { expectedVersion: iep.version } : {}),
    studentId: iep.studentId,
    academicYearId,
    semesterId: semesterId ?? null,
    consideration: iep.consideration.trim(),
    primaryClassification: iep.primaryClassification.trim(),
    currentPlacement: iep.currentPlacement.trim(),
    homePartnershipSupport: iep.homePartnershipSupport || undefined,
    homePartnershipRecommendations:
      iep.homePartnershipRecommendations || undefined,
    progressMeasurementMethods: iep.progressMeasurementMethods,
    parentCommunicationMethods: iep.parentCommunicationMethods,
    parentApproved: iep.parentApproval.agreed,
    parentName: iep.parentApproval.parentName || undefined,
    parentApprovalDate: iep.parentApproval.date || null,
    startsOn,
    endsOn,
    teamMembers: iep.teamMembers.map((member, position) => ({
      role: member.role,
      name: member.name,
      initials: member.initial || undefined,
      confirmed: member.confirmed,
      position,
    })),
    performanceAreas: iep.performanceAreas.map((area, position) => ({
      name: area.name,
      category: area.category,
      strengths: area.strengths,
      needs: area.needs,
      impactOfNeed: area.impactOfNeed || undefined,
      informationSource: area.informationSource || undefined,
      assessmentProcess: area.assessmentProcess || undefined,
      assessmentDate: area.assessmentDate || undefined,
      summaryOfResults: area.summaryOfResults || undefined,
      position,
    })),
    accommodations: accommodationCommand(iep),
    goals: iep.goals.map((goal, position) => ({
      code: goal.code,
      performanceArea: goal.performanceArea,
      longTermGoal: goal.longTermGoal || undefined,
      shortTermGoal: goal.shortTermGoal || undefined,
      measurableGoal: goal.measurableGoal,
      strategyActivity: goal.strategyActivity || undefined,
      learningExpectation: goal.learningExpectation || undefined,
      learningStrategy: goal.learningStrategy || undefined,
      evaluationMethod: goal.evaluationMethod,
      schedule: goal.schedule,
      targetDate: goal.targetDate || undefined,
      position,
    })),
    services: iep.serviceSchedule.map((service, position) => ({
      serviceName: service.serviceName,
      type:
        service.type === '1:1'
          ? 'INDIVIDUAL'
          : service.type === 'Group'
            ? 'GROUP'
            : 'CONSULTATION',
      duration: service.duration,
      frequency: service.frequency || undefined,
      location: service.location,
      days: service.days || undefined,
      position,
    })),
  };
}

async function workflowCommand(
  organizationId: string,
  iepId: string,
  commandName: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<IEPRecord> {
  const response = await apiClient.request(
    `${organizationPath(organizationId)}/ieps/${encodeURIComponent(iepId)}/${commandName}`,
    {
      method: 'POST',
      body,
      schema: iepResponseSchema,
      signal,
    },
  );
  return mapIEPToLegacy(response.data);
}

export const iepService = {
  async getIEPs(
    organizationId: string,
    filters: { studentId?: string } = {},
    signal?: AbortSignal,
  ): Promise<IEPRecord[]> {
    const query = new URLSearchParams();
    if (filters.studentId) query.set('studentId', filters.studentId);
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/ieps${query.size ? `?${query}` : ''}`,
      { schema: iepsResponseSchema, signal },
    );
    return response.data.map(mapIEPToLegacy);
  },

  async getIEP(
    organizationId: string,
    iepId: string,
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/ieps/${encodeURIComponent(iepId)}`,
      { schema: iepResponseSchema, signal },
    );
    return mapIEPToLegacy(response.data);
  },

  async createIEP(
    organizationId: string,
    iep: IEPRecord,
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    const command = await commandFor(organizationId, iep, signal);
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/ieps`,
      {
        method: 'POST',
        body: parseCommand(iepCreateCommandSchema, command),
        schema: iepResponseSchema,
        signal,
      },
    );
    return mapIEPToLegacy(response.data);
  },

  async updateIEP(
    organizationId: string,
    iep: IEPRecord,
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    const command = await commandFor(organizationId, iep, signal);
    const response = await apiClient.request(
      `${organizationPath(organizationId)}/ieps/${encodeURIComponent(iep.id)}`,
      {
        method: 'PUT',
        body: parseCommand(iepUpdateCommandSchema, command),
        schema: iepResponseSchema,
        signal,
      },
    );
    return mapIEPToLegacy(response.data);
  },

  async submitIEP(
    organizationId: string,
    iepId: string,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    return workflowCommand(
      organizationId,
      iepId,
      'submit',
      iepWorkflowCommandSchema.parse({ expectedVersion }),
      signal,
    );
  },

  async reviewIEPAsCoordinator(
    organizationId: string,
    iepId: string,
    command: {
      expectedVersion: number;
      decision: 'APPROVE' | 'RETURN';
      comment?: string;
    },
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    return workflowCommand(
      organizationId,
      iepId,
      'coordinator-review',
      iepReviewCommandSchema.parse(command),
      signal,
    );
  },

  async reviewIEPAsDirector(
    organizationId: string,
    iepId: string,
    command: {
      expectedVersion: number;
      decision: 'APPROVE' | 'RETURN';
      comment?: string;
    },
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    return workflowCommand(
      organizationId,
      iepId,
      'director-review',
      iepReviewCommandSchema.parse(command),
      signal,
    );
  },

  async activateIEP(
    organizationId: string,
    iepId: string,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    return workflowCommand(
      organizationId,
      iepId,
      'activate',
      iepWorkflowCommandSchema.parse({ expectedVersion }),
      signal,
    );
  },

  async archiveIEP(
    organizationId: string,
    iepId: string,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<IEPRecord> {
    return workflowCommand(
      organizationId,
      iepId,
      'archive',
      iepWorkflowCommandSchema.parse({ expectedVersion }),
      signal,
    );
  },
};
