import {
  User,
  Student,
  LearningJourney,
  FEDCObservationRecord,
  SensoryProfileRecord,
  SFAObservationRecord,
  IEPRecord,
  IEPReport,
  AttendanceRecord,
  WorkflowHistoryEntry,
  ObservationAssignment,
  ObservationFormDefinition,
} from '../types';

import {
  SEED_USERS,
  SEED_STUDENTS,
  SEED_LEARNING_JOURNEYS,
  SEED_ATTENDANCE,
  SEED_ALL_FEDC_OBSERVATIONS,
  SEED_ALL_SENSORY_PROFILES,
  SEED_SFA_OBSERVATION,
  SEED_IEP_RECORDS,
  SEED_WEEKLY_REPORTS,
  SEED_OBSERVATION_ASSIGNMENTS,
  SEED_OBSERVATION_FORMS,
} from '../data/seedData';

const STORAGE_KEYS = {
  USERS: 'mws_users_v2',
  CURRENT_USER_ID: 'mws_current_user_id_v2',
  STUDENTS: 'mws_students_v2',
  LEARNING_JOURNEYS: 'mws_learning_journeys_v2',
  ATTENDANCE: 'mws_attendance_v2',
  FEDC_OBSERVATIONS: 'mws_fedc_observations_v2',
  SENSORY_PROFILES: 'mws_sensory_profiles_v2',
  SFA_OBSERVATIONS: 'mws_sfa_observations_v2',
  IEP_RECORDS: 'mws_iep_records_v2',
  IEP_REPORTS: 'mws_iep_reports_v2',
  OBSERVATION_ASSIGNMENTS: 'mws_observation_assignments_v2',
  OBSERVATION_FORMS: 'mws_observation_forms_v2',
};

class StorageService {
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init(forceReset = false) {
    if (typeof window === 'undefined') return;

    if (forceReset || !localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
      // Default to Special Ed Coordinator or GPK
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, SEED_USERS[0].id);
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      localStorage.setItem(
        STORAGE_KEYS.STUDENTS,
        JSON.stringify(SEED_STUDENTS),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.LEARNING_JOURNEYS)) {
      localStorage.setItem(
        STORAGE_KEYS.LEARNING_JOURNEYS,
        JSON.stringify(SEED_LEARNING_JOURNEYS),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      localStorage.setItem(
        STORAGE_KEYS.ATTENDANCE,
        JSON.stringify(SEED_ATTENDANCE),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.FEDC_OBSERVATIONS)) {
      localStorage.setItem(
        STORAGE_KEYS.FEDC_OBSERVATIONS,
        JSON.stringify(SEED_ALL_FEDC_OBSERVATIONS),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.SENSORY_PROFILES)) {
      localStorage.setItem(
        STORAGE_KEYS.SENSORY_PROFILES,
        JSON.stringify(SEED_ALL_SENSORY_PROFILES),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.SFA_OBSERVATIONS)) {
      localStorage.setItem(
        STORAGE_KEYS.SFA_OBSERVATIONS,
        JSON.stringify([SEED_SFA_OBSERVATION]),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.IEP_RECORDS)) {
      localStorage.setItem(
        STORAGE_KEYS.IEP_RECORDS,
        JSON.stringify(SEED_IEP_RECORDS),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.IEP_REPORTS)) {
      localStorage.setItem(
        STORAGE_KEYS.IEP_REPORTS,
        JSON.stringify(SEED_WEEKLY_REPORTS),
      );
    }
    if (
      forceReset ||
      !localStorage.getItem(STORAGE_KEYS.OBSERVATION_ASSIGNMENTS)
    ) {
      localStorage.setItem(
        STORAGE_KEYS.OBSERVATION_ASSIGNMENTS,
        JSON.stringify(SEED_OBSERVATION_ASSIGNMENTS),
      );
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.OBSERVATION_FORMS)) {
      localStorage.setItem(
        STORAGE_KEYS.OBSERVATION_FORMS,
        JSON.stringify(SEED_OBSERVATION_FORMS),
      );
    }

    this.isInitialized = true;
  }

  public resetAllData() {
    this.init(true);
    window.location.reload();
  }

  // Users
  public getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  }

  public getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const found = users.find((u) => u.id === currentId);
    return found || users[0] || SEED_USERS[0];
  }

  public setCurrentUser(userId: string): User {
    const users = this.getUsers();
    const found = users.find((u) => u.id === userId);
    if (found) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
      return found;
    }
    return users[0];
  }

  // Students
  public getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      return data ? JSON.parse(data) : SEED_STUDENTS;
    } catch {
      return SEED_STUDENTS;
    }
  }

  public getStudent(id: string): Student | undefined {
    return this.getStudents().find((s) => s.id === id);
  }

  public saveStudent(student: Student): Student {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      students[idx] = student;
    } else {
      students.push(student);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    return student;
  }

  public getStudentsForUser(user: User): Student[] {
    const students = this.getStudents();
    if (
      user.role === 'PRINCIPAL' ||
      user.role === 'DIRECTOR' ||
      user.isSpecialEdCoordinator
    ) {
      return students;
    }
    if (
      user.isGPK ||
      (user.role === 'SPECIAL_ED_TEACHER' && !user.isSpecialEdCoordinator)
    ) {
      // Special Education teacher can strictly access only SN students assigned directly to them (1-to-1 or up to 2 students)
      return students.filter(
        (s) =>
          s.specialNeedsFlag &&
          (s.assignedGPKTeacherId === user.id ||
            user.assignedSpecialNeedsStudentIds?.includes(s.id)),
      );
    }
    if (user.role === 'GRADE_TEACHER') {
      return students.filter(
        (s) =>
          user.gradeIds.includes(s.grade) ||
          user.assignedStudentIds?.includes(s.id),
      );
    }
    // Specialist / Subject teacher
    return students;
  }

  public assignGPKTeacherToStudent(
    studentId: string,
    gpkTeacherId: string,
    gpkTeacherName: string,
  ): boolean {
    const students = this.getStudents();
    const users = this.getUsers();

    // Check if GPK teacher already has 2 students
    const teacherStudents = students.filter(
      (s) => s.assignedGPKTeacherId === gpkTeacherId && s.id !== studentId,
    );
    if (teacherStudents.length >= 2) {
      return false; // Max 2 reached
    }

    const sIdx = students.findIndex((s) => s.id === studentId);
    if (sIdx >= 0) {
      students[sIdx] = {
        ...students[sIdx],
        assignedGPKTeacherId: gpkTeacherId,
        assignedGPKTeacherName: gpkTeacherName,
      };
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }

    // Update teacher assignedSpecialNeedsStudentIds
    const uIdx = users.findIndex((u) => u.id === gpkTeacherId);
    if (uIdx >= 0) {
      const assigned = users[uIdx].assignedSpecialNeedsStudentIds || [];
      if (!assigned.includes(studentId)) {
        users[uIdx].assignedSpecialNeedsStudentIds = [...assigned, studentId];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    }

    return true;
  }

  // Learning Journeys
  public getLearningJourneys(): LearningJourney[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEARNING_JOURNEYS);
      return data ? JSON.parse(data) : SEED_LEARNING_JOURNEYS;
    } catch {
      return SEED_LEARNING_JOURNEYS;
    }
  }

  public getLearningJourney(id: string): LearningJourney | undefined {
    return this.getLearningJourneys().find((lj) => lj.id === id);
  }

  public saveLearningJourney(journey: LearningJourney): LearningJourney {
    const journeys = this.getLearningJourneys();
    const index = journeys.findIndex((j) => j.id === journey.id);
    if (index >= 0) {
      journeys[index] = { ...journey, updatedAt: new Date().toISOString() };
    } else {
      journeys.unshift({
        ...journey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(
      STORAGE_KEYS.LEARNING_JOURNEYS,
      JSON.stringify(journeys),
    );
    return journey;
  }

  public deleteLearningJourney(id: string): boolean {
    const journeys = this.getLearningJourneys().filter((j) => j.id !== id);
    localStorage.setItem(
      STORAGE_KEYS.LEARNING_JOURNEYS,
      JSON.stringify(journeys),
    );
    return true;
  }

  public updateWorkflowStage(
    journeyId: string,
    stage: 'Draft' | 'Principal Review' | 'Director Approval',
    action: 'Submitted' | 'Returned' | 'Approved' | 'Updated',
    comment: string,
    user: User,
  ): LearningJourney | undefined {
    const journey = this.getLearningJourney(journeyId);
    if (!journey) return undefined;

    const historyEntry: WorkflowHistoryEntry = {
      id: `wf-${Date.now()}`,
      stage,
      action,
      status:
        action === 'Returned'
          ? 'Returned'
          : action === 'Approved'
            ? 'Done'
            : 'On Progress',
      userId: user.id,
      userName: user.name,
      userRole: user.roleTitle,
      timestamp: new Date().toISOString(),
      comment,
    };

    const updated = { ...journey };
    updated.workflowHistory = [
      historyEntry,
      ...(updated.workflowHistory || []),
    ];

    if (stage === 'Draft') {
      if (action === 'Submitted') {
        updated.draftStatus = 'Done';
        updated.principalReviewStatus = 'On Progress';
      }
    } else if (stage === 'Principal Review') {
      if (action === 'Approved') {
        updated.principalReviewStatus = 'Done';
        updated.directorApprovalStatus = 'On Progress';
      } else if (action === 'Returned') {
        updated.principalReviewStatus = 'Returned';
      }
    } else if (stage === 'Director Approval') {
      if (action === 'Approved') {
        updated.directorApprovalStatus = 'Done';
      } else if (action === 'Returned') {
        updated.directorApprovalStatus = 'Returned';
      }
    }

    return this.saveLearningJourney(updated);
  }

  // Attendance
  public getAttendanceRecords(
    date?: string,
    className?: string,
  ): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      let records: AttendanceRecord[] = data
        ? JSON.parse(data)
        : SEED_ATTENDANCE;
      if (date) {
        records = records.filter((r) => r.date === date);
      }
      if (className) {
        records = records.filter((r) => r.className === className);
      }
      return records;
    } catch {
      return SEED_ATTENDANCE;
    }
  }

  public saveAttendance(records: AttendanceRecord[]): void {
    const existing = this.getAttendanceRecords();
    const updated = [...existing];

    records.forEach((newRec) => {
      const idx = updated.findIndex(
        (r) => r.studentId === newRec.studentId && r.date === newRec.date,
      );
      if (idx >= 0) {
        updated[idx] = newRec;
      } else {
        updated.push(newRec);
      }
    });

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
  }

  // FEDC Observations
  public getFEDCObservations(studentId?: string): FEDCObservationRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FEDC_OBSERVATIONS);
      let records: FEDCObservationRecord[] = data
        ? JSON.parse(data)
        : SEED_ALL_FEDC_OBSERVATIONS;
      if (studentId) {
        records = records.filter((r) => r.studentId === studentId);
      }
      return records;
    } catch {
      return SEED_ALL_FEDC_OBSERVATIONS;
    }
  }

  public saveFEDCObservation(
    record: FEDCObservationRecord,
  ): FEDCObservationRecord {
    const list = this.getFEDCObservations();
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      list[idx] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(STORAGE_KEYS.FEDC_OBSERVATIONS, JSON.stringify(list));
    return record;
  }

  // Sensory Profile
  public getSensoryProfiles(studentId?: string): SensoryProfileRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SENSORY_PROFILES);
      let records: SensoryProfileRecord[] = data
        ? JSON.parse(data)
        : SEED_ALL_SENSORY_PROFILES;
      if (studentId) {
        records = records.filter((r) => r.studentId === studentId);
      }
      return records;
    } catch {
      return SEED_ALL_SENSORY_PROFILES;
    }
  }

  public saveSensoryProfile(
    record: SensoryProfileRecord,
  ): SensoryProfileRecord {
    const list = this.getSensoryProfiles();
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      list[idx] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(STORAGE_KEYS.SENSORY_PROFILES, JSON.stringify(list));
    return record;
  }

  // SFA Observations
  public getSFAObservations(studentId?: string): SFAObservationRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SFA_OBSERVATIONS);
      let records: SFAObservationRecord[] = data
        ? JSON.parse(data)
        : [SEED_SFA_OBSERVATION];
      if (studentId) {
        records = records.filter((r) => r.studentId === studentId);
      }
      return records;
    } catch {
      return [SEED_SFA_OBSERVATION];
    }
  }

  public saveSFAObservation(
    record: SFAObservationRecord,
  ): SFAObservationRecord {
    const list = this.getSFAObservations();
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      list[idx] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(STORAGE_KEYS.SFA_OBSERVATIONS, JSON.stringify(list));
    return record;
  }

  // Observation Assignments (Coordinator Feature)
  public getObservationAssignments(
    studentId?: string,
  ): ObservationAssignment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OBSERVATION_ASSIGNMENTS);
      let list: ObservationAssignment[] = data
        ? JSON.parse(data)
        : SEED_OBSERVATION_ASSIGNMENTS;
      if (studentId) {
        list = list.filter((a) => a.studentId === studentId);
      }
      return list;
    } catch {
      return SEED_OBSERVATION_ASSIGNMENTS;
    }
  }

  public saveObservationAssignment(
    assignment: ObservationAssignment,
  ): ObservationAssignment {
    const list = this.getObservationAssignments();
    const idx = list.findIndex((a) => a.id === assignment.id);
    if (idx >= 0) {
      list[idx] = assignment;
    } else {
      list.unshift({
        ...assignment,
        id: assignment.id || `oa-${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(
      STORAGE_KEYS.OBSERVATION_ASSIGNMENTS,
      JSON.stringify(list),
    );
    return assignment;
  }

  public deleteObservationAssignment(id: string): boolean {
    const list = this.getObservationAssignments().filter((a) => a.id !== id);
    localStorage.setItem(
      STORAGE_KEYS.OBSERVATION_ASSIGNMENTS,
      JSON.stringify(list),
    );
    return true;
  }

  // Observation Form Definitions
  public getObservationForms(): ObservationFormDefinition[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OBSERVATION_FORMS);
      return data ? JSON.parse(data) : SEED_OBSERVATION_FORMS;
    } catch {
      return SEED_OBSERVATION_FORMS;
    }
  }

  public saveObservationForm(
    form: ObservationFormDefinition,
  ): ObservationFormDefinition {
    const list = this.getObservationForms();
    const idx = list.findIndex((f) => f.id === form.id);
    if (idx >= 0) {
      list[idx] = {
        ...form,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
    } else {
      list.push({
        ...form,
        id: form.id || `form-${Date.now()}`,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    }
    localStorage.setItem(STORAGE_KEYS.OBSERVATION_FORMS, JSON.stringify(list));
    return form;
  }

  // IEP Records
  public syncIEPGoalsWithWeeklyReports(
    studentId: string,
  ): IEPRecord | undefined {
    try {
      const recordsData = localStorage.getItem(STORAGE_KEYS.IEP_RECORDS);
      const records: IEPRecord[] = recordsData
        ? JSON.parse(recordsData)
        : SEED_IEP_RECORDS;
      const iepIdx = records.findIndex((r) => r.studentId === studentId);
      if (iepIdx < 0) return undefined;

      const iep = records[iepIdx];
      const reports = this.getIEPReports(studentId);

      // Deep sync each goal
      iep.goals = iep.goals.map((goal) => {
        // Find all weekly reports where this goal was addressed
        const matchingWeeklyLogs: {
          reportId: string;
          weekNumber: number;
          weekRange?: string;
          date: string;
          rating?: 1 | 2 | 3 | 4 | 5;
          notes?: string;
          markedAchieved?: boolean;
        }[] = [];

        reports.forEach((rep) => {
          if (!rep.goalProgress) return;
          const gp = rep.goalProgress.find((p) => p.goalId === goal.id);
          if (gp && gp.addressedThisWeek) {
            const logDate =
              rep.weekEnd ||
              rep.weekStart ||
              (rep.updatedAt ? rep.updatedAt.split('T')[0] : '2026-11-10');
            matchingWeeklyLogs.push({
              reportId: rep.id,
              weekNumber: rep.weekNumber,
              weekRange: rep.weekRange,
              date: logDate,
              rating: gp.rating,
              notes: gp.notes,
              markedAchieved: Boolean(gp.markedAchievedThisWeek),
            });
          }
        });

        // Sort chronologically by week number
        matchingWeeklyLogs.sort((a, b) => a.weekNumber - b.weekNumber);

        let lastAddressedDate = goal.lastAddressedDate;
        let lastAddressedWeek = goal.lastAddressedWeek;
        let lastAddressedRating = goal.lastAddressedRating;

        if (matchingWeeklyLogs.length > 0) {
          const latestLog = matchingWeeklyLogs[matchingWeeklyLogs.length - 1];
          lastAddressedDate = latestLog.date;
          lastAddressedWeek = latestLog.weekNumber;
          lastAddressedRating = latestLog.rating;
        }

        // Check achievement in reports
        let achieved = goal.achieved;
        let achievedDate = goal.achievedDate;
        let achievedNote = goal.achievedNote;
        let achievedInReportId = goal.achievedInReportId;

        // Check if marked achieved in any weekly report
        for (const rep of reports) {
          if (!rep.goalProgress) continue;
          const gp = rep.goalProgress.find((p) => p.goalId === goal.id);
          if (gp && gp.markedAchievedThisWeek) {
            achieved = true;
            achievedDate =
              gp.achievedDate ||
              rep.weekEnd ||
              rep.weekStart ||
              achievedDate ||
              new Date().toISOString().split('T')[0];
            achievedNote =
              gp.achievedNote ||
              gp.notes ||
              achievedNote ||
              'Mastered in weekly observation log.';
            achievedInReportId = rep.id;
            break;
          }
        }

        return {
          ...goal,
          lastAddressedDate,
          lastAddressedWeek,
          lastAddressedRating,
          timesAddressed: matchingWeeklyLogs.length,
          addressedHistory: matchingWeeklyLogs,
          achieved,
          achievedDate,
          achievedNote,
          achievedInReportId,
        };
      });

      records[iepIdx] = { ...iep, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.IEP_RECORDS, JSON.stringify(records));
      return records[iepIdx];
    } catch {
      return undefined;
    }
  }

  public getIEPRecords(studentId?: string): IEPRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IEP_RECORDS);
      let records: IEPRecord[] = data ? JSON.parse(data) : SEED_IEP_RECORDS;
      if (studentId) {
        records = records.filter((r) => r.studentId === studentId);
      }
      return records;
    } catch {
      return SEED_IEP_RECORDS;
    }
  }

  public getIEPRecord(id: string): IEPRecord | undefined {
    return this.getIEPRecords().find((r) => r.id === id);
  }

  public saveIEPRecord(record: IEPRecord): IEPRecord {
    const list = this.getIEPRecords();
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      list[idx] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(STORAGE_KEYS.IEP_RECORDS, JSON.stringify(list));

    // Sync with weekly reports
    this.syncIEPGoalsWithWeeklyReports(record.studentId);

    const updated = this.getIEPRecord(record.id);
    return updated || record;
  }

  public updateIEPWorkflow(
    iepId: string,
    fieldOrStage: string,
    statusOrAction: string,
    userOrNotes: User | string,
    notesOrUser?: string | User,
  ): IEPRecord | undefined {
    const iep = this.getIEPRecord(iepId);
    if (!iep) return undefined;

    let user: User;
    let notes: string = '';

    if (
      typeof userOrNotes === 'object' &&
      userOrNotes !== null &&
      'id' in userOrNotes
    ) {
      user = userOrNotes as User;
      notes = typeof notesOrUser === 'string' ? notesOrUser : '';
    } else {
      user =
        (notesOrUser as User) ||
        ({ id: 'usr-unknown', name: 'Staff User', roleTitle: 'Staff' } as User);
      notes = typeof userOrNotes === 'string' ? userOrNotes : '';
    }

    const stageNormalized =
      fieldOrStage === 'draftStatus' || fieldOrStage === 'DRAFT'
        ? 'DRAFT'
        : fieldOrStage === 'coordinatorReviewStatus' ||
            fieldOrStage === 'COORDINATOR_REVIEW'
          ? 'COORDINATOR_REVIEW'
          : 'DIRECTOR_APPROVAL';

    const isApproveOrDone =
      statusOrAction === 'Done' ||
      statusOrAction === 'APPROVED' ||
      statusOrAction === 'Approved';
    const isReturn =
      statusOrAction === 'Returned' || statusOrAction === 'RETURNED';

    const historyEntry: WorkflowHistoryEntry = {
      id: `wf-iep-${Date.now()}`,
      stage:
        stageNormalized === 'DRAFT'
          ? 'Draft'
          : stageNormalized === 'COORDINATOR_REVIEW'
            ? 'Coordinator Review'
            : 'Director Approval',
      action: isApproveOrDone
        ? stageNormalized === 'DRAFT'
          ? 'Submitted'
          : 'Approved'
        : isReturn
          ? 'Returned'
          : 'Updated',
      status: statusOrAction,
      userId: user.id,
      userName: user.name,
      userRole: user.roleTitle,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.roleTitle,
      timestamp: new Date().toISOString(),
      notes: notes,
      comment: notes,
    };

    const updated: IEPRecord = {
      ...iep,
      workflowHistory: [historyEntry, ...(iep.workflowHistory || [])],
    };

    if (stageNormalized === 'DRAFT') {
      updated.draftStatus = 'Done';
      updated.coordinatorReviewStatus = 'On Progress';
      updated.status = 'In Review';
    } else if (stageNormalized === 'COORDINATOR_REVIEW') {
      if (isApproveOrDone) {
        updated.coordinatorReviewStatus = 'Done';
        updated.directorApprovalStatus = 'On Progress';
        updated.status = 'In Review';
      } else if (isReturn) {
        updated.coordinatorReviewStatus = 'Returned';
        updated.draftStatus = 'On Progress';
        updated.status = 'Draft';
      }
    } else if (stageNormalized === 'DIRECTOR_APPROVAL') {
      if (isApproveOrDone) {
        updated.directorApprovalStatus = 'Done';
        updated.status = 'Approved';
      } else if (isReturn) {
        updated.directorApprovalStatus = 'Returned';
        updated.coordinatorReviewStatus = 'Returned';
        updated.status = 'In Review';
      }
    }

    return this.saveIEPRecord(updated);
  }

  // IEP Reports (Weekly Progress)
  public getIEPReports(studentId?: string): IEPReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IEP_REPORTS);
      let reports: IEPReport[] = data ? JSON.parse(data) : SEED_WEEKLY_REPORTS;
      if (studentId) {
        reports = reports.filter((r) => r.studentId === studentId);
      }
      return reports;
    } catch {
      return SEED_WEEKLY_REPORTS;
    }
  }

  public getIEPReport(id: string): IEPReport | undefined {
    return this.getIEPReports().find((r) => r.id === id);
  }

  public saveIEPReport(report: IEPReport): IEPReport {
    const list = this.getIEPReports();
    const idx = list.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      list[idx] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...report,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(STORAGE_KEYS.IEP_REPORTS, JSON.stringify(list));

    // Automatically update the IEP Plan with the date the goals are being addressed and when goals are achieved!
    this.syncIEPGoalsWithWeeklyReports(report.studentId);

    return report;
  }

  public updateWeeklyReportWorkflow(
    reportId: string,
    fieldOrStage: string,
    statusOrAction: string,
    userOrNotes: User | string,
    notesOrUser?: string | User,
  ): IEPReport | undefined {
    const report = this.getIEPReport(reportId);
    if (!report) return undefined;

    let user: User;
    let notes: string = '';

    if (
      typeof userOrNotes === 'object' &&
      userOrNotes !== null &&
      'id' in userOrNotes
    ) {
      user = userOrNotes as User;
      notes = typeof notesOrUser === 'string' ? notesOrUser : '';
    } else {
      user =
        (notesOrUser as User) ||
        ({ id: 'usr-unknown', name: 'Staff User', roleTitle: 'Staff' } as User);
      notes = typeof userOrNotes === 'string' ? userOrNotes : '';
    }

    const stageNormalized =
      fieldOrStage === 'draftStatus' || fieldOrStage === 'DRAFT'
        ? 'DRAFT'
        : fieldOrStage === 'coordinatorReviewStatus' ||
            fieldOrStage === 'COORDINATOR_REVIEW'
          ? 'COORDINATOR_REVIEW'
          : 'DIRECTOR_APPROVAL';

    const isApproveOrDone =
      statusOrAction === 'Done' ||
      statusOrAction === 'APPROVED' ||
      statusOrAction === 'Approved';
    const isReturn =
      statusOrAction === 'Returned' || statusOrAction === 'RETURNED';

    const historyEntry: WorkflowHistoryEntry = {
      id: `wf-rep-${Date.now()}`,
      stage:
        stageNormalized === 'DRAFT'
          ? 'Draft'
          : stageNormalized === 'COORDINATOR_REVIEW'
            ? 'Coordinator Review'
            : 'Director Approval',
      action: isApproveOrDone
        ? stageNormalized === 'DRAFT'
          ? 'Submitted'
          : 'Approved'
        : isReturn
          ? 'Returned'
          : 'Updated',
      status: statusOrAction,
      userId: user.id,
      userName: user.name,
      userRole: user.roleTitle,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.roleTitle,
      timestamp: new Date().toISOString(),
      notes: notes,
      comment: notes,
    };

    const updated: IEPReport = {
      ...report,
      workflowHistory: [historyEntry, ...(report.workflowHistory || [])],
    };

    if (stageNormalized === 'DRAFT') {
      updated.draftStatus = 'Done';
      updated.coordinatorReviewStatus = 'On Progress';
      updated.status = 'In Review';
    } else if (stageNormalized === 'COORDINATOR_REVIEW') {
      if (isApproveOrDone) {
        updated.coordinatorReviewStatus = 'Done';
        updated.directorApprovalStatus = 'On Progress';
        updated.status = 'In Review';
      } else if (isReturn) {
        updated.coordinatorReviewStatus = 'Returned';
        updated.draftStatus = 'On Progress';
        updated.status = 'Draft';
      }
    } else if (stageNormalized === 'DIRECTOR_APPROVAL') {
      if (isApproveOrDone) {
        updated.directorApprovalStatus = 'Done';
        updated.status = 'Approved';
      } else if (isReturn) {
        updated.directorApprovalStatus = 'Returned';
        updated.coordinatorReviewStatus = 'Returned';
        updated.status = 'In Review';
      }
    }

    return this.saveIEPReport(updated);
  }
}

export const storageService = new StorageService();
