import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  weeklyReportService,
  type WeeklyReport,
} from '../../services/weeklyReportService';
import { IEPReport, LJReviewStatus, LJApprovalStatus } from '../../types';
import {
  isoWeekForDate,
  isoWeeksInYear,
  weeklyReportDateRange,
} from '../../services/weeklyReportDates';
import { attendanceService } from '../../services/attendanceService';
import { isRequestCancelled } from '../../services/apiClient';
import { StatusBadge } from '../common/StatusBadge';
import {
  Search,
  CheckCircle2,
  RotateCcw,
  Edit3,
  Clock,
  Send,
  ShieldCheck,
  Calendar,
  ArrowRight,
} from 'lucide-react';

export function clampIsoWeekForYear(year: number, weekNumber: number) {
  return Math.min(weekNumber, isoWeeksInYear(year));
}

export function weeklyReportHeading(year: number, weekNumber: number) {
  return `Week ${weekNumber} (${weeklyReportDateRange(year, weekNumber).range})`;
}

export function reportYearOptions(
  currentIsoYear: number,
  selectedYear: number,
  radius = 5,
) {
  const start = currentIsoYear - radius;
  const end = currentIsoYear + radius;
  const years = Array.from(
    { length: end - start + 1 },
    (_, index) => start + index,
  );
  if (!years.includes(selectedYear)) years.push(selectedYear);
  return years.sort((a, b) => b - a);
}

export function findWeeklyReportForStudent(
  reports: readonly WeeklyReport[],
  studentId: string,
  weekNumber: number,
  year: number,
) {
  return reports.find(
    (report) =>
      report.studentId === studentId &&
      report.weekNumber === weekNumber &&
      Number(report.year) === year,
  );
}

interface WeeklyReportStatusTrackerProps {
  onSelectReportForEdit?: (
    studentId: string,
    weekNumber: number,
    reportId?: string,
    year?: number,
  ) => void;
}

export const WeeklyReportStatusTracker: React.FC<
  WeeklyReportStatusTrackerProps
> = ({ onSelectReportForEdit }) => {
  const {
    organizationId,
    currentUser,
    students,
    setSelectedStudentId,
    showToast,
    refreshData,
  } = useApp();

  const [calendarStatus, setCalendarStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [calendarError, setCalendarError] = useState<string>();
  const [calendarRetry, setCalendarRetry] = useState(0);
  const [currentIsoYear, setCurrentIsoYear] = useState(2026);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All Grades');
  const [stageFilter, setStageFilter] = useState('All Stages');

  // Review modal
  const [reviewingReport, setReviewingReport] = useState<IEPReport | null>(
    null,
  );
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Return'>(
    'Approve',
  );
  const [reviewComment, setReviewComment] = useState('');

  // History modal
  const [historyReport, setHistoryReport] = useState<IEPReport | null>(null);
  const [allReports, setAllReports] = useState<WeeklyReport[]>([]);
  const [reportStatus, setReportStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [reportError, setReportError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [isMutating, setIsMutating] = useState(false);

  const isCoordinator = currentUser.isSpecialEdCoordinator;
  const isDirector =
    currentUser.role === 'DIRECTOR' || currentUser.role === 'PRINCIPAL';
  const isSETeacher =
    currentUser.isGPK ||
    (currentUser.role === 'SPECIAL_ED_TEACHER' &&
      !currentUser.isSpecialEdCoordinator);

  const specialStudents = useMemo(() => {
    if (isCoordinator || isDirector) {
      return students.filter((s) => s.specialNeedsFlag);
    }
    return students.filter(
      (s) =>
        s.specialNeedsFlag &&
        (s.assignedGPKTeacherId === currentUser.id ||
          currentUser.assignedSpecialNeedsStudentIds?.includes(s.id)),
    );
  }, [students, currentUser, isCoordinator, isDirector]);

  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    setCalendarStatus('loading');
    setCalendarError(undefined);
    setAllReports([]);
    void attendanceService
      .getSchoolDate(organizationId, controller.signal)
      .then((response) => {
        const current = isoWeekForDate(response.data.schoolDate);
        setCurrentIsoYear(current.year);
        setSelectedYear(current.year);
        setSelectedWeek(current.week);
        setCalendarStatus('ready');
      })
      .catch((error: unknown) => {
        if (isRequestCancelled(error)) return;
        setCalendarStatus('error');
        setCalendarError(
          error instanceof Error
            ? error.message
            : 'The organization school date could not be loaded.',
        );
      });
    return () => controller.abort();
  }, [organizationId, calendarRetry]);

  useEffect(() => {
    if (!organizationId || calendarStatus !== 'ready') return;
    const controller = new AbortController();
    setReportStatus('loading');
    setReportError(undefined);
    weeklyReportService
      .getWeeklyReports(
        organizationId,
        { year: selectedYear, weekNumber: selectedWeek },
        controller.signal,
      )
      .then((reports) => {
        setAllReports(reports);
        setReportStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReportStatus('error');
        setReportError(
          error instanceof Error
            ? error.message
            : 'Weekly reports could not be loaded.',
        );
      });
    return () => controller.abort();
  }, [calendarStatus, organizationId, selectedYear, selectedWeek, retry]);

  const selectedHeading = useMemo(
    () => weeklyReportHeading(selectedYear, selectedWeek),
    [selectedYear, selectedWeek],
  );
  const selectableYears = useMemo(
    () => reportYearOptions(currentIsoYear, selectedYear),
    [currentIsoYear, selectedYear],
  );

  // Build rows for the selected week
  const studentReportRows = useMemo(() => {
    if (reportStatus !== 'ready') return [];
    return specialStudents.map((student) => {
      const persistedReport = findWeeklyReportForStudent(
        allReports,
        student.id,
        selectedWeek,
        selectedYear,
      );
      const dates = weeklyReportDateRange(selectedYear, selectedWeek);
      const match = persistedReport || {
        id: `new-${student.id}-${selectedYear}-w${selectedWeek}`,
        studentId: student.id,
        iepId: `iep-${student.id}-${selectedYear}`,
        year: String(selectedYear),
        weekNumber: selectedWeek,
        weekRange: dates.range,
        weekStart: dates.start,
        weekEnd: dates.end,
        teacherId: student.assignedGPKTeacherId || currentUser.id,
        teacherName: student.assignedGPKTeacherName || currentUser.name,
        status: 'Draft' as const,
        draftStatus: 'Not Started' as const,
        coordinatorReviewStatus: 'Not Started' as LJReviewStatus,
        directorApprovalStatus: 'Not Started' as LJApprovalStatus,
        goalProgress: [],
        descriptiveObservation: '',
        homeConnection: '',
        workflowHistory: [],
      };
      return {
        student,
        report: match,
        hasPersistedReport: Boolean(persistedReport),
      };
    });
  }, [
    reportStatus,
    specialStudents,
    allReports,
    selectedYear,
    selectedWeek,
    currentUser,
  ]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return studentReportRows.filter(({ student, report }) => {
      if (
        searchFilter &&
        !student.name.toLowerCase().includes(searchFilter.toLowerCase())
      )
        return false;
      if (gradeFilter !== 'All Grades' && student.grade !== gradeFilter)
        return false;
      if (stageFilter === 'Draft' && report.draftStatus !== 'Done')
        return false;
      if (
        stageFilter === 'Coordinator Review' &&
        report.coordinatorReviewStatus !== 'On Progress' &&
        report.coordinatorReviewStatus !== 'Returned'
      )
        return false;
      if (
        stageFilter === 'Director Approval' &&
        report.directorApprovalStatus !== 'On Progress' &&
        report.directorApprovalStatus !== 'Returned'
      )
        return false;
      if (
        stageFilter === 'Approved' &&
        report.directorApprovalStatus !== 'Done'
      )
        return false;
      return true;
    });
  }, [studentReportRows, searchFilter, gradeFilter, stageFilter]);

  // KPI counts for this week
  const totalCount = studentReportRows.length;
  const draftCount = studentReportRows.filter(
    (r) => r.report.draftStatus !== 'Done',
  ).length;
  const coordinatorReviewCount = studentReportRows.filter(
    (r) =>
      r.report.draftStatus === 'Done' &&
      r.report.coordinatorReviewStatus !== 'Done',
  ).length;
  const directorApprovalCount = studentReportRows.filter(
    (r) =>
      r.report.coordinatorReviewStatus === 'Done' &&
      r.report.directorApprovalStatus !== 'Done',
  ).length;
  const approvedCount = studentReportRows.filter(
    (r) => r.report.directorApprovalStatus === 'Done',
  ).length;

  // Handle Submit Draft (Teacher)
  const handleSubmitDraft = async (rep: IEPReport) => {
    setIsMutating(true);
    try {
      const updated = await weeklyReportService.submitWeeklyReport(
        organizationId,
        rep,
      );
      setAllReports((reports) =>
        reports.map((report) => (report.id === updated.id ? updated : report)),
      );
      refreshData();
      showToast(
        'success',
        'Weekly Report Submitted',
        `Week ${rep.weekNumber} IEP report submitted for verification.`,
      );
    } catch (error) {
      showToast(
        'error',
        'Could Not Submit Weekly Report',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsMutating(false);
    }
  };

  // Handle Submit Review (Coordinator or Director)
  const handleSubmitReview = async () => {
    if (!reviewingReport) return;

    if (reviewAction === 'Return' && !reviewComment.trim()) {
      showToast(
        'error',
        'Feedback Required',
        'Please provide revision remarks for the assigned teacher.',
      );
      return;
    }

    setIsMutating(true);
    try {
      const updated = isCoordinator
        ? await weeklyReportService.coordinatorDecision(
            organizationId,
            reviewingReport,
            reviewAction === 'Approve' ? 'APPROVE' : 'RETURN',
            reviewComment ||
              'Verified weekly goal ratings and descriptive notes.',
          )
        : await weeklyReportService.directorDecision(
            organizationId,
            reviewingReport,
            reviewAction === 'Approve' ? 'APPROVE' : 'RETURN',
            reviewComment ||
              'Director authorized weekly IEP progress log for parent portal release.',
          );
      setAllReports((reports) =>
        reports.map((report) => (report.id === updated.id ? updated : report)),
      );
      showToast(
        reviewAction === 'Approve' ? 'success' : 'info',
        isCoordinator
          ? reviewAction === 'Approve'
            ? 'Coordinator Verified'
            : 'Returned for Adjustments'
          : reviewAction === 'Approve'
            ? 'Weekly Report Approved'
            : 'Returned by Director',
        isCoordinator
          ? reviewAction === 'Approve'
            ? 'Weekly report forwarded to Director.'
            : 'Weekly report returned to teacher.'
          : reviewAction === 'Approve'
            ? 'Weekly progress report released to Parent Portal.'
            : 'Report returned to Coordinator.',
      );
      setReviewingReport(null);
      refreshData();
    } catch (error) {
      showToast(
        'error',
        'Could Not Process Decision',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsMutating(false);
    }
  };

  if (calendarStatus !== 'ready') {
    return (
      <div className="rounded-xl border border-[#E8DFC8] bg-[#FAF5EF] px-4 py-5 text-sm text-stone-700 space-y-3">
        <p className="font-semibold">
          {calendarStatus === 'loading'
            ? 'Loading the organization school date…'
            : calendarError}
        </p>
        {calendarStatus === 'error' && (
          <button
            type="button"
            onClick={() => setCalendarRetry((attempt) => attempt + 1)}
            className="rounded-lg bg-[#6E161E] px-3 py-1.5 text-xs font-bold text-white"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (reportStatus !== 'ready') {
    return (
      <div className="rounded-xl border border-[#E8DFC8] bg-[#FAF5EF] px-4 py-5 text-sm text-stone-700 space-y-3">
        <p className="font-semibold">
          {reportStatus === 'loading'
            ? 'Loading weekly report statuses…'
            : reportError}
        </p>
        {reportStatus === 'error' && (
          <button
            type="button"
            onClick={() => setRetry((attempt) => attempt + 1)}
            className="rounded-lg bg-[#6E161E] px-3 py-1.5 text-xs font-bold text-white"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="weekly-report-status-tracker-container" className="space-y-6">
      {/* Week Selector Bar */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#6E161E]" />
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              Select Target Academic Week
            </span>
            <h3 className="font-heading font-bold text-sm text-stone-900">
              {selectedHeading}
            </h3>
          </div>
        </div>

        <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
          <label className="sr-only" htmlFor="weekly-report-year-select">
            Report year
          </label>
          <select
            id="weekly-report-year-select"
            value={selectedYear}
            onChange={(event) => {
              const nextYear = Number(event.target.value);
              setSelectedYear(nextYear);
              setSelectedWeek((week) => clampIsoWeekForYear(nextYear, week));
            }}
            className="shrink-0 rounded-xl border border-[#E8DFC8] bg-[#FAF5EF] px-3 py-1.5 text-xs font-bold text-stone-700"
          >
            {selectableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {Array.from(
            { length: isoWeeksInYear(selectedYear) },
            (_, index) => index + 1,
          ).map((w) => (
            <button
              key={w}
              id={`select-week-btn-${w}`}
              onClick={() => setSelectedWeek(w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedWeek === w
                  ? 'bg-[#6E161E] text-white shadow-xs'
                  : 'bg-[#FAF5EF] text-stone-700 hover:bg-[#F2EAE0] border border-[#E8DFC8]'
              }`}
            >
              Week {w}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStageFilter('All Stages')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'All Stages'
              ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-sm'
              : 'bg-white border-[#EFE7DC]'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase ${stageFilter === 'All Stages' ? 'text-white/80' : 'text-stone-400'}`}
          >
            Total Reports
          </span>
          <p
            className={`text-xl font-black mt-0.5 ${stageFilter === 'All Stages' ? 'text-white' : 'text-stone-900'}`}
          >
            {totalCount}
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Draft')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'Draft'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white border-[#EFE7DC]'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase ${stageFilter === 'Draft' ? 'text-white/80' : 'text-amber-600'}`}
          >
            1. Teacher Draft
          </span>
          <p
            className={`text-xl font-black mt-0.5 ${stageFilter === 'Draft' ? 'text-white' : 'text-amber-700'}`}
          >
            {draftCount}
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Coordinator Review')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'Coordinator Review'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white border-[#EFE7DC]'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase ${stageFilter === 'Coordinator Review' ? 'text-white/80' : 'text-blue-600'}`}
          >
            2. Coordinator Review
          </span>
          <p
            className={`text-xl font-black mt-0.5 ${stageFilter === 'Coordinator Review' ? 'text-white' : 'text-blue-700'}`}
          >
            {coordinatorReviewCount}
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Director Approval')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'Director Approval'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white border-[#EFE7DC]'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase ${stageFilter === 'Director Approval' ? 'text-white/80' : 'text-purple-600'}`}
          >
            3. Director Approval
          </span>
          <p
            className={`text-xl font-black mt-0.5 ${stageFilter === 'Director Approval' ? 'text-white' : 'text-purple-700'}`}
          >
            {directorApprovalCount}
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Approved')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            stageFilter === 'Approved'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white border-[#EFE7DC]'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase ${stageFilter === 'Approved' ? 'text-white/80' : 'text-emerald-700'}`}
          >
            4. Released to Parents
          </span>
          <p
            className={`text-xl font-black mt-0.5 ${stageFilter === 'Approved' ? 'text-white' : 'text-emerald-800'}`}
          >
            {approvedCount}
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search student..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="text-xs font-semibold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl px-3 py-2 focus:outline-hidden"
          >
            <option value="All Grades">All Grades</option>
            <option value="1">Grade 1</option>
            <option value="2">Grade 2</option>
            <option value="3">Grade 3</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs font-semibold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl px-3 py-2 focus:outline-hidden"
          >
            <option value="All Stages">All Stages</option>
            <option value="Draft">Drafting</option>
            <option value="Coordinator Review">Coordinator Review</option>
            <option value="Director Approval">Director Approval</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Report Status Table */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#EFE7DC] bg-[#FAF5EF] text-stone-600 font-bold">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Grade</th>
                <th className="py-3.5 px-4 text-center">
                  Draft (Assigned GPK)
                </th>
                <th className="py-3.5 px-4 text-center">Coordinator Review</th>
                <th className="py-3.5 px-4 text-center">Director Approval</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE7DC] text-stone-800">
              {filteredRows.map(({ student, report, hasPersistedReport }) => {
                const isAssignedGPK =
                  (student.assignedGPKTeacherId === currentUser.id ||
                    currentUser.assignedSpecialNeedsStudentIds?.includes(
                      student.id,
                    )) &&
                  !isCoordinator;
                const canSubmitDraft =
                  isAssignedGPK &&
                  report.draftStatus !== 'Done' &&
                  allReports.some((persisted) => persisted.id === report.id);
                const canReviewCoordinator =
                  isCoordinator &&
                  report.draftStatus === 'Done' &&
                  report.coordinatorReviewStatus !== 'Done';
                const canReviewDirector =
                  isDirector &&
                  report.coordinatorReviewStatus === 'Done' &&
                  report.directorApprovalStatus !== 'Done';

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-[#FAF5EF]/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            student.avatarUrl ||
                            'https://images.unsplash.com/photo-1544717305-2782549b5136?w=80'
                          }
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover border border-stone-200"
                        />
                        <div>
                          <p className="font-bold text-stone-900">
                            {student.name}
                          </p>
                          <span className="text-[10px] text-stone-400 font-mono">
                            NISN: {student.nisn}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-stone-700">
                      Grade {student.grade}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge
                          status={report.draftStatus || 'Not Started'}
                          size="sm"
                        />
                        <span className="text-[10px] text-stone-500 font-medium">
                          {student.assignedGPKTeacherName || 'Assigned GPK'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge
                          status={
                            report.coordinatorReviewStatus || 'Not Started'
                          }
                          size="sm"
                        />
                        <span className="text-[10px] text-stone-500 font-medium">
                          SpecEd Coordinator
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge
                          status={
                            report.directorApprovalStatus || 'Not Started'
                          }
                          size="sm"
                        />
                        <span className="text-[10px] text-stone-500 font-medium">
                          Director / Principal
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHistoryReport(report)}
                          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                          title="View Workflow Audit Trail"
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            if (onSelectReportForEdit)
                              onSelectReportForEdit(
                                student.id,
                                report.weekNumber,
                                hasPersistedReport ? report.id : undefined,
                                Number(report.year),
                              );
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF5EF] hover:bg-[#6E161E] hover:text-white border border-[#E8DFC8] rounded-xl font-bold text-stone-700 transition-all text-xs shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Report Log</span>
                        </button>

                        {canSubmitDraft && (
                          <button
                            onClick={() => handleSubmitDraft(report)}
                            disabled={isMutating}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#6E161E] hover:bg-[#581117] text-white rounded-xl font-bold transition-all text-xs shadow-2xs disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit</span>
                          </button>
                        )}

                        {canReviewCoordinator && (
                          <button
                            onClick={() => {
                              setReviewingReport(report);
                              setReviewAction('Approve');
                              setReviewComment('');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs shadow-2xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        )}

                        {canReviewDirector && (
                          <button
                            onClick={() => {
                              setReviewingReport(report);
                              setReviewAction('Approve');
                              setReviewComment('');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all text-xs shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW & APPROVAL MODAL WITH REPORT DRAFT PREVIEW */}
      {reviewingReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="font-heading font-black text-base text-stone-900">
                  {isCoordinator
                    ? 'Special Ed Coordinator Review'
                    : 'Director Authorization & Release'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Week {reviewingReport.weekNumber} ({reviewingReport.weekRange}
                  ) ·{' '}
                  {
                    specialStudents.find(
                      (s) => s.id === reviewingReport.studentId,
                    )?.name
                  }
                </p>
              </div>
              <button
                onClick={() => setReviewingReport(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Draft Preview Snippet */}
              <div className="bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 text-[11px] uppercase tracking-wider">
                    Report Draft Summary (By{' '}
                    {reviewingReport.teacherName || 'Assigned SE Teacher'})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const studId = reviewingReport.studentId;
                      const wNum = reviewingReport.weekNumber;
                      setReviewingReport(null);
                      setSelectedStudentId(studId);
                      if (onSelectReportForEdit)
                        onSelectReportForEdit(
                          studId,
                          wNum,
                          allReports.some(
                            (candidate) => candidate.id === reviewingReport.id,
                          )
                            ? reviewingReport.id
                            : undefined,
                          Number(reviewingReport.year),
                        );
                    }}
                    className="text-[11px] font-bold text-[#6E161E] hover:underline flex items-center gap-1"
                  >
                    <span>Open in Full Editor</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Target Goals */}
                <div className="space-y-1.5 pt-1">
                  <span className="font-semibold text-stone-600 block text-[11px]">
                    Goal Progress & Ratings:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reviewingReport.goalProgress.map((gp, i) => (
                      <div
                        key={gp.goalId || i}
                        className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800">
                            Goal #{i + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 font-bold text-stone-700 text-[10px]">
                            Rating: {gp.rating}/5
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 line-clamp-2 italic">
                          "{gp.notes || 'No anecdotal notes'}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observations */}
                {reviewingReport.descriptiveObservation && (
                  <div className="space-y-1 pt-1">
                    <span className="font-semibold text-stone-600 block text-[11px]">
                      Classroom Observations:
                    </span>
                    <p className="bg-white p-2.5 rounded-xl border border-stone-200 text-stone-700 leading-relaxed italic">
                      "{reviewingReport.descriptiveObservation}"
                    </p>
                  </div>
                )}

                {/* Home Connection */}
                {reviewingReport.homeConnection && (
                  <div className="space-y-1 pt-1">
                    <span className="font-semibold text-blue-900 block text-[11px]">
                      Parent Guidance / Home Connection:
                    </span>
                    <p className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 text-blue-950 leading-relaxed italic">
                      "{reviewingReport.homeConnection}"
                    </p>
                  </div>
                )}
              </div>

              {/* Decision Action Toggle */}
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
                      ? 'Verify & Forward'
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
                  <span>Return for Revisions</span>
                </button>
              </div>

              {/* Reviewer Feedback Comment */}
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
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    reviewAction === 'Return'
                      ? 'Specify what needs to be revised before approval (e.g. clarify goal ratings, add anecdotal observations)...'
                      : 'Add verification notes or leave default verification remarks...'
                  }
                  className={`w-full p-3 bg-[#FAF5EF] border rounded-2xl font-normal leading-relaxed focus:outline-hidden ${
                    reviewAction === 'Return' && !reviewComment.trim()
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-[#E8DFC8] focus:border-[#6E161E]'
                  }`}
                />
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 bg-[#FAF5EF] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReviewingReport(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={isMutating}
                className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50 ${
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
      )}

      {/* HISTORY MODAL */}
      {historyReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-[#FAF5EF]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#6E161E]" />
                <div>
                  <h3 className="font-heading font-black text-base text-stone-900">
                    Weekly Report Audit Trail
                  </h3>
                  <p className="text-xs text-stone-500">
                    Student:{' '}
                    {
                      specialStudents.find(
                        (s) => s.id === historyReport.studentId,
                      )?.name
                    }{' '}
                    (Week {historyReport.weekNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryReport(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {!historyReport.workflowHistory ||
              historyReport.workflowHistory.length === 0 ? (
                <p className="text-stone-400 text-center py-6">
                  No historical workflow transitions recorded yet.
                </p>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {historyReport.workflowHistory.map((h, i) => (
                    <div key={h.id || i} className="relative pl-9 space-y-1">
                      <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-[#6E161E] ring-4 ring-[#FAF5EF]" />
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
                          {h.authorName}
                        </strong>{' '}
                        ({h.authorRole})
                      </p>
                      {h.comment && (
                        <p className="p-2 bg-[#FAF5EF] rounded-lg border border-[#E8DFC8] text-stone-700 mt-1 italic">
                          "{h.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 bg-[#FAF5EF] flex justify-end">
              <button
                onClick={() => setHistoryReport(null)}
                className="px-4 py-2 bg-stone-800 text-white rounded-xl text-xs font-bold"
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
