import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { IEPReport, WeeklyGoalProgress, Student, LJReviewStatus, LJApprovalStatus, WorkflowHistoryEntry } from '../../types';
import { WeeklyReportStatusTracker } from './WeeklyReportStatusTracker';
import { StatusBadge } from '../common/StatusBadge';
import { 
  FileText, 
  Calendar, 
  User, 
  Save, 
  Send, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Heart,
  AlertTriangle,
  Lightbulb,
  Star,
  ListOrdered,
  ClipboardList,
  ShieldCheck,
  RotateCcw,
  Clock,
  MessageSquare,
  ArrowRight,
  Check,
  Eye
} from 'lucide-react';

export const WeeklyReportView: React.FC = () => {
  const { 
    selectedStudentId, 
    setSelectedStudentId, 
    students, 
    currentUser, 
    showToast,
    refreshData 
  } = useApp();

  const [reportViewMode, setReportViewMode] = useState<'EDITOR' | 'STATUS_TRACKER'>('EDITOR');

  const isCoordinator = Boolean(currentUser.isSpecialEdCoordinator);
  const isDirector = currentUser.role === 'DIRECTOR' || currentUser.role === 'PRINCIPAL';
  const isCoordinatorOrLeadership = isCoordinator || isDirector;

  const isSETeacher = 
    currentUser.isGPK || 
    (currentUser.role === 'SPECIAL_ED_TEACHER' && !currentUser.isSpecialEdCoordinator);

  // Review & Feedback Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Return'>('Approve');
  const [reviewComment, setReviewComment] = useState('');

  // History / Audit trail modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Accessible students: SE teachers can only access their assigned SN students
  const accessibleStudents = useMemo(() => {
    if (isCoordinatorOrLeadership) {
      return students.filter(s => s.specialNeedsFlag);
    }
    return students.filter(
      s => s.specialNeedsFlag && (
        s.assignedGPKTeacherId === currentUser.id || 
        currentUser.assignedSpecialNeedsStudentIds?.includes(s.id)
      )
    );
  }, [students, currentUser, isCoordinatorOrLeadership]);

  const currentStudent = accessibleStudents.find(s => s.id === selectedStudentId) || accessibleStudents[0];

  const [selectedWeek, setSelectedWeek] = useState(8);

  const loadDefaultReport = (stud: Student, week: number): IEPReport => ({
    id: `wr-${stud.id}-w${week}`,
    studentId: stud.id,
    iepId: `iep-${stud.id}-2026`,
    year: '2026',
    weekNumber: week,
    weekRange: week === 8 ? 'Oct 19 – 23, 2026' : `Week ${week}`,
    weekStart: '2026-10-19',
    weekEnd: '2026-10-23',
    teacherId: stud.assignedGPKTeacherId || currentUser.id,
    teacherName: stud.assignedGPKTeacherName || currentUser.name,
    status: 'Draft',
    draftStatus: 'On Progress',
    coordinatorReviewStatus: 'Not Started',
    directorApprovalStatus: 'Not Started',
    workflowHistory: [],
    goalProgress: [
      {
        goalId: 'g1',
        addressedThisWeek: true,
        rating: 4,
        notes: `Utilized calm-down headphones during fire alarm drill. Transitioned back to desk with 1 verbal prompt.`
      },
      {
        goalId: 'g2',
        addressedThisWeek: true,
        rating: 4,
        notes: `Maintained 10 minutes of fine motor tasks on slant board without complaints.`
      }
    ],
    descriptiveObservation: `${stud.nickname || stud.fullName} showed enthusiastic engagement during movement stations and classroom routines.`,
    homeConnection: 'Encourage 10 minutes of finger grip or playdough strengthening over the weekend.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [report, setReport] = useState<IEPReport>(() => {
    if (!currentStudent) {
      return loadDefaultReport({ id: 'temp', fullName: 'Student', name: 'Student', specialNeedsFlag: true } as any, 8);
    }
    const existing = storageService.getIEPReports(currentStudent.id);
    const match = existing.find(r => r.weekNumber === selectedWeek);
    if (match) return match;
    return loadDefaultReport(currentStudent, selectedWeek);
  });

  // Sync report on student or week change
  useEffect(() => {
    if (!currentStudent) return;
    const existing = storageService.getIEPReports(currentStudent.id);
    const match = existing.find(r => r.weekNumber === selectedWeek);
    if (match) {
      setReport(match);
    } else {
      setReport(loadDefaultReport(currentStudent, selectedWeek));
    }
  }, [currentStudent?.id, selectedWeek]);

  // Find latest return feedback if returned
  const latestReturnFeedback = useMemo(() => {
    if (!report.workflowHistory || report.workflowHistory.length === 0) return null;
    return report.workflowHistory.find(h => 
      h.action === 'Returned' || 
      h.status === 'Returned' || 
      h.status === 'RETURNED'
    ) || null;
  }, [report.workflowHistory]);

  const isDraftSubmitted = report.draftStatus === 'Done';
  const isCoordinatorVerified = report.coordinatorReviewStatus === 'Done';
  const isDirectorApproved = report.directorApprovalStatus === 'Done';
  const isReturned = report.coordinatorReviewStatus === 'Returned' || report.directorApprovalStatus === 'Returned';

  // Role-based editing authorization
  // 1. SE Teacher can edit only during their drafting stage or when returned for revisions
  const canSETeacherEdit = isSETeacher && (!isDraftSubmitted || isReturned);
  
  // 2. Coordinator can edit only during Coordinator Review stage (after teacher submission and before coordinator verification)
  const canCoordinatorEdit = isCoordinator && isDraftSubmitted && !isCoordinatorVerified;
  
  // 3. Director can edit only during Director Approval stage
  const canDirectorEdit = isDirector && isCoordinatorVerified && !isDirectorApproved;

  const canCurrentUserEdit = canSETeacherEdit || canCoordinatorEdit || canDirectorEdit;
  const isFormReadOnly = !canCurrentUserEdit;

  const handleUpdateGoalRating = (goalId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    if (isFormReadOnly) return;
    setReport(prev => ({
      ...prev,
      goalProgress: prev.goalProgress.map(gp => gp.goalId === goalId ? { ...gp, rating } : gp)
    }));
  };

  const handleUpdateGoalNotes = (goalId: string, notes: string) => {
    if (isFormReadOnly) return;
    setReport(prev => ({
      ...prev,
      goalProgress: prev.goalProgress.map(gp => gp.goalId === goalId ? { ...gp, notes } : gp)
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
          : 'You cannot edit this weekly report at its current workflow stage.'
      );
      return;
    }
    if (isSETeacher && currentStudent.assignedGPKTeacherId !== currentUser.id && !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)) {
      showToast('error', 'Unauthorized Access', 'You can only save weekly reports for students assigned to you.');
      return;
    }
    const updated: IEPReport = {
      ...report,
      studentId: currentStudent.id,
      teacherId: report.teacherId || currentUser.id,
      teacherName: report.teacherName || currentUser.name,
      draftStatus: isDraftSubmitted ? report.draftStatus : 'On Progress',
      updatedAt: new Date().toISOString()
    };
    storageService.saveIEPReport(updated);
    setReport(updated);
    showToast('success', 'Changes Saved', `Weekly progress report for ${currentStudent.fullName} (Week ${report.weekNumber}) updated.`);
    refreshData();
  };

  // 2. Submit Draft for Coordinator Review (SE Teacher)
  const handleSubmitToCoordinator = () => {
    if (!isCoordinatorOrLeadership && currentStudent.assignedGPKTeacherId !== currentUser.id && !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)) {
      showToast('error', 'Unauthorized Access', 'You can only submit weekly reports for students assigned to you.');
      return;
    }

    // Save first
    const saved = storageService.saveIEPReport({
      ...report,
      studentId: currentStudent.id,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      updatedAt: new Date().toISOString()
    });

    const updated = storageService.updateWeeklyReportWorkflow(
      saved.id,
      'draftStatus',
      'Done',
      currentUser,
      `Submitted Week ${report.weekNumber} progress log for Special Education Coordinator verification.`
    );

    if (updated) {
      setReport(updated);
    }
    showToast(
      'success',
      'Submitted for Coordinator Review',
      `Week ${report.weekNumber} IEP report submitted to Ms. Elena Johnson (Special Ed Coordinator).`
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
      updatedAt: new Date().toISOString()
    };
    storageService.saveIEPReport(updated);
    setReport(updated);
    showToast('info', 'Draft Re-opened', 'You can now edit and re-submit this weekly progress report.');
    refreshData();
  };

  // 4. Submit Coordinator or Director Decision
  const handleConfirmReviewDecision = () => {
    if (reviewAction === 'Return' && !reviewComment.trim()) {
      showToast('error', 'Feedback Required', 'Please explain what needs to be revised or adjusted in the report.');
      return;
    }

    // Save any pending edits first
    storageService.saveIEPReport(report);

    if (isCoordinator) {
      const status: LJReviewStatus = reviewAction === 'Approve' ? 'Done' : 'Returned';
      const updated = storageService.updateWeeklyReportWorkflow(
        report.id,
        'coordinatorReviewStatus',
        status,
        currentUser,
        reviewComment.trim() || (reviewAction === 'Approve' ? 'Verified weekly goal ratings and descriptive notes. Forwarded to Director.' : 'Returned to teacher for revisions.')
      );
      if (updated) setReport(updated);
      showToast(
        reviewAction === 'Approve' ? 'success' : 'info',
        reviewAction === 'Approve' ? 'Coordinator Verified' : 'Returned to Teacher with Feedback',
        reviewAction === 'Approve' ? 'Report forwarded to Director for parent portal release.' : 'Report returned to SE teacher for adjustments.'
      );
    } else if (isDirector) {
      const status: LJApprovalStatus = reviewAction === 'Approve' ? 'Done' : 'Returned';
      const updated = storageService.updateWeeklyReportWorkflow(
        report.id,
        'directorApprovalStatus',
        status,
        currentUser,
        reviewComment.trim() || (reviewAction === 'Approve' ? 'Director authorized weekly IEP progress log. Published to Parent Portal.' : 'Returned for revisions.')
      );
      if (updated) setReport(updated);
      showToast(
        reviewAction === 'Approve' ? 'success' : 'info',
        reviewAction === 'Approve' ? 'Approved & Published' : 'Returned by Director',
        reviewAction === 'Approve' ? 'Weekly IEP progress log is now accessible on the Parent Portal.' : 'Report returned for adjustments.'
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
      <div id="weekly-report-restricted-view" className="max-w-3xl mx-auto my-12 bg-white border border-[#EFE7DC] rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="font-heading font-black text-lg text-stone-900">No Special Needs Students Assigned Yet</h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
          Special Education and GPK teachers can only access, create, and log Weekly IEP Reports for students assigned to their 1:1 / caseload care.
        </p>
        <p className="text-xs text-stone-500">
          Please contact the Special Education Coordinator (<strong>Ms. Elena Johnson</strong>) to assign students to your profile.
        </p>
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
              <strong>Tied SE Teacher Access:</strong> You are authorized to access, create, and submit Weekly IEP Reports strictly for your assigned student(s): <strong className="text-amber-950">{accessibleStudents.map(s => s.fullName).join(', ')}</strong>.
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
            <span>2. Weekly Reports Status Tracker ({isCoordinatorOrLeadership ? 'All Students' : 'My Caseload'})</span>
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
                <span>{report.workflowHistory?.length || 0} transitions logged</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1: Teacher Draft */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isDraftSubmitted 
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Step 1 · SE Teacher Draft
                  </span>
                  <StatusBadge status={report.draftStatus || 'On Progress'} size="sm" />
                </div>
                <p className="font-bold text-xs">
                  {report.teacherName || currentStudent.assignedGPKTeacherName || 'Special Ed Teacher'}
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {isDraftSubmitted ? 'Progress logged & submitted' : 'Logging weekly anecdotal observations'}
                </p>
              </div>

              {/* Step 2: Coordinator Review */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isCoordinatorVerified
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : report.coordinatorReviewStatus === 'Returned'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : isDraftSubmitted
                  ? 'bg-blue-50/80 border-blue-200 text-blue-950 ring-1 ring-blue-400/30'
                  : 'bg-stone-50 border-stone-200 text-stone-600 opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Step 2 · SpecEd Coordinator
                  </span>
                  <StatusBadge status={report.coordinatorReviewStatus || 'Not Started'} size="sm" />
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
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isDirectorApproved
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : report.directorApprovalStatus === 'Returned'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : isCoordinatorVerified
                  ? 'bg-purple-50/80 border-purple-200 text-purple-950 ring-1 ring-purple-400/30'
                  : 'bg-stone-50 border-stone-200 text-stone-600 opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Step 3 · Director / Principal
                  </span>
                  <StatusBadge status={report.directorApprovalStatus || 'Not Started'} size="sm" />
                </div>
                <p className="font-bold text-xs">Director & Principal Leadership</p>
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
                  <span>Revision Feedback from {latestReturnFeedback.actorName || latestReturnFeedback.userName} ({latestReturnFeedback.actorRole || latestReturnFeedback.userRole}):</span>
                </div>
                <span className="text-[10px] font-mono text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                  {new Date(latestReturnFeedback.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-rose-950 bg-white/80 p-3.5 rounded-2xl border border-rose-200 leading-relaxed font-medium">
                "{latestReturnFeedback.comment || latestReturnFeedback.notes || 'Please adjust ratings or add descriptive notes.'}"
              </p>
              <p className="text-[11px] text-rose-800">
                👉 <strong>Action Required:</strong> Please review and update the goal ratings, notes, or home connection below, then click <strong>"Submit for Coordinator Review"</strong> to re-submit.
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
                    This weekly report is currently in progress by the assigned Special Education Teacher ({report.teacherName || currentStudent.assignedGPKTeacherName || 'Special Ed Teacher'}). 
                    Coordinators cannot edit or verify the report until the teacher submits it for Coordinator Review.
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
                src={currentStudent.avatarUrl || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120'}
                alt={currentStudent.fullName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#EFE7DC] shadow-xs"
              />
              <div>
                <div className="flex items-center gap-2">
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
                  Grade: {currentStudent.grade} ({currentStudent.className}) · Special Ed Case Teacher: {report.teacherName}
                </p>
              </div>
            </div>

            {/* Student and Week Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  {isCoordinatorOrLeadership ? 'Student' : 'My Assigned Student'}
                </span>
                <select
                  id="weekly-student-select"
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    const ex = storageService.getIEPReports(e.target.value);
                    if (ex.length > 0) setReport(ex[0]);
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden"
                >
                  {accessibleStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.grade})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Week
                </span>
                <div className="flex items-center gap-1 bg-[#FAF5EF] border border-[#E8DFC8] p-1 rounded-xl">
                  <button
                    onClick={() => setSelectedWeek(prev => Math.max(1, prev - 1))}
                    className="p-1 hover:bg-stone-200/60 rounded-lg text-stone-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-xs font-bold text-stone-800">
                    Week {report.weekNumber}
                  </span>
                  <button
                    onClick={() => setSelectedWeek(prev => prev + 1)}
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

          {/* SMART Goals Addressed This Week */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Target SMART Goals Progress This Week
                </h2>
                <p className="text-xs text-stone-500">
                  Rate student performance and provide anecdotal evidence for IEP milestones.
                </p>
              </div>
              <span className="text-[11px] font-bold text-stone-500 bg-[#FAF5EF] border border-[#E8DFC8] px-2.5 py-1 rounded-xl">
                Scale: 1 (Emerging) to 5 (Mastered)
              </span>
            </div>

            <div className="space-y-4">
              {report.goalProgress.map((gp, idx) => (
                <div key={gp.goalId} className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#6E161E] text-white text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-stone-900">
                        Goal {gp.goalId.toUpperCase()}: {idx === 0 ? 'Emotional Self-Regulation & Transitions' : 'Handwriting Endurance on Slant Board'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-stone-500 mr-1">Rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={isFormReadOnly}
                          onClick={() => handleUpdateGoalRating(gp.goalId, star as any)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
                            gp.rating === star
                              ? 'bg-[#6E161E] text-white border-[#6E161E]'
                              : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100 disabled:opacity-60'
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={gp.notes || ''}
                    disabled={isFormReadOnly}
                    onChange={(e) => handleUpdateGoalNotes(gp.goalId, e.target.value)}
                    placeholder="Weekly anecdotal evidence, prompt level, and intervention notes..."
                    className="w-full p-2.5 text-xs bg-white border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden disabled:bg-stone-100/70"
                  />
                </div>
              ))}
            </div>
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
              onChange={(e) => setReport({ ...report, descriptiveObservation: e.target.value })}
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
              onChange={(e) => setReport({ ...report, homeConnection: e.target.value })}
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
                <span className="text-xs font-bold text-stone-500">Current Stage:</span>
                <StatusBadge 
                  status={
                    isDirectorApproved ? 'Approved & Published' :
                    isCoordinatorVerified ? 'Coordinator Verified' :
                    isDraftSubmitted ? 'Coordinator Review' :
                    isReturned ? 'Returned for Revision' :
                    'Draft In Progress'
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
                      Save Draft
                    </button>
                  )}

                  {(!isDraftSubmitted || isReturned) ? (
                    <button
                      type="button"
                      id="btn-submit-weekly-report-coordinator"
                      onClick={handleSubmitToCoordinator}
                      className="px-5 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isReturned ? 'Re-submit for Coordinator Review' : 'Submit for Coordinator Review'}
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
                          setReviewComment('Verified weekly goal ratings and descriptive notes. Forwarded to Director.');
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
                          setReviewComment('Director authorized weekly IEP progress log for parent portal release.');
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
                  {isCoordinator ? 'Special Ed Coordinator Review' : 'Director Authorization & Release'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Week {report.weekNumber} · {currentStudent.fullName} ({currentStudent.grade})
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
                  <span>{isCoordinator ? 'Verify & Forward to Director' : 'Approve & Release to Parents'}</span>
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
                  <span>{reviewAction === 'Return' ? 'Revision Instructions (Required):' : 'Reviewer Verification Remarks:'}</span>
                  {reviewAction === 'Return' && (
                    <span className="text-rose-600 text-[10px] font-black uppercase tracking-wider">Mandatory</span>
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
                  {reviewAction === 'Approve' ? 'Confirm Verification' : 'Return Report to Teacher'}
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
                  <h3 className="font-heading font-black text-base text-stone-900">Weekly Report Workflow History</h3>
                  <p className="text-xs text-stone-500">Student: {currentStudent.fullName} · Week {report.weekNumber}</p>
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
              {(!report.workflowHistory || report.workflowHistory.length === 0) ? (
                <div className="text-center py-8 space-y-2">
                  <Clock className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-stone-500 font-medium">No workflow transitions recorded yet for this week.</p>
                  <p className="text-[11px] text-stone-400">Transitions are logged automatically when drafts are submitted, reviewed, returned, or approved.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {report.workflowHistory.map((h, i) => (
                    <div key={h.id || i} className="relative pl-9 space-y-1">
                      <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full ring-4 ring-[#FAF5EF] ${
                        h.action === 'Returned' || h.status === 'Returned'
                          ? 'bg-rose-600'
                          : h.action === 'Approved' || h.status === 'Approved' || h.status === 'Done'
                          ? 'bg-emerald-600'
                          : 'bg-[#6E161E]'
                      }`} />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{h.stage} → {h.status}</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 font-medium">
                        By <strong className="text-stone-800">{h.actorName || h.userName}</strong> ({h.actorRole || h.userRole})
                      </p>
                      {(h.comment || h.notes) && (
                        <p className={`p-2.5 rounded-xl border text-stone-800 mt-1 leading-relaxed ${
                          h.action === 'Returned' || h.status === 'Returned'
                            ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-medium'
                            : 'bg-[#FAF5EF] border-[#E8DFC8]'
                        }`}>
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
