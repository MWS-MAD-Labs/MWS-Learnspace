import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { Student, ObservationAssignment } from '../../types';
import { ObservationHistoryViewer } from './ObservationHistoryViewer';
import { CoordinatorObservationManager } from './CoordinatorObservationManager';
import { FEDCObservationView } from './FEDCObservationView';
import { SensoryProfileView } from './SensoryProfileView';
import { SFAObservationView } from './SFAObservationView';
import { 
  Brain, 
  Activity, 
  FileText, 
  Users, 
  ChevronRight, 
  Calendar, 
  History, 
  Edit3, 
  FileSignature,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  Info
} from 'lucide-react';

export const ObservationView: React.FC = () => {
  const { 
    currentUser, 
    students, 
    selectedStudentId, 
    setSelectedStudentId,
    specialEdSubTab,
    setSpecialEdSubTab,
    navigateToIEP,
    setActiveTab
  } = useApp();

  // Strict role check: Special Ed Coordinator and School Leadership (Principal, Director)
  const isCoordinatorOrLeadership = 
    Boolean(currentUser.isSpecialEdCoordinator) || 
    currentUser.role === 'PRINCIPAL' || 
    currentUser.role === 'DIRECTOR';

  // If coordinator or leadership, show the full CoordinatorObservationManager
  if (isCoordinatorOrLeadership) {
    return <CoordinatorObservationManager />;
  }

  // --- GPK Teacher / Specialist Teacher Workspace ---

  // Find students assigned to this GPK teacher (strictly max 2 students per school policy)
  const assignedStudents = students.filter(
    s => s.assignedGPKTeacherId === currentUser.id || currentUser.assignedSpecialNeedsStudentIds?.includes(s.id)
  );

  // If the user has assigned students, ensure a valid chosen student is selected
  const [chosenStudentId, setChosenStudentId] = useState<string>(() => {
    if (assignedStudents.length > 0) {
      if (selectedStudentId && assignedStudents.some(s => s.id === selectedStudentId)) {
        return selectedStudentId;
      }
      return assignedStudents[0].id;
    }
    return selectedStudentId || (students.find(s => s.specialNeedsFlag)?.id ?? students[0]?.id ?? '');
  });

  // Mode toggle for GPK: 'RESULTS' (Observation Results & History Timeline) or 'ACTIVE_FORM' (Conduct Observation)
  const [viewMode, setViewMode] = useState<'RESULTS' | 'ACTIVE_FORM'>('RESULTS');

  // Auto-sync if student changes
  useEffect(() => {
    if (assignedStudents.length > 0 && !assignedStudents.some(s => s.id === chosenStudentId)) {
      setChosenStudentId(assignedStudents[0].id);
      setSelectedStudentId(assignedStudents[0].id);
    }
  }, [currentUser.id, assignedStudents.length]);

  // Active student for GPK view
  const currentStudent = students.find(s => s.id === chosenStudentId) || assignedStudents[0] || students[0];

  // Fetch observation assignments delegated by Coordinator to this teacher or for this student
  const allAssignments = storageService.getObservationAssignments();
  const myAssignments = allAssignments.filter(
    a => a.assignedToUserId === currentUser.id || (currentStudent && a.studentId === currentStudent.id)
  );

  const pendingAssignments = myAssignments.filter(a => a.status !== 'Completed' && a.status !== 'COMPLETED');

  // Quick action: start an assigned instrument
  const handleStartAssignedInstrument = (assignment: ObservationAssignment) => {
    if (assignment.studentId !== currentStudent?.id) {
      setChosenStudentId(assignment.studentId);
      setSelectedStudentId(assignment.studentId);
    }
    setSpecialEdSubTab(assignment.instrumentType);
    setViewMode('ACTIVE_FORM');
  };

  return (
    <div id="gpk-observation-view-container" className="space-y-6 max-w-6xl mx-auto">
      {/* GPK Header Banner */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#6E161E] text-white uppercase tracking-wider">
              {currentUser.isGPK ? 'GPK Teacher Workspace' : 'Specialist Workspace'}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F5B842]/20 text-[#8F5900] border border-[#F5B842]/40">
              Caseload: {assignedStudents.length}/2 Students Assigned (Max Limit)
            </span>
          </div>
          <h2 className="font-heading font-black text-xl text-stone-900">
            Observation & Student Progress Portal
          </h2>
          <p className="text-xs text-stone-600 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>
              Welcome, <strong>{currentUser.name}</strong>. Review longitudinal observation history and record in-class evaluations for your assigned student(s).
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

      {/* Coordinator Assigned Tasks Alert (if any assigned to this teacher) */}
      {pendingAssignments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-amber-200/60 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                Coordinator Assigned Diagnostic Tasks ({pendingAssignments.length} Pending)
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Assigned by Special Education Coordinator
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingAssignments.map(assignment => (
              <div 
                key={assignment.id}
                className="bg-white/90 rounded-xl p-3 border border-amber-200 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#6E161E] text-white">
                      {assignment.instrumentType}
                    </span>
                    <strong className="text-xs font-bold text-stone-900">{assignment.studentName}</strong>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Due: <strong>{assignment.dueDate}</strong> · {assignment.notes || 'Routine observation'}
                  </p>
                </div>

                <button
                  id={`start-assigned-task-${assignment.id}`}
                  onClick={() => handleStartAssignedInstrument(assignment)}
                  className="px-3 py-1.5 bg-[#6E161E] hover:bg-[#8C1F28] text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <span>Open Form</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Student Selector & Context Card */}
      {assignedStudents.length > 0 ? (
        <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6E161E]" />
              <span className="text-xs font-bold text-stone-700">
                {assignedStudents.length === 1 ? 'Your Assigned Special Needs Student:' : 'Select Assigned Student (Caseload 2/2):'}
              </span>
            </div>

            {/* If 2 students assigned, show switcher tabs */}
            {assignedStudents.length > 1 && (
              <div className="flex items-center gap-2">
                {assignedStudents.map(student => {
                  const isSelected = currentStudent?.id === student.id;
                  return (
                    <button
                      key={student.id}
                      id={`gpk-switch-student-${student.id}`}
                      onClick={() => {
                        setChosenStudentId(student.id);
                        setSelectedStudentId(student.id);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-xs'
                          : 'bg-[#FAF5EF] text-stone-700 hover:bg-[#F2EAE0] border-[#E8DFC8]'
                      }`}
                    >
                      <img
                        src={student.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=40'}
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
                  src={currentStudent.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=60'}
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
                    <span>NISN: {currentStudent.nisn}</span>
                    <span>•</span>
                    <span className="font-medium text-amber-900 bg-amber-100/60 px-1.5 py-0.2 rounded">
                      {currentStudent.primaryDiagnosis || 'Special Needs Support'}
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
                    navigateToIEP();
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
          <h3 className="font-bold text-stone-900">No Special Needs Students Currently Assigned</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            The Special Education Coordinator assigns up to 2 Special Needs students to each GPK Teacher. Please contact Ms. Elena Johnson for caseload assignments.
          </p>
        </div>
      )}

      {/* Render Main Content based on viewMode */}
      {viewMode === 'RESULTS' ? (
        currentStudent ? (
          <ObservationHistoryViewer
            student={currentStudent}
            currentUser={currentUser}
            onNavigateToIEP={navigateToIEP}
            onOpenAssessmentForm={(type) => {
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
            {specialEdSubTab === 'FEDC' && <FEDCObservationView />}
            {specialEdSubTab === 'SENSORY_PROFILE' && <SensoryProfileView />}
            {specialEdSubTab === 'SFA' && <SFAObservationView />}
          </div>
        </div>
      )}
    </div>
  );
};
