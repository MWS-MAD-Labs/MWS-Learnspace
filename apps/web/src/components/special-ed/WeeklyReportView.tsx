import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useIEPs } from '../../hooks/useIEPs';
import { storageService } from '../../services/storageService';
import {
  IEPReport,
  WeeklyGoalProgress,
  Student,
  IEPRecord,
  LJReviewStatus,
  LJApprovalStatus,
} from '../../types';
import { WeeklyReportStatusTracker } from './WeeklyReportStatusTracker';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileText,
  Save,
  Send,
  Printer,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  ListOrdered,
  ShieldCheck,
  RotateCcw,
  Clock,
  Check,
  Eye,
  Target,
  ExternalLink,
  Info,
} from 'lucide-react';

export const WeeklyReportView: React.FC = () => {
  const {
    organizationId,
    selectedStudentId,
    setSelectedStudentId,
    students,
    currentUser,
    showToast,
    refreshData,
    navigateToIEP,
  } = useApp();

  const [reportViewMode, setReportViewMode] = useState<
    'EDITOR' | 'STATUS_TRACKER'
  >('EDITOR');
  const [goalFilter, setGoalFilter] = useState<
    'ALL' | 'ADDRESSED' | 'UNADDRESSED'
  >('ALL');

  const isCoordinator = Boolean(currentUser.isSpecialEdCoordinator);
  const isDirector =
    currentUser.role === 'DIRECTOR' || currentUser.role === 'PRINCIPAL';
  const isCoordinatorOrLeadership = isCoordinator || isDirector;

  const isSETeacher =
    currentUser.isGPK ||
    (currentUser.role === 'SPECIAL_ED_TEACHER' &&
      !currentUser.isSpecialEdCoordinator);

  // Review & Feedback Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Return'>(
    'Approve',
  );
  const [reviewComment, setReviewComment] = useState('');

  // History / Audit trail modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Accessible students: SE teachers can only access their assigned SN students
  const accessibleStudents = useMemo(() => {
    if (isCoordinatorOrLeadership) {
      return students.filter((s) => s.specialNeedsFlag);
    }
    return students.filter(
      (s) =>
        s.specialNeedsFlag &&
        (s.assignedGPKTeacherId === currentUser.id ||
          currentUser.assignedSpecialNeedsStudentIds?.includes(s.id)),
    );
  }, [students, currentUser, isCoordinatorOrLeadership]);

  const currentStudent =
    accessibleStudents.find((s) => s.id === selectedStudentId) ||
    accessibleStudents[0];

  const [selectedWeek, setSelectedWeek] = useState(8);

  // IEP plans are API-backed; weekly report persistence remains isolated here.
  const iepData = useIEPs(
    organizationId,
    { studentId: currentStudent?.id },
    { enabled: Boolean(currentStudent) },
  );
  const studentIEP = iepData.ieps[0];

  // Helper to build default or synced report populated from IEP Plan goals
  const buildReportFromIEP = (
    stud: Student,
    week: number,
    iep?: IEPRecord,
  ): IEPReport => {
    const existingReports = storageService.getIEPReports(stud.id);
    const existing = existingReports.find((r) => r.weekNumber === week);

    // Week date range calculation
    const weekRanges: Record<
      number,
      { range: string; start: string; end: string }
    > = {
      6: { range: 'Oct 5–9, 2026', start: '2026-10-05', end: '2026-10-09' },
      7: { range: 'Oct 12–16, 2026', start: '2026-10-12', end: '2026-10-16' },
      8: { range: 'Oct 19–23, 2026', start: '2026-10-19', end: '2026-10-23' },
      9: { range: 'Oct 26–30, 2026', start: '2026-10-26', end: '2026-10-30' },
      10: { range: 'Nov 2–6, 2026', start: '2026-11-02', end: '2026-11-06' },
      14: { range: 'Nov 6–10, 2026', start: '2026-11-06', end: '2026-11-10' },
      15: { range: 'Nov 13–17, 2026', start: '2026-11-13', end: '2026-11-17' },
    };

    const dates = weekRanges[week] || {
      range: `Week ${week}`,
      start: '2026-10-19',
      end: '2026-10-23',
    };

    // Goals pulled directly from the student's IEP Plan
    const iepGoals = iep?.goals || [];

    const goalProgressList: WeeklyGoalProgress[] = iepGoals.map(
      (goal, gIdx) => {
        const existingGp = existing?.goalProgress?.find(
          (p) => p.goalId === goal.id,
        );
        if (existingGp) {
          return {
            ...existingGp,
            goalId: goal.id,
            goalCode: goal.code,
            performanceArea: goal.performanceArea,
            measurableGoal: goal.measurableGoal,
            addressedThisWeek: Boolean(existingGp.addressedThisWeek),
            rating: existingGp.rating || 3,
            notes: existingGp.notes || '',
            markedAchievedThisWeek: Boolean(
              existingGp.markedAchievedThisWeek ||
              (goal.achieved && goal.achievedDate === dates.end),
            ),
            achievedDate:
              existingGp.achievedDate ||
              (goal.achieved ? goal.achievedDate : dates.end),
            achievedNote: existingGp.achievedNote || goal.achievedNote || '',
          };
        }

        // Default state for newly initialized report:
        // First 2 goals addressed by default as sample
        const isDefaultAddressed = gIdx < 2;
        return {
          goalId: goal.id,
          goalCode: goal.code,
          performanceArea: goal.performanceArea,
          measurableGoal: goal.measurableGoal,
          addressedThisWeek: isDefaultAddressed,
          rating: 3,
          notes: isDefaultAddressed
            ? `Demonstrated positive engagement on target milestone during classroom routines.`
            : '',
          markedAchievedThisWeek: false,
          achievedDate: dates.end,
          achievedNote: '',
        };
      },
    );

    if (existing) {
      return {
        ...existing,
        weekRange: existing.weekRange || dates.range,
        weekStart: existing.weekStart || dates.start,
        weekEnd: existing.weekEnd || dates.end,
        goalProgress: goalProgressList,
      };
    }

    return {
      id: `wr-${stud.id}-w${week}`,
      studentId: stud.id,
      iepId: iep?.id || `iep-${stud.id}-2026`,
      year: '2026',
      weekNumber: week,
      weekRange: dates.range,
      weekStart: dates.start,
      weekEnd: dates.end,
      teacherId: stud.assignedGPKTeacherId || currentUser.id,
      teacherName: stud.assignedGPKTeacherName || currentUser.name,
      status: 'Draft',
      draftStatus: 'On Progress',
      coordinatorReviewStatus: 'Not Started',
      directorApprovalStatus: 'Not Started',
      workflowHistory: [],
      goalProgress: goalProgressList,
      descriptiveObservation: `${stud.nickname || stud.fullName} showed enthusiastic engagement during movement stations, sensory routines, and collaborative tasks this week.`,
      homeConnection:
        'Encourage 10 minutes of structured routine practice and sensory calm-down activities over the weekend.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const [report, setReport] = useState<IEPReport>(() => {
    if (!currentStudent) {
      return buildReportFromIEP(
        {
          id: 'temp',
          fullName: 'Student',
          name: 'Student',
          specialNeedsFlag: true,
        } as any,
        8,
      );
    }
    return buildReportFromIEP(currentStudent, selectedWeek, studentIEP);
  });

  // Sync report on student, week, or IEP change.
  useEffect(() => {
    if (!currentStudent || iepData.status !== 'ready') return;
    const synced = buildReportFromIEP(currentStudent, selectedWeek, studentIEP);
    setReport(synced);
  }, [currentStudent?.id, selectedWeek, studentIEP?.id, iepData.status]);

  // Find latest return feedback if returned
  const latestReturnFeedback = useMemo(() => {
    if (!report.workflowHistory || report.workflowHistory.length === 0)
      return null;
    return (
      report.workflowHistory.find(
        (h) =>
          h.action === 'Returned' ||
          h.status === 'Returned' ||
          h.status === 'RETURNED',
      ) || null
    );
  }, [report.workflowHistory]);

  const isDraftSubmitted = report.draftStatus === 'Done';
  const isCoordinatorVerified = report.coordinatorReviewStatus === 'Done';
  const isDirectorApproved = report.directorApprovalStatus === 'Done';
  const isReturned =
    report.coordinatorReviewStatus === 'Returned' ||
    report.directorApprovalStatus === 'Returned';

  // Role-based editing authorization
  const canSETeacherEdit = isSETeacher && (!isDraftSubmitted || isReturned);
  const canCoordinatorEdit =
    isCoordinator && isDraftSubmitted && !isCoordinatorVerified;
  const canDirectorEdit =
    isDirector && isCoordinatorVerified && !isDirectorApproved;

  const canCurrentUserEdit =
    canSETeacherEdit || canCoordinatorEdit || canDirectorEdit;
  const isFormReadOnly = !canCurrentUserEdit;

  // Goals statistics
  const totalGoalsCount = report.goalProgress?.length || 0;
  const addressedGoalsCount =
    report.goalProgress?.filter((g) => g.addressedThisWeek).length || 0;

  // Filtered goals to display
  const filteredGoals = useMemo(() => {
    if (!report.goalProgress) return [];
    if (goalFilter === 'ADDRESSED') {
      return report.goalProgress.filter((g) => g.addressedThisWeek);
    }
    if (goalFilter === 'UNADDRESSED') {
      return report.goalProgress.filter((g) => !g.addressedThisWeek);
    }
    return report.goalProgress;
  }, [report.goalProgress, goalFilter]);

  // Toggle goal addressed this week
  const handleToggleGoalAddressed = (goalId: string) => {
    if (isFormReadOnly) return;
    setReport((prev) => {
      const updated = prev.goalProgress.map((gp) => {
        if (gp.goalId === goalId) {
          const nextAddressed = !gp.addressedThisWeek;
          return {
            ...gp,
            addressedThisWeek: nextAddressed,
            // If toggling on and rating missing, set default rating 3
            rating: gp.rating || 3,
          };
        }
        return gp;
      });
      return { ...prev, goalProgress: updated };
    });
  };

  const handleSelectAllGoals = (select: boolean) => {
    if (isFormReadOnly) return;
    setReport((prev) => ({
      ...prev,
      goalProgress: prev.goalProgress.map((gp) => ({
        ...gp,
        addressedThisWeek: select,
      })),
    }));
  };

  const handleUpdateGoalRating = (
    goalId: string,
    rating: 1 | 2 | 3 | 4 | 5,
  ) => {
    if (isFormReadOnly) return;
    setReport((prev) => ({
      ...prev,
      goalProgress: prev.goalProgress.map((gp) =>
        gp.goalId === goalId ? { ...gp, rating } : gp,
      ),
    }));
  };

  const handleUpdateGoalNotes = (goalId: string, notes: string) => {
    if (isFormReadOnly) return;
    setReport((prev) => ({
      ...prev,
      goalProgress: prev.goalProgress.map((gp) =>
        gp.goalId === goalId ? { ...gp, notes } : gp,
      ),
    }));
  };

  const handleToggleGoalAchieved = (goalId: string) => {
    if (isFormReadOnly) return;
    setReport((prev) => ({
      ...prev,
      goalProgress: prev.goalProgress.map((gp) => {
        if (gp.goalId === goalId) {
          const nextAchieved = !gp.markedAchievedThisWeek;
          return {
            ...gp,
            markedAchievedThisWeek: nextAchieved,
            achievedDate: nextAchieved
              ? report.weekEnd || '2026-10-23'
              : undefined,
            achievedNote: nextAchieved
              ? gp.notes || 'Mastered in weekly observation session.'
              : undefined,
          };
        }
        return gp;
      }),
    }));
  };

  const handleUpdateGoalAchievedDate = (
    goalId: string,
    achievedDate: string,
  ) => {
    if (isFormReadOnly) return;
    setReport((prev) => ({
      ...prev,
      goalProgress: prev.goalProgress.map((gp) =>
        gp.goalId === goalId ? { ...gp, achievedDate } : gp,
      ),
    }));
  };

  const handleUpdateGoalAchievedNote = (
    goalId: string,
    achievedNote: string,
  ) => {
    if (isFormReadOnly) return;
    setReport((prev) => ({
      ...prev,
      goalProgress: prev.goalProgress.map((gp) =>
        gp.goalId === goalId ? { ...gp, achievedNote } : gp,
      ),
    }));
  };

  // 1. Save Draft (SE Teacher or Reviewer in valid stage)
  const handleSaveDraft = () => {
    if (!canCurrentUserEdit) {
      showToast(
        'error',
        'Read-Only Stage',
        isCoordinator && !isDraftSubmitted
          ? 'Coordinators cannot edit weekly reports while they are still in the SE Teacher draft stage.'
          : 'You cannot edit this weekly report at its current workflow stage.',
      );
      return;
    }
    if (
      isSETeacher &&
      currentStudent.assignedGPKTeacherId !== currentUser.id &&
      !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)
    ) {
      showToast(
        'error',
        'Unauthorized Access',
        'You can only save weekly reports for students assigned to you.',
      );
      return;
    }
    const updated: IEPReport = {
      ...report,
      studentId: currentStudent.id,
      iepId: studentIEP?.id || report.iepId,
      teacherId: report.teacherId || currentUser.id,
      teacherName: report.teacherName || currentUser.name,
      draftStatus: isDraftSubmitted ? report.draftStatus : 'On Progress',
      updatedAt: new Date().toISOString(),
    };
    storageService.saveIEPReport(updated);
    setReport(updated);
    showToast(
      'success',
      'Weekly Report & IEP Plan Synchronized',
      `Updated ${addressedGoalsCount} goals for ${currentStudent.fullName}. Addressed dates & achievement status synced with the IEP Plan.`,
    );
    refreshData();
  };

  // 2. Submit Draft for Coordinator Review (SE Teacher)
  const handleSubmitToCoordinator = () => {
    if (
      !isCoordinatorOrLeadership &&
      currentStudent.assignedGPKTeacherId !== currentUser.id &&
      !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)
    ) {
      showToast(
        'error',
        'Unauthorized Access',
        'You can only submit weekly reports for students assigned to you.',
      );
      return;
    }

    if (addressedGoalsCount === 0) {
      showToast(
        'warning',
        'No Goals Addressed',
        'Please choose at least 1 IEP goal that was addressed this week before submitting.',
      );
      return;
    }

    // Save first (which also triggers synchronization with the IEP Plan)
    const saved = storageService.saveIEPReport({
      ...report,
      studentId: currentStudent.id,
      iepId: studentIEP?.id || report.iepId,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      updatedAt: new Date().toISOString(),
    });

    const updated = storageService.updateWeeklyReportWorkflow(
      saved.id,
      'draftStatus',
      'Done',
      currentUser,
      `Submitted Week ${report.weekNumber} progress log for Special Education Coordinator verification (${addressedGoalsCount} goals addressed).`,
    );

    if (updated) {
      setReport(updated);
    }
    showToast(
      'success',
      'Submitted for Coordinator Review',
      `Week ${report.weekNumber} IEP report submitted to Ms. Elena Johnson (Special Ed Coordinator). Addressed dates synced to IEP Plan.`,
    );
    refreshData();
  };

  // 3. Re-open Draft for Teacher Editing
  const handleReopenDraft = () => {
    const updated: IEPReport = {
      ...report,
      draftStatus: 'On Progress',
      coordinatorReviewStatus: 'Not Started',
      status: 'Draft',
      updatedAt: new Date().toISOString(),
    };
    storageService.saveIEPReport(updated);
    setReport(updated);
    showToast(
      'info',
      'Draft Re-opened',
      'You can now edit and re-submit this weekly progress report.',
    );
    refreshData();
  };

  // 4. Submit Coordinator or Director Decision
  const handleConfirmReviewDecision = () => {
    if (reviewAction === 'Return' && !reviewComment.trim()) {
      showToast(
        'error',
        'Feedback Required',
        'Please explain what needs to be revised or adjusted in the report.',
      );
      return;
    }

    // Save any pending edits first
    storageService.saveIEPReport(report);

    if (isCoordinator) {
      const status: LJReviewStatus =
        reviewAction === 'Approve' ? 'Done' : 'Returned';
      const updated = storageService.updateWeeklyReportWorkflow(
        report.id,
        'coordinatorReviewStatus',
        status,
        currentUser,
        reviewComment.trim() ||
          (reviewAction === 'Approve'
            ? 'Verified weekly goal ratings and descriptive notes. Forwarded to Director.'
            : 'Returned to teacher for revisions.'),
      );
      if (updated) setReport(updated);
      showToast(
        reviewAction === 'Approve' ? 'success' : 'info',
        reviewAction === 'Approve'
          ? 'Coordinator Verified'
          : 'Returned to Teacher with Feedback',
        reviewAction === 'Approve'
          ? 'Report forwarded to Director for parent portal release.'
          : 'Report returned to SE teacher for adjustments.',
      );
    } else if (isDirector) {
      const status: LJApprovalStatus =
        reviewAction === 'Approve' ? 'Done' : 'Returned';
      const updated = storageService.updateWeeklyReportWorkflow(
        report.id,
        'directorApprovalStatus',
        status,
        currentUser,
        reviewComment.trim() ||
          (reviewAction === 'Approve'
            ? 'Director authorized weekly IEP progress log. Published to Parent Portal.'
            : 'Returned for revisions.'),
      );
      if (updated) setReport(updated);
      showToast(
        reviewAction === 'Approve' ? 'success' : 'info',
        reviewAction === 'Approve'
          ? 'Approved & Published'
          : 'Returned by Director',
        reviewAction === 'Approve'
          ? 'Weekly IEP progress log is now accessible on the Parent Portal.'
          : 'Report returned for adjustments.',
      );
    }

    setShowReviewModal(false);
    setReviewComment('');
    refreshData();
  };

  const handlePrint = () => {
    window.print();
  };

  if (accessibleStudents.length === 0) {
    return (
      <div
        id="weekly-report-restricted-view"
        className="max-w-3xl mx-auto my-12 bg-white border border-[#EFE7DC] rounded-3xl p-8 text-center space-y-4 shadow-xs"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="font-heading font-black text-lg text-stone-900">
          No Special Needs Students Assigned Yet
        </h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
          Special Education and GPK teachers can only access, create, and log
          Weekly IEP Reports for students assigned to their 1:1 / caseload care.
        </p>
        <p className="text-xs text-stone-500">
          Please contact the Special Education Coordinator (
          <strong>Ms. Elena Johnson</strong>) to assign students to your
          profile.
        </p>
      </div>
    );
  }

  if (iepData.status === 'loading') {
    return (
      <div className="p-8 text-center text-sm text-stone-600">
        Loading IEP goals…
      </div>
    );
  }

  if (iepData.status === 'error') {
    return (
      <div className="max-w-3xl mx-auto my-12 bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <p className="text-sm font-bold text-rose-900">
          IEP goals could not be loaded.
        </p>
        <p className="text-xs text-stone-600">{iepData.error}</p>
        <button
          type="button"
          onClick={iepData.retry}
          className="px-4 py-2 bg-[#6E161E] text-white text-xs font-bold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div id="weekly-report-view" className="space-y-6 max-w-5xl mx-auto pb-28">
      {/* SE Teacher Caseload Banner */}
      {isSETeacher && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              <strong>Tied SE Teacher Access:</strong> You are authorized to
              access, create, and submit Weekly IEP Reports strictly for your
              assigned student(s):{' '}
              <strong className="text-amber-950">
                {accessibleStudents.map((s) => s.fullName).join(', ')}
              </strong>
              .
            </span>
          </div>
          <span className="font-black px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-950 text-[10px] shrink-0">
            {accessibleStudents.length} / 2 Students
          </span>
        </div>
      )}

      {/* Top Mode Switcher */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-2 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <button
            id="mode-weekly-editor-btn"
            onClick={() => setReportViewMode('EDITOR')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportViewMode === 'EDITOR'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Weekly Report Entry & Review</span>
          </button>

          <button
            id="mode-weekly-tracker-btn"
            onClick={() => setReportViewMode('STATUS_TRACKER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportViewMode === 'STATUS_TRACKER'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>
              2. Weekly Reports Status Tracker (
              {isCoordinatorOrLeadership ? 'All Students' : 'My Caseload'})
            </span>
          </button>
        </div>

        {reportViewMode === 'EDITOR' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-700 border border-[#E8DFC8] rounded-xl text-xs font-bold transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-[#6E161E]" />
              <span>Workflow Audit Trail</span>
            </button>
            <button
              onClick={() => setReportViewMode('STATUS_TRACKER')}
              className="text-xs font-bold text-[#6E161E] hover:underline px-3 py-1.5 hidden sm:block"
            >
              Manage Weekly Reports Tracker →
            </button>
          </div>
        )}
      </div>

      {reportViewMode === 'STATUS_TRACKER' ? (
        <WeeklyReportStatusTracker
          onSelectReportForEdit={(studentId, weekNum) => {
            setSelectedStudentId(studentId);
            setSelectedWeek(weekNum);
            setReportViewMode('EDITOR');
          }}
        />
      ) : (
        <>
          {/* 3-Stage Workflow Pipeline Stepper */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Weekly Report Governance & Approval Workflow
              </span>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {report.workflowHistory?.length || 0} transitions logged
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1: Teacher Draft */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  isDraftSubmitted
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Step 1 · SE Teacher Draft
                  </span>
                  <StatusBadge
                    status={report.draftStatus || 'On Progress'}
                    size="sm"
                  />
                </div>
                <p className="font-bold text-xs">
                  {report.teacherName ||
                    currentStudent.assignedGPKTeacherName ||
                    'Special Ed Teacher'}
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {isDraftSubmitted
                    ? 'Progress logged & submitted'
                    : 'Logging weekly anecdotal observations'}
                </p>
              </div>

              {/* Step 2: Coordinator Review */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCoordinatorVerified
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : report.coordinatorReviewStatus === 'Returned'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : isDraftSubmitted
                        ? 'bg-blue-50/80 border-blue-200 text-blue-950 ring-1 ring-blue-400/30'
                        : 'bg-stone-50 border-stone-200 text-stone-600 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Step 2 · SpecEd Coordinator
                  </span>
                  <StatusBadge
                    status={report.coordinatorReviewStatus || 'Not Started'}
                    size="sm"
                  />
                </div>
                <p className="font-bold text-xs">Ms. Elena Johnson</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {isCoordinatorVerified
                    ? 'Ratings verified & forwarded to Director'
                    : report.coordinatorReviewStatus === 'Returned'
                      ? 'Returned to teacher with revisions'
                      : isDraftSubmitted
                        ? 'Awaiting coordinator verification'
                        : 'Pending teacher draft submission'}
                </p>
              </div>

              {/* Step 3: Director Approval & Release */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  isDirectorApproved
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : report.directorApprovalStatus === 'Returned'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : isCoordinatorVerified
                        ? 'bg-purple-50/80 border-purple-200 text-purple-950 ring-1 ring-purple-400/30'
                        : 'bg-stone-50 border-stone-200 text-stone-600 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Step 3 · Director / Principal
                  </span>
                  <StatusBadge
                    status={report.directorApprovalStatus || 'Not Started'}
                    size="sm"
                  />
                </div>
                <p className="font-bold text-xs">
                  Director & Principal Leadership
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {isDirectorApproved
                    ? 'Authorized & Released to Parent Portal'
                    : report.directorApprovalStatus === 'Returned'
                      ? 'Returned by leadership'
                      : isCoordinatorVerified
                        ? 'Awaiting final release authorization'
                        : 'Pending coordinator verification'}
                </p>
              </div>
            </div>
          </div>

          {/* RETURN / REVISION FEEDBACK ALERT BOX */}
          {isReturned && latestReturnFeedback && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 space-y-2.5 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    Revision Feedback from{' '}
                    {latestReturnFeedback.actorName ||
                      latestReturnFeedback.userName}{' '}
                    (
                    {latestReturnFeedback.actorRole ||
                      latestReturnFeedback.userRole}
                    ):
                  </span>
                </div>
                <span className="text-[10px] font-mono text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                  {new Date(
                    latestReturnFeedback.timestamp,
                  ).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-rose-950 bg-white/80 p-3.5 rounded-2xl border border-rose-200 leading-relaxed font-medium">
                "
                {latestReturnFeedback.comment ||
                  latestReturnFeedback.notes ||
                  'Please adjust ratings or add descriptive notes.'}
                "
              </p>
              <p className="text-[11px] text-rose-800">
                👉 <strong>Action Required:</strong> Please review and update
                the goal ratings, notes, or home connection below, then click{' '}
                <strong>"Submit for Coordinator Review"</strong> to re-submit.
              </p>
            </div>
          )}

          {/* COORDINATOR / LEADERSHIP DRAFT VIEW-ONLY BANNER */}
          {isCoordinator && (!isDraftSubmitted || isReturned) && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <p className="font-bold text-amber-950">
                    Coordinator View-Only Mode · Stage 1: SE Teacher Draft
                  </p>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    This weekly report is currently in progress by the assigned
                    Special Education Teacher (
                    {report.teacherName ||
                      currentStudent.assignedGPKTeacherName ||
                      'Special Ed Teacher'}
                    ). Coordinators cannot edit or verify the report until the
                    teacher submits it for Coordinator Review.
                  </p>
                </div>
              </div>
              <span className="font-black px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-950 text-[10px] uppercase tracking-wider shrink-0">
                Teacher Drafting
              </span>
            </div>
          )}

          {isDirector && !isCoordinatorVerified && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between text-xs text-stone-700 shadow-2xs">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-stone-500 shrink-0" />
                <div>
                  <p className="font-bold text-stone-900">
                    Director Leadership View-Only Mode
                  </p>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    {!isDraftSubmitted
                      ? 'Special Education Teacher is currently logging weekly anecdotal observations and ratings.'
                      : 'Awaiting Special Education Coordinator verification before leadership approval.'}
                  </p>
                </div>
              </div>
              <span className="font-bold px-2.5 py-1 rounded-lg bg-stone-200 text-stone-700 text-[10px] uppercase tracking-wider shrink-0">
                View Only
              </span>
            </div>
          )}

          {/* Header Banner */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 print:border-none">
            <div className="flex items-center gap-4">
              <img
                src={
                  currentStudent.avatarUrl ||
                  'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120'
                }
                alt={currentStudent.fullName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#EFE7DC] shadow-xs"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                    Weekly IEP Progress Report
                  </span>
                  <span className="text-xs font-semibold text-stone-500">
                    GPK Support Log · {report.weekRange}
                  </span>
                </div>
                <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
                  {currentStudent.fullName}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Grade: {currentStudent.grade} ({currentStudent.className}) ·
                  Case Teacher: <strong>{report.teacherName}</strong>
                </p>
              </div>
            </div>

            {/* Student and Week Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  {isCoordinatorOrLeadership
                    ? 'Student'
                    : 'My Assigned Student'}
                </span>
                <select
                  id="weekly-student-select"
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden"
                >
                  {accessibleStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Week Number
                </span>
                <div className="flex items-center gap-1 bg-[#FAF5EF] border border-[#E8DFC8] p-1 rounded-xl">
                  <button
                    onClick={() =>
                      setSelectedWeek((prev) => Math.max(1, prev - 1))
                    }
                    className="p-1 hover:bg-stone-200/60 rounded-lg text-stone-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-xs font-bold text-stone-800">
                    Week {report.weekNumber}
                  </span>
                  <button
                    onClick={() => setSelectedWeek((prev) => prev + 1)}
                    className="p-1 hover:bg-stone-200/60 rounded-lg text-stone-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handlePrint}
                className="p-2.5 bg-white hover:bg-stone-50 border border-[#E8DFC8] rounded-xl text-stone-700 shadow-2xs transition-colors self-end"
                title="Print Weekly Report"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* IEP Plan Connection Pill Banner */}
          <div className="bg-linear-to-r from-[#FAF5EF] to-amber-50/50 border border-[#E8DFC8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6E161E] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#6E161E]/10 text-[#6E161E] px-2 py-0.5 rounded-md">
                    Connected to IEP Plan
                  </span>
                  <span className="text-xs font-bold text-stone-800">
                    {studentIEP
                      ? `IEP ${studentIEP.academicYear} · ${studentIEP.primaryClassification}`
                      : 'No IEP Plan Found'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
                  Goals are pulled directly from the student's active IEP Plan.
                  Choose the goals addressed this week; logged dates and
                  achievements sync automatically to the plan.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-nav-to-iep-plan"
              onClick={() => navigateToIEP(currentStudent.id)}
              className="px-3.5 py-2 bg-white hover:bg-[#6E161E] hover:text-white border border-[#E8DFC8] text-[#6E161E] text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center"
            >
              <span>View Student's IEP Plan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SMART Goals Addressed This Week */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-stone-900">
                    IEP SMART Goals ({totalGoalsCount})
                  </h2>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#6E161E] text-white">
                    {addressedGoalsCount} Addressed this Week
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select which goals were actively targeted during Week{' '}
                  {report.weekNumber}, rate mastery, and record observations.
                </p>
              </div>

              {/* Goal Quick Filter & Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-[#FAF5EF] border border-[#E8DFC8] p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setGoalFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${goalFilter === 'ALL' ? 'bg-[#6E161E] text-white' : 'text-stone-600 hover:text-stone-900'}`}
                  >
                    All ({totalGoalsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalFilter('ADDRESSED')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${goalFilter === 'ADDRESSED' ? 'bg-[#6E161E] text-white' : 'text-stone-600 hover:text-stone-900'}`}
                  >
                    Addressed ({addressedGoalsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalFilter('UNADDRESSED')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${goalFilter === 'UNADDRESSED' ? 'bg-[#6E161E] text-white' : 'text-stone-600 hover:text-stone-900'}`}
                  >
                    Not Addressed ({totalGoalsCount - addressedGoalsCount})
                  </button>
                </div>

                {!isFormReadOnly && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAllGoals(true)}
                      className="px-2.5 py-1.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-700 border border-[#E8DFC8] rounded-xl text-[11px] font-bold transition-colors"
                      title="Select all goals as addressed this week"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllGoals(false)}
                      className="px-2.5 py-1.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-700 border border-[#E8DFC8] rounded-xl text-[11px] font-bold transition-colors"
                      title="Clear all selections"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {totalGoalsCount === 0 ? (
              <div className="text-center py-10 bg-[#FAF5EF] rounded-2xl border border-dashed border-[#E8DFC8] space-y-3 p-6">
                <Target className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="text-sm font-bold text-stone-800">
                  No SMART Goals Found in IEP Plan
                </h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  {currentStudent.fullName} does not have SMART goals configured
                  in their IEP document yet. Open the IEP Plan to define
                  measurable learning objectives.
                </p>
                <button
                  type="button"
                  onClick={() => navigateToIEP(currentStudent.id)}
                  className="px-4 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Open IEP Plan to Add Goals
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGoals.map((gp, idx) => {
                  const iepGoal = studentIEP?.goals?.find(
                    (g) => g.id === gp.goalId,
                  );
                  const isAddressed = gp.addressedThisWeek;
                  const isAchieved =
                    gp.markedAchievedThisWeek || iepGoal?.achieved;

                  return (
                    <div
                      key={gp.goalId}
                      id={`weekly-goal-card-${gp.goalId}`}
                      className={`rounded-2xl border transition-all ${
                        isAddressed
                          ? 'bg-white border-[#E8DFC8] ring-1 ring-[#6E161E]/20 p-5 shadow-xs space-y-4'
                          : 'bg-[#FAF5EF]/70 border-stone-200 p-4 opacity-85 hover:opacity-100'
                      }`}
                    >
                      {/* Card Header & Checkbox */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            disabled={isFormReadOnly}
                            onClick={() => handleToggleGoalAddressed(gp.goalId)}
                            className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                              isAddressed
                                ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-2xs'
                                : 'bg-white text-stone-400 border-stone-300 hover:border-[#6E161E]'
                            } ${isFormReadOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                            title={
                              isAddressed
                                ? 'Click to uncheck goal'
                                : 'Click to mark goal as addressed this week'
                            }
                          >
                            {isAddressed ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : null}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-[#6E161E] text-white text-[10px] font-black uppercase tracking-wider">
                                {gp.goalCode ||
                                  iepGoal?.code ||
                                  `GL-00${idx + 1}`}
                              </span>
                              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                                Domain:{' '}
                                {gp.performanceArea ||
                                  iepGoal?.performanceArea ||
                                  'General Development'}
                              </span>
                              {isAchieved && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  Mastered / Achieved
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-bold text-stone-900 mt-1.5 leading-snug">
                              {gp.measurableGoal ||
                                iepGoal?.measurableGoal ||
                                'Target learning benchmark'}
                            </p>
                          </div>
                        </div>

                        {/* Addressed Status Toggle Button */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            disabled={isFormReadOnly}
                            onClick={() => handleToggleGoalAddressed(gp.goalId)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              isAddressed
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
                            }`}
                          >
                            {isAddressed
                              ? '✓ Addressed This Week'
                              : '+ Address This Week'}
                          </button>
                        </div>
                      </div>

                      {/* Content Shown when Addressed */}
                      {isAddressed ? (
                        <div className="pt-3 border-t border-stone-100 space-y-3.5">
                          {/* Rating Selector */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF5EF] p-3 rounded-xl border border-[#E8DFC8]">
                            <div>
                              <span className="text-xs font-bold text-stone-900 block">
                                Performance & Prompt Level:
                              </span>
                              <span className="text-[11px] text-stone-500">
                                {gp.rating === 1 &&
                                  '1 - Emerging: Needs intensive physical / verbal scaffolding'}
                                {gp.rating === 2 &&
                                  '2 - Developing: Needs frequent teacher prompting'}
                                {gp.rating === 3 &&
                                  '3 - Practicing: Demonstrating skill with occasional cues'}
                                {gp.rating === 4 &&
                                  '4 - Proficient: Performing consistently with visual cues'}
                                {gp.rating === 5 &&
                                  '5 - Mastered: Performing independently across routines'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  disabled={isFormReadOnly}
                                  onClick={() =>
                                    handleUpdateGoalRating(
                                      gp.goalId,
                                      star as any,
                                    )
                                  }
                                  className={`w-8 h-8 rounded-xl text-xs font-black border transition-all flex items-center justify-center ${
                                    gp.rating === star
                                      ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-2xs scale-105'
                                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100 disabled:opacity-60'
                                  }`}
                                  title={`Rating ${star}/5`}
                                >
                                  {star}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Observation Notes */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                              <span>
                                Weekly Anecdotal Evidence & Observation Notes:
                              </span>
                              <span className="text-stone-400 font-normal">
                                Details sync to IEP tracking history
                              </span>
                            </label>
                            <textarea
                              rows={2}
                              value={gp.notes || ''}
                              disabled={isFormReadOnly}
                              onChange={(e) =>
                                handleUpdateGoalNotes(gp.goalId, e.target.value)
                              }
                              placeholder="Describe specific strategies, response to prompts, work samples, and observable milestones..."
                              className="w-full p-2.5 text-xs bg-white border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden disabled:bg-stone-100/70"
                            />
                          </div>

                          {/* Goal Achievement Card within Report */}
                          <div
                            className={`p-3.5 rounded-xl border transition-all ${
                              gp.markedAchievedThisWeek
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                : 'bg-stone-50/70 border-stone-200 text-stone-700'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={isFormReadOnly}
                                  checked={Boolean(gp.markedAchievedThisWeek)}
                                  onChange={() =>
                                    handleToggleGoalAchieved(gp.goalId)
                                  }
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                                />
                                <span className="text-xs font-bold text-stone-900">
                                  🎯 Mark Goal as Achieved / Mastered this week
                                </span>
                              </label>

                              {gp.markedAchievedThisWeek && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-semibold text-emerald-900">
                                    Achieved Date:
                                  </span>
                                  <input
                                    type="date"
                                    disabled={isFormReadOnly}
                                    value={
                                      gp.achievedDate ||
                                      report.weekEnd ||
                                      '2026-10-23'
                                    }
                                    onChange={(e) =>
                                      handleUpdateGoalAchievedDate(
                                        gp.goalId,
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-hidden"
                                  />
                                </div>
                              )}
                            </div>

                            {gp.markedAchievedThisWeek && (
                              <div className="mt-2.5 pt-2 border-t border-emerald-200/70 space-y-1">
                                <input
                                  type="text"
                                  disabled={isFormReadOnly}
                                  value={gp.achievedNote || ''}
                                  onChange={(e) =>
                                    handleUpdateGoalAchievedNote(
                                      gp.goalId,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Achievement rationale (e.g., Demonstrated 80% independent accuracy over 4 consecutive trials)..."
                                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs text-stone-800 focus:outline-hidden"
                                />
                                <p className="text-[11px] text-emerald-800 flex items-center gap-1">
                                  <Info className="w-3 h-3 text-emerald-700 shrink-0" />
                                  <span>
                                    Saving this report will immediately update
                                    the student's Annual IEP Plan with this
                                    achievement date and mark the goal as
                                    Mastered.
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-500 italic mt-1">
                          Not targeted during this weekly rotation cycle. Click
                          "+ Address This Week" to log ratings and observation
                          notes.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Qualitative Descriptive Observations */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900">
              Qualitative Classroom Observations & Social Highlights
            </h2>
            <textarea
              rows={3}
              value={report.descriptiveObservation}
              disabled={isFormReadOnly}
              onChange={(e) =>
                setReport({ ...report, descriptiveObservation: e.target.value })
              }
              placeholder="Detail classroom participation, peer social interactions, sensory breaks, and key victories this week..."
              className="w-full p-3 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 leading-relaxed focus:outline-hidden disabled:bg-stone-100/70"
            />
          </div>

          {/* Home Connection & Parent Guidance */}
          <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-blue-700" />
              Home Connection & Weekend Guidance for Parents
            </div>
            <textarea
              rows={3}
              value={report.homeConnection}
              disabled={isFormReadOnly}
              onChange={(e) =>
                setReport({ ...report, homeConnection: e.target.value })
              }
              placeholder="Actionable recommendations for parents to practice at home over the weekend..."
              className="w-full p-3 text-xs bg-white border border-blue-300 rounded-xl text-blue-950 focus:outline-hidden disabled:bg-stone-100/70"
            />
          </div>

          {/* Sticky Bottom Action Bar Enforcing Strict Governance Flow */}
          <div
            id="weekly-report-sticky-bar"
            className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#EFE7DC] px-6 py-4 shadow-lg flex flex-wrap items-center justify-between gap-3"
          >
            {/* Left Status Info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500">
                  Current Stage:
                </span>
                <StatusBadge
                  status={
                    isDirectorApproved
                      ? 'Approved & Published'
                      : isCoordinatorVerified
                        ? 'Coordinator Verified'
                        : isDraftSubmitted
                          ? 'Coordinator Review'
                          : isReturned
                            ? 'Returned for Revision'
                            : 'Draft In Progress'
                  }
                  size="sm"
                />
              </div>

              {isDraftSubmitted && isSETeacher && !isReturned && (
                <button
                  type="button"
                  onClick={handleReopenDraft}
                  className="text-xs text-stone-500 hover:text-stone-800 underline font-medium"
                >
                  Edit draft before verification
                </button>
              )}
            </div>

            {/* Right Contextual Action Buttons */}
            <div className="flex items-center gap-2.5">
              {/* SE Teacher Buttons */}
              {isSETeacher && (
                <>
                  {(!isDraftSubmitted || isReturned) && (
                    <button
                      type="button"
                      id="btn-save-draft-weekly-report"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Draft & Sync IEP
                    </button>
                  )}

                  {!isDraftSubmitted || isReturned ? (
                    <button
                      type="button"
                      id="btn-submit-weekly-report-coordinator"
                      onClick={handleSubmitToCoordinator}
                      className="px-5 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isReturned
                        ? 'Re-submit for Coordinator Review'
                        : 'Submit for Coordinator Review'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-blue-900 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Submitted for Coordinator Review</span>
                    </div>
                  )}
                </>
              )}

              {/* Special Ed Coordinator Review Actions */}
              {isCoordinator && (
                <>
                  {(!isDraftSubmitted || isReturned) && (
                    <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200">
                      <Eye className="w-4 h-4 text-amber-700" />
                      <span>Teacher Draft In Progress (View Only)</span>
                    </div>
                  )}

                  {isDraftSubmitted && !isCoordinatorVerified && (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="px-4 py-2 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Edits
                      </button>

                      <button
                        type="button"
                        id="btn-coordinator-return-weekly-report"
                        onClick={() => {
                          setReviewAction('Return');
                          setReviewComment('');
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return to Teacher
                      </button>

                      <button
                        type="button"
                        id="btn-coordinator-verify-weekly-report"
                        onClick={() => {
                          setReviewAction('Approve');
                          setReviewComment(
                            'Verified weekly goal ratings and descriptive notes. Forwarded to Director.',
                          );
                          setShowReviewModal(true);
                        }}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verify & Forward to Director
                      </button>
                    </>
                  )}

                  {isCoordinatorVerified && (
                    <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Coordinator Verified · Forwarded to Director</span>
                    </div>
                  )}
                </>
              )}

              {/* Director / Principal Approval Actions */}
              {isDirector && (
                <>
                  {!isCoordinatorVerified && (
                    <div className="flex items-center gap-2 text-stone-600 text-xs font-semibold bg-stone-100 px-3.5 py-2 rounded-xl border border-stone-200">
                      <Eye className="w-4 h-4 text-stone-500" />
                      <span>Pending Coordinator Verification</span>
                    </div>
                  )}

                  {isCoordinatorVerified && !isDirectorApproved && (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="px-4 py-2 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                      </button>

                      <button
                        type="button"
                        id="btn-director-return-weekly-report"
                        onClick={() => {
                          setReviewAction('Return');
                          setReviewComment('');
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return for Revisions
                      </button>

                      <button
                        type="button"
                        id="btn-director-approve-weekly-report"
                        onClick={() => {
                          setReviewAction('Approve');
                          setReviewComment(
                            'Director authorized weekly IEP progress log for parent portal release.',
                          );
                          setShowReviewModal(true);
                        }}
                        className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Publish to Parent Portal
                      </button>
                    </>
                  )}

                  {isDirectorApproved && (
                    <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Published to Parent Portal</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* REVIEW & FEEDBACK MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-stone-900">
                  {isCoordinator
                    ? 'Special Ed Coordinator Review'
                    : 'Director Authorization & Release'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Week {report.weekNumber} · {currentStudent.fullName} (
                  {currentStudent.grade})
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Decision Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('Approve')}
                  className={`p-3.5 rounded-2xl border text-center font-bold transition-all ${
                    reviewAction === 'Approve'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1.5 text-emerald-600" />
                  <span>
                    {isCoordinator
                      ? 'Verify & Forward to Director'
                      : 'Approve & Release to Parents'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('Return')}
                  className={`p-3.5 rounded-2xl border text-center font-bold transition-all ${
                    reviewAction === 'Return'
                      ? 'bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-600/20 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <RotateCcw className="w-5 h-5 mx-auto mb-1.5 text-rose-600" />
                  <span>Return with Feedback</span>
                </button>
              </div>

              {/* Feedback Comment Textarea */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 flex items-center justify-between">
                  <span>
                    {reviewAction === 'Return'
                      ? 'Revision Instructions (Required):'
                      : 'Reviewer Verification Remarks:'}
                  </span>
                  {reviewAction === 'Return' && (
                    <span className="text-rose-600 text-[10px] font-black uppercase tracking-wider">
                      Mandatory
                    </span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    reviewAction === 'Return'
                      ? 'Specify which goal notes, ratings, or home recommendations require adjustment...'
                      : 'Add verification notes or leave default approval comment...'
                  }
                  className={`w-full p-3 bg-[#FAF5EF] border rounded-2xl font-normal leading-relaxed focus:outline-hidden ${
                    reviewAction === 'Return' && !reviewComment.trim()
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-[#E8DFC8] focus:border-[#6E161E]'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-workflow-review"
                  onClick={handleConfirmReviewDecision}
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs transition-colors ${
                    reviewAction === 'Approve'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {reviewAction === 'Approve'
                    ? 'Confirm Verification'
                    : 'Return Report to Teacher'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORKFLOW AUDIT TRAIL MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-[#FAF5EF]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#6E161E]" />
                <div>
                  <h3 className="font-heading font-black text-base text-stone-900">
                    Weekly Report Workflow History
                  </h3>
                  <p className="text-xs text-stone-500">
                    Student: {currentStudent.fullName} · Week{' '}
                    {report.weekNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {!report.workflowHistory ||
              report.workflowHistory.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Clock className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-stone-500 font-medium">
                    No workflow transitions recorded yet for this week.
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Transitions are logged automatically when drafts are
                    submitted, reviewed, returned, or approved.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {report.workflowHistory.map((h, i) => (
                    <div key={h.id || i} className="relative pl-9 space-y-1">
                      <div
                        className={`absolute left-2.5 top-1 w-3 h-3 rounded-full ring-4 ring-[#FAF5EF] ${
                          h.action === 'Returned' || h.status === 'Returned'
                            ? 'bg-rose-600'
                            : h.action === 'Approved' ||
                                h.status === 'Approved' ||
                                h.status === 'Done'
                              ? 'bg-emerald-600'
                              : 'bg-[#6E161E]'
                        }`}
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">
                          {h.stage} → {h.status}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(h.timestamp).toLocaleDateString()}{' '}
                          {new Date(h.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 font-medium">
                        By{' '}
                        <strong className="text-stone-800">
                          {h.actorName || h.userName}
                        </strong>{' '}
                        ({h.actorRole || h.userRole})
                      </p>
                      {(h.comment || h.notes) && (
                        <p
                          className={`p-2.5 rounded-xl border text-stone-800 mt-1 leading-relaxed ${
                            h.action === 'Returned' || h.status === 'Returned'
                              ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-medium'
                              : 'bg-[#FAF5EF] border-[#E8DFC8]'
                          }`}
                        >
                          "{h.comment || h.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 bg-[#FAF5EF] flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
