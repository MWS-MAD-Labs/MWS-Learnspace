import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useObservationData } from '../hooks/useObservationData';

import { ObservationHistoryViewer } from '../components/history/ObservationHistoryViewer';
import { ObservationManagementPage } from './ObservationManagementPage';
import { FEDCObservationView } from '../components/fedc/FEDCObservationView';
import { SensoryProfileView } from '../components/sensory-profile/SensoryProfileView';
import { SFAObservationView } from '../components/sfa/SFAObservationView';
import {
  Brain,
  Activity,
  FileText,
  Users,
  History,
  Edit3,
  FileSignature,
  ClipboardList,
  Clock,
  AlertCircle,
  Info,
  RefreshCw,
} from 'lucide-react';

function isActionableAssignmentStatus(status: string) {
  const normalized = status.toUpperCase().replaceAll(' ', '_');
  return normalized === 'PENDING' || normalized === 'IN_PROGRESS';
}

export const ObservationPage: React.FC = () => {
  const {
    organizationId,
    currentUser,
    students,
    selectedStudentId,
    setSelectedStudentId,
    specialEdSubTab,
    setSpecialEdSubTab,
    selectedObservationAssignmentId,
    navigateToIEP,
    setActiveTab,
  } = useApp();
  const navigate = useNavigate();
  const focusedAssignmentRef = useRef<string | null>(null);

  // Observation definition/assignment management is coordinator-only.
  const isObservationManager = Boolean(currentUser.isSpecialEdCoordinator);
  const observationData = useObservationData(organizationId, {
    includeDefinitions: false,
    enabled: !isObservationManager,
  });

  // --- GPK Teacher / Specialist Teacher Workspace ---

  // Find students assigned to this GPK teacher (strictly max 2 students per school policy)
  const assignedStudents = students.filter(
    (s) =>
      s.assignedGPKTeacherId === currentUser.id ||
      currentUser.assignedSpecialNeedsStudentIds?.includes(s.id),
  );
  const myAssignments = observationData.assignments.filter(
    (assignment) => assignment.assignedToUserId === currentUser.id,
  );
  const authorizedStudentIds = new Set([
    ...assignedStudents.map((student) => student.id),
    ...myAssignments.map((assignment) => assignment.studentId),
  ]);
  const authorizedStudents = students.filter((student) =>
    authorizedStudentIds.has(student.id),
  );

  // Only seed history from a student in the user's direct caseload. Assignment-only
  // targets are resolved after the authorized assignment list has loaded.
  const [chosenStudentId, setChosenStudentId] = useState<string>(() => {
    if (
      selectedStudentId &&
      authorizedStudents.some((student) => student.id === selectedStudentId)
    ) {
      return selectedStudentId;
    }
    return authorizedStudents[0]?.id ?? '';
  });

  // Mode toggle for GPK: 'RESULTS' (Observation Results & History Timeline) or 'ACTIVE_FORM' (Conduct Observation)
  const [viewMode, setViewMode] = useState<'RESULTS' | 'ACTIVE_FORM'>(
    'RESULTS',
  );
  const [activeAssignmentId, setActiveAssignmentId] = useState<
    string | undefined
  >(undefined);
  const [assignmentFeedback, setAssignmentFeedback] = useState('');

  // Auto-sync if student changes
  useEffect(() => {
    if (observationData.status !== 'ready') return;
    const nextStudentId = authorizedStudentIds.has(selectedStudentId)
      ? selectedStudentId
      : authorizedStudentIds.has(chosenStudentId)
        ? chosenStudentId
        : (myAssignments[0]?.studentId ?? assignedStudents[0]?.id ?? '');
    if (nextStudentId !== chosenStudentId) {
      setChosenStudentId(nextStudentId);
      if (nextStudentId) setSelectedStudentId(nextStudentId);
      setActiveAssignmentId(undefined);
    }
  }, [
    currentUser.id,
    assignedStudents,
    chosenStudentId,
    observationData.status,
    selectedStudentId,
    setSelectedStudentId,
  ]);

  useEffect(() => {
    if (!selectedObservationAssignmentId) {
      focusedAssignmentRef.current = null;
      return;
    }
    if (
      focusedAssignmentRef.current === selectedObservationAssignmentId ||
      observationData.status !== 'ready'
    ) {
      return;
    }
    const assignment = observationData.assignments.find(
      (candidate) => candidate.id === selectedObservationAssignmentId,
    );
    if (!assignment || !isActionableAssignmentStatus(assignment.status)) {
      setActiveAssignmentId(undefined);
      setViewMode('RESULTS');
      setAssignmentFeedback(
        assignment
          ? 'This observation assignment is no longer pending or in progress. Showing results instead.'
          : 'This observation assignment is no longer available. Showing results instead.',
      );
      navigate(
        assignment
          ? `/observations/students/${encodeURIComponent(assignment.studentId)}/results`
          : '/observations',
        { replace: true },
      );
      return;
    }
    focusedAssignmentRef.current = assignment.id;
    setAssignmentFeedback('');
    setChosenStudentId(assignment.studentId);
    setSpecialEdSubTab(assignment.instrumentType);
    setActiveAssignmentId(assignment.id);
    setViewMode('ACTIVE_FORM');
  }, [
    observationData.status,
    selectedObservationAssignmentId,
    observationData.assignments,
    navigate,
  ]);

  useEffect(() => {
    if (!activeAssignmentId || observationData.status !== 'ready') return;
    const activeAssignment = observationData.assignments.find(
      (candidate) => candidate.id === activeAssignmentId,
    );
    if (
      activeAssignment &&
      isActionableAssignmentStatus(activeAssignment.status)
    ) {
      return;
    }
    setActiveAssignmentId(undefined);
    setViewMode('RESULTS');
    setAssignmentFeedback(
      activeAssignment
        ? 'This observation assignment is no longer pending or in progress. Showing results instead.'
        : 'This observation assignment is no longer available. Showing results instead.',
    );
  }, [activeAssignmentId, observationData.assignments, observationData.status]);

  // Hooks must run consistently before selecting the role-specific view.
  if (isObservationManager) {
    return <ObservationManagementPage />;
  }

  // Active student for GPK view
  const currentStudent =
    students.find((student) => student.id === chosenStudentId) || undefined;

  // API assignments retain definitionId and definitionVersion for later record flows.
  const canViewCurrentStudentHistory = Boolean(
    currentStudent &&
    authorizedStudents.some((student) => student.id === currentStudent.id),
  );

  const pendingAssignments = myAssignments.filter((assignment) =>
    isActionableAssignmentStatus(assignment.status),
  );
  const activeFEDCAssignment =
    myAssignments.find(
      (assignment) =>
        assignment.id === activeAssignmentId &&
        assignment.studentId === currentStudent?.id &&
        assignment.instrumentType === 'FEDC' &&
        isActionableAssignmentStatus(assignment.status),
    ) ??
    (!activeAssignmentId
      ? pendingAssignments.find(
          (assignment) =>
            assignment.studentId === currentStudent?.id &&
            assignment.instrumentType === 'FEDC',
        )
      : undefined);
  const activeSensoryAssignment =
    myAssignments.find(
      (assignment) =>
        assignment.id === activeAssignmentId &&
        assignment.studentId === currentStudent?.id &&
        assignment.instrumentType === 'SENSORY_PROFILE' &&
        isActionableAssignmentStatus(assignment.status),
    ) ??
    (!activeAssignmentId
      ? pendingAssignments.find(
          (assignment) =>
            assignment.studentId === currentStudent?.id &&
            assignment.instrumentType === 'SENSORY_PROFILE',
        )
      : undefined);
  const activeSFAAssignment =
    myAssignments.find(
      (assignment) =>
        assignment.id === activeAssignmentId &&
        assignment.studentId === currentStudent?.id &&
        assignment.instrumentType === 'SFA' &&
        isActionableAssignmentStatus(assignment.status),
    ) ??
    (!activeAssignmentId
      ? pendingAssignments.find(
          (assignment) =>
            assignment.studentId === currentStudent?.id &&
            assignment.instrumentType === 'SFA',
        )
      : undefined);

  return (
    <div
      id="gpk-observation-view-container"
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* GPK Header Banner */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#6E161E] text-white uppercase tracking-wider">
              {currentUser.isGPK
                ? 'GPK Teacher Workspace'
                : 'Specialist Workspace'}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F5B842]/20 text-[#8F5900] border border-[#F5B842]/40">
              Caseload: {assignedStudents.length}/2 Students Assigned (Max
              Limit)
            </span>
          </div>
          <h2 className="font-heading font-black text-xl text-stone-900">
            Observation & Student Progress Portal
          </h2>
          <p className="text-xs text-stone-600 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>
              Welcome, <strong>{currentUser.name}</strong>. Review longitudinal
              observation history and record in-class evaluations for your
              assigned student(s).
            </span>
          </p>
        </div>

        {/* View Mode Toggle: History vs Conduct Form */}
        <div className="flex items-center gap-1.5 bg-[#FAF5EF] p-1.5 rounded-xl border border-[#E8DFC8] shrink-0 self-start md:self-auto">
          <button
            id="gpk-mode-results-btn"
            onClick={() => setViewMode('RESULTS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'RESULTS'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Observation Results & History</span>
          </button>

          <button
            id="gpk-mode-forms-btn"
            onClick={() => setViewMode('ACTIVE_FORM')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'ACTIVE_FORM'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Conduct In-Class Observation</span>
          </button>
        </div>
      </div>

      {assignmentFeedback && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-2 text-xs text-amber-900"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{assignmentFeedback}</span>
        </div>
      )}

      {/* Coordinator Assigned Tasks Alert */}
      {observationData.status === 'loading' && (
        <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 text-xs text-stone-500">
          Loading coordinator-assigned observation tasks…
        </div>
      )}
      {observationData.status === 'error' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {observationData.error ||
                'Coordinator-assigned observation tasks could not be loaded.'}
            </span>
          </div>
          <button
            type="button"
            onClick={observationData.retry}
            className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-800 flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}
      {observationData.status === 'ready' &&
        pendingAssignments.length === 0 && (
          <div className="bg-white border border-dashed border-[#E8DFC8] rounded-2xl p-4 text-xs text-stone-500 text-center">
            No pending or in-progress observation assignments.
          </div>
        )}
      {observationData.status === 'ready' && pendingAssignments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-amber-200/60 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                Coordinator Assigned Diagnostic Tasks (
                {pendingAssignments.length} Pending)
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Assigned by Special Education Coordinator
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white/90 rounded-xl p-3 border border-amber-200 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#6E161E] text-white">
                      {assignment.instrumentType} · v
                      {assignment.definitionVersion}
                    </span>
                    <strong className="text-xs font-bold text-stone-900">
                      {assignment.studentName}
                    </strong>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Due: <strong>{assignment.dueDate}</strong> · Definition{' '}
                    <span className="font-mono">{assignment.definitionId}</span>{' '}
                    · {assignment.notes || 'Routine observation'}
                  </p>
                </div>

                {assignment.instrumentType === 'FEDC' ||
                assignment.instrumentType === 'SENSORY_PROFILE' ||
                assignment.instrumentType === 'SFA' ? (
                  <button
                    id={`assigned-task-open-${assignment.instrumentType.toLowerCase()}-${assignment.id}`}
                    type="button"
                    onClick={() => {
                      setChosenStudentId(assignment.studentId);
                      setSelectedStudentId(assignment.studentId);
                      setActiveAssignmentId(assignment.id);
                      setSpecialEdSubTab(assignment.instrumentType);
                      setViewMode('ACTIVE_FORM');
                    }}
                    className="px-3 py-1.5 bg-[#6E161E] border border-[#6E161E] text-white rounded-lg text-[10px] font-bold shrink-0"
                  >
                    Open assigned{' '}
                    {assignment.instrumentType === 'FEDC'
                      ? 'FEDC'
                      : assignment.instrumentType === 'SENSORY_PROFILE'
                        ? 'Sensory Profile'
                        : 'SFA'}{' '}
                    form
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-stone-100 border border-stone-200 text-stone-500 rounded-lg text-[10px] font-bold shrink-0">
                    Local form retained for this instrument
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Student Selector & Context Card */}
      {authorizedStudents.length > 0 ? (
        <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6E161E]" />
              <span className="text-xs font-bold text-stone-700">
                {authorizedStudents.length === 1
                  ? 'Your Authorized Observation Student:'
                  : 'Select Authorized Observation Student:'}
              </span>
            </div>

            {/* If 2 students assigned, show switcher tabs */}
            {authorizedStudents.length > 1 && (
              <div className="flex items-center gap-2">
                {authorizedStudents.map((student) => {
                  const isSelected = currentStudent?.id === student.id;
                  return (
                    <button
                      key={student.id}
                      id={`gpk-switch-student-${student.id}`}
                      onClick={() => {
                        setChosenStudentId(student.id);
                        setSelectedStudentId(student.id);
                        setActiveAssignmentId(undefined);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-xs'
                          : 'bg-[#FAF5EF] text-stone-700 hover:bg-[#F2EAE0] border-[#E8DFC8]'
                      }`}
                    >
                      <img
                        src={
                          student.avatarUrl ||
                          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=40'
                        }
                        alt={student.name}
                        className="w-5 h-5 rounded-full object-cover border border-white"
                      />
                      <span>{student.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Student Detail Bar */}
          {currentStudent && (
            <div className="bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    currentStudent.avatarUrl ||
                    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=60'
                  }
                  alt={currentStudent.name}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-sm text-stone-900">
                      {currentStudent.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6E161E]/10 text-[#6E161E]">
                      Grade {currentStudent.grade} · {currentStudent.className}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                    <span>NISN: {currentStudent.studentNumber}</span>
                    <span>•</span>
                    <span className="font-medium text-amber-900 bg-amber-100/60 px-1.5 py-0.2 rounded">
                      {currentStudent.primaryDiagnosis ||
                        'Special Needs Support'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick links to IEP and Weekly Report for this student */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="gpk-jump-to-iep-btn"
                  onClick={() => {
                    setSelectedStudentId(currentStudent.id);
                    navigateToIEP(currentStudent.id);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-[#FAF5EF] text-stone-800 hover:text-[#6E161E] border border-[#E8DFC8] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <FileSignature className="w-3.5 h-3.5 text-[#6E161E]" />
                  <span>Annual IEP Plan</span>
                </button>

                <button
                  id="gpk-jump-to-weekly-btn"
                  onClick={() => {
                    setSelectedStudentId(currentStudent.id);
                    setActiveTab('SPECIAL_ED_WEEKLY_REPORT');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-[#FAF5EF] text-stone-800 hover:text-[#6E161E] border border-[#E8DFC8] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
                  <span>Weekly Report</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#EFE7DC] rounded-2xl p-6 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="font-bold text-stone-900">
            No Special Needs Students Currently Assigned
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            The Special Education Coordinator assigns up to 2 Special Needs
            students to each GPK Teacher. Please contact Ms. Elena Johnson for
            caseload assignments.
          </p>
        </div>
      )}

      {/* Render Main Content based on viewMode */}
      {viewMode === 'RESULTS' ? (
        currentStudent && canViewCurrentStudentHistory ? (
          <ObservationHistoryViewer
            student={currentStudent}
            currentUser={currentUser}
            historyEnabled={canViewCurrentStudentHistory}
            onNavigateToIEP={() => navigateToIEP(currentStudent.id)}
            onOpenAssessmentForm={(type, _recordId, assignmentId) => {
              if (assignmentId) {
                const assignment = myAssignments.find(
                  (candidate) => candidate.id === assignmentId,
                );
                if (assignment) {
                  setChosenStudentId(assignment.studentId);
                  setSelectedStudentId(assignment.studentId);
                  setActiveAssignmentId(assignment.id);
                }
              }
              setSpecialEdSubTab(type);
              setViewMode('ACTIVE_FORM');
            }}
          />
        ) : null
      ) : (
        <div className="space-y-6">
          {/* Sub-instrument Tabs for In-Class Observation Scoring */}
          <div className="bg-white border border-[#EFE7DC] rounded-2xl p-2 shadow-xs flex flex-wrap gap-2">
            <button
              id="tab-fedc-instrument"
              onClick={() => setSpecialEdSubTab('FEDC')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                specialEdSubTab === 'FEDC'
                  ? 'bg-[#6E161E] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>FEDC Instrument (Greenspan Functional Milestones)</span>
            </button>

            <button
              id="tab-sensory-instrument"
              onClick={() => setSpecialEdSubTab('SENSORY_PROFILE')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                specialEdSubTab === 'SENSORY_PROFILE'
                  ? 'bg-[#6E161E] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Sensory Profile 2 (Dunn 4-Quadrant Sensory)</span>
            </button>

            <button
              id="tab-sfa-instrument"
              onClick={() => setSpecialEdSubTab('SFA')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                specialEdSubTab === 'SFA'
                  ? 'bg-[#6E161E] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>SFA (School Function Assessment Participation)</span>
            </button>
          </div>

          <div className="transition-all">
            {specialEdSubTab === 'FEDC' &&
              (activeFEDCAssignment ? (
                <FEDCObservationView assignment={activeFEDCAssignment} />
              ) : (
                <div className="bg-white border border-dashed border-[#E8DFC8] rounded-2xl p-8 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                  <h3 className="text-sm font-bold text-stone-900">
                    No active FEDC assignment for this student
                  </h3>
                  <p className="text-xs text-stone-500">
                    FEDC observations must be started from a pending or
                    in-progress coordinator assignment.
                  </p>
                </div>
              ))}
            {specialEdSubTab === 'SENSORY_PROFILE' &&
              (activeSensoryAssignment ? (
                <SensoryProfileView assignment={activeSensoryAssignment} />
              ) : (
                <div className="bg-white border border-dashed border-[#E8DFC8] rounded-2xl p-8 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                  <h3 className="text-sm font-bold text-stone-900">
                    No active Sensory Profile assignment for this student
                  </h3>
                  <p className="text-xs text-stone-500">
                    Sensory Profile observations must be started from a pending
                    or in-progress coordinator assignment.
                  </p>
                </div>
              ))}
            {specialEdSubTab === 'SFA' &&
              (activeSFAAssignment ? (
                <SFAObservationView assignment={activeSFAAssignment} />
              ) : (
                <div className="bg-white border border-dashed border-[#E8DFC8] rounded-2xl p-8 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                  <h3 className="text-sm font-bold text-stone-900">
                    No active SFA assignment for this student
                  </h3>
                  <p className="text-xs text-stone-500">
                    SFA observations must be started from a pending or
                    in-progress coordinator assignment.
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
