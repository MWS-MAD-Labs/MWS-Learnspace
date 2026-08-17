import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { IEPRecord, IEPGoal, Student } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { IEPStatusTracker } from './IEPStatusTracker';
import { 
  FileText, 
  User, 
  Target, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Printer, 
  Save, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Brain, 
  Activity, 
  ChevronRight, 
  Trash2,
  Edit3,
  ListOrdered,
  FileSignature
} from 'lucide-react';

const IEP_TABS = ['Profile & Team', 'Baseline Diagnostics', 'SMART Goals', 'Accommodations & Services', 'Signatures'] as const;

export const IEPPlanView: React.FC = () => {
  const { 
    selectedStudentId, 
    setSelectedStudentId, 
    students, 
    currentUser, 
    toggleObservationDrawer, 
    showToast,
    refreshData 
  } = useApp();

  const [iepViewMode, setIepViewMode] = useState<'DOCUMENT' | 'STATUS_TRACKER'>('DOCUMENT');

  const isCoordinatorOrLeadership = 
    currentUser.isSpecialEdCoordinator || 
    currentUser.role === 'PRINCIPAL' || 
    currentUser.role === 'DIRECTOR';

  const isSETeacher = 
    currentUser.isGPK || 
    (currentUser.role === 'SPECIAL_ED_TEACHER' && !currentUser.isSpecialEdCoordinator);

  // Filter accessible students: SE teachers can ONLY access SN students assigned to them
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

  // Current active student must be within accessible list
  const currentStudent = accessibleStudents.find(s => s.id === selectedStudentId) || accessibleStudents[0];

  const [activeTab, setActiveTab] = useState<typeof IEP_TABS[number]>('SMART Goals');

  // Load IEP helper
  const loadDefaultIEP = (stud: Student): IEPRecord => ({
    id: `iep-${stud.id}-2026`,
    studentId: stud.id,
    year: '2026',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    unit: 'Elementary',
    status: 'Active',
    draftStatus: 'Done',
    coordinatorReviewStatus: 'Done',
    directorApprovalStatus: 'Done',
    workflowHistory: [],
    consideration: 'Individualized Special Support (GPK)',
    primaryClassification: stud.primaryClassification || 'Sensory Processing Sensitivity',
    currentPlacement: 'General Education Classroom with GPK Shadow (1:1 Support)',
    teamMembers: [
      { id: 'tm1', role: 'GPK Case Manager', name: stud.assignedGPKTeacherName || currentUser.name, initial: 'CM', confirmed: true },
      { id: 'tm2', role: 'Occupational Therapist', name: 'Dr. Clara Vance, OTR/L', initial: 'CV', confirmed: true },
      { id: 'tm3', role: 'Grade Teacher', name: 'Sarah Woods', initial: 'SW', confirmed: true },
      { id: 'tm4', role: 'Special Ed Coordinator', name: 'Ms. Elena Johnson', initial: 'EJ', confirmed: true },
      { id: 'tm5', role: 'Parents', name: stud.parentGuardianName || 'Parents / Guardians', initial: 'PG', confirmed: true }
    ],
    performanceAreas: [
      {
        id: 'pa1',
        name: 'Emotional Self-Regulation',
        category: 'Social/Emotional',
        strengths: 'Eager to participate, strong visual memory, affectionate with familiar staff.',
        needs: 'Assistance during unscheduled transitions and auditory overstimulation.',
        impactOfNeed: 'May become vocal and disengage during abrupt schedule changes.',
        informationSource: 'FEDC Observation & SFA Part 1',
        assessmentDate: '2026-10-14',
        summaryOfResults: 'Tonggak 1 & 2 mastered; emerging Tonggak 3 (Circle Time transitions).'
      }
    ],
    academicAccommodations: {
      math: 'A',
      science: 'A',
      english: 'A',
      pe: 'M',
      makerspace: 'A'
    },
    instructionalAccommodations: [
      'Visual first-then routine board',
      'Frequent check-ins during multi-step tasks',
      'Slant board for handwriting assignments'
    ],
    environmentalAccommodations: [
      'Preferential seating away from high-traffic doorways',
      'Noise-cancelling earmuffs accessible on desk'
    ],
    assessmentAccommodations: [
      'Extended time (1.5x) for written assessments',
      'Frequent sensory movement breaks'
    ],
    goals: [
      {
        id: 'g1',
        code: 'GL-001',
        performanceArea: 'Social/Emotional',
        measurableGoal: `${stud.nickname || stud.fullName} will independently request a break or utilize the quiet corner during transitions in 4 out of 5 observed opportunities.`,
        evaluationMethod: 'Daily GPK observation log and transition rating checklist',
        schedule: 'Weekly',
        targetDate: '2027-02-15',
        active: true,
        achieved: false
      },
      {
        id: 'g2',
        code: 'GL-002',
        performanceArea: 'Motor',
        measurableGoal: `${stud.nickname || stud.fullName} will maintain handwriting endurance on a slant board for 12 consecutive minutes without physical distress.`,
        evaluationMethod: 'Bi-weekly OT work sample collection',
        schedule: 'Bi-weekly',
        targetDate: '2027-04-30',
        active: true,
        achieved: false
      }
    ],
    serviceSchedule: [
      {
        id: 'srv1',
        serviceName: 'Occupational Therapy (Sensory & Fine Motor)',
        type: '1:1',
        duration: '45 mins / 2x per week',
        frequency: 'Twice Weekly',
        location: 'Sensory Gym'
      },
      {
        id: 'srv2',
        serviceName: 'GPK Shadow Teacher Classroom Support',
        type: '1:1',
        duration: '4 hours / daily',
        frequency: 'Daily',
        location: 'General Ed Classroom'
      }
    ],
    progressMeasurementMethods: [
      'Weekly GPK IEP Report to parents',
      'Monthly multidisciplinary team review'
    ],
    parentCommunicationMethods: [
      'Daily digital log via Learnspace Portal',
      'Termly IEP review conferences'
    ],
    homePartnershipSupport: 'Reinforce deep-pressure calming strategies at home.',
    homePartnershipRecommendations: 'Finger-strengthening games with playdough and sensory breaks.',
    parentApproval: {
      agreed: true,
      parentName: stud.parentGuardianName || 'Parents',
      date: '2026-10-20'
    },
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    updatedBy: currentUser.id,
    updatedAt: new Date().toISOString()
  });

  const [iep, setIep] = useState<IEPRecord>(() => {
    if (!currentStudent) {
      return loadDefaultIEP({ id: 'temp', fullName: 'Student', name: 'Student', specialNeedsFlag: true } as any);
    }
    const existing = storageService.getIEPRecords(currentStudent.id);
    if (existing.length > 0) return existing[0];
    return loadDefaultIEP(currentStudent);
  });

  // Sync IEP when student changes
  useEffect(() => {
    if (!currentStudent) return;
    const existing = storageService.getIEPRecords(currentStudent.id);
    if (existing.length > 0) {
      setIep(existing[0]);
    } else {
      setIep(loadDefaultIEP(currentStudent));
    }
  }, [currentStudent?.id]);

  const achievedGoalsCount = iep.goals.filter(g => g.achieved).length;
  const goalProgressAvg = iep.goals.length
    ? Math.round((achievedGoalsCount / iep.goals.length) * 100)
    : 0;

  const handleToggleGoalAchieved = (goalId: string) => {
    if (!isCoordinatorOrLeadership && currentStudent.assignedGPKTeacherId !== currentUser.id && !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)) {
      showToast('error', 'Unauthorized Access', 'You can only update IEP goals for students assigned to you.');
      return;
    }
    setIep(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === goalId ? { 
        ...g, 
        achieved: !g.achieved, 
        achievedDate: !g.achieved ? '2026-10-24' : undefined 
      } : g)
    }));
  };

  const handleAddGoal = () => {
    if (!isCoordinatorOrLeadership && currentStudent.assignedGPKTeacherId !== currentUser.id && !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)) {
      showToast('error', 'Unauthorized Access', 'You can only add IEP goals for students assigned to you.');
      return;
    }
    const newGoal: IEPGoal = {
      id: `goal-${Date.now()}`,
      code: `GL-00${iep.goals.length + 1}`,
      performanceArea: 'Academic',
      measurableGoal: 'Student will demonstrate mastery in target learning benchmark...',
      evaluationMethod: 'Weekly observation rubric',
      schedule: 'Weekly',
      targetDate: '2027-06-01',
      active: true,
      achieved: false
    };

    setIep(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }));
    showToast('info', 'Goal Added', 'New SMART IEP Goal added.');
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!isCoordinatorOrLeadership && currentStudent.assignedGPKTeacherId !== currentUser.id && !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)) {
      showToast('error', 'Unauthorized Access', 'You can only delete IEP goals for students assigned to you.');
      return;
    }
    setIep(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId)
    }));
  };

  const handleSaveIEP = () => {
    if (!isCoordinatorOrLeadership && currentStudent.assignedGPKTeacherId !== currentUser.id && !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)) {
      showToast('error', 'Unauthorized Access', 'You can only save IEP plans for students assigned to you.');
      return;
    }
    storageService.saveIEPRecord({
      ...iep,
      studentId: currentStudent.id,
      updatedAt: new Date().toISOString()
    });
    showToast('success', 'IEP Plan Saved', `Updated Individualized Education Program for ${currentStudent.fullName}.`);
    refreshData();
  };

  const handlePrint = () => {
    window.print();
  };

  if (accessibleStudents.length === 0) {
    return (
      <div id="iep-restricted-view" className="max-w-3xl mx-auto my-12 bg-white border border-[#EFE7DC] rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="font-heading font-black text-lg text-stone-900">No Special Needs Students Assigned Yet</h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
          Special Education and GPK teachers can only access, create, and edit IEP documents for students assigned to their 1:1 / caseload care.
        </p>
        <p className="text-xs text-stone-500">
          Please contact the Special Education Coordinator (<strong>Ms. Elena Johnson</strong>) to assign students to your profile.
        </p>
      </div>
    );
  }

  return (
    <div id="iep-plan-view" className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* SE Teacher Caseload Notice */}
      {isSETeacher && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              <strong>Tied SE Teacher Access:</strong> You are authorized to access, create, and edit IEP documents strictly for your assigned student(s): <strong className="text-amber-950">{accessibleStudents.map(s => s.fullName).join(', ')}</strong>.
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
            id="mode-iep-editor-btn"
            onClick={() => setIepViewMode('DOCUMENT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              iepViewMode === 'DOCUMENT'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>1. Annual IEP Document & Editor</span>
          </button>

          <button
            id="mode-iep-tracker-btn"
            onClick={() => setIepViewMode('STATUS_TRACKER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              iepViewMode === 'STATUS_TRACKER'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>2. IEP Status Tracker ({isCoordinatorOrLeadership ? 'All Students' : 'My Caseload'})</span>
          </button>
        </div>

        {iepViewMode === 'DOCUMENT' && (
          <button
            onClick={() => setIepViewMode('STATUS_TRACKER')}
            className="text-xs font-bold text-[#6E161E] hover:underline px-3 py-1.5 hidden sm:block"
          >
            Manage IEP Status Tracker →
          </button>
        )}
      </div>

      {iepViewMode === 'STATUS_TRACKER' ? (
        <IEPStatusTracker
          onSelectIEPForEdit={(studentId) => {
            setSelectedStudentId(studentId);
            setIepViewMode('DOCUMENT');
          }}
        />
      ) : (
        <>
          {/* Student & IEP Banner */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 print:border-none">
        <div className="flex items-center gap-4">
          <img
            src={currentStudent.avatarUrl || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120'}
            alt={currentStudent.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#EFE7DC] shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                Individualized Education Program
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active IEP · {iep.academicYear}
              </span>
            </div>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {currentStudent.fullName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Classification: <strong className="text-stone-800">{iep.primaryClassification}</strong> · Status: {iep.status}
            </p>
          </div>
        </div>

        {/* Student Selector & Progress Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              {isCoordinatorOrLeadership ? 'Target Student' : 'My Assigned Student'}
            </span>
            <select
              id="iep-student-select"
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                const ex = storageService.getIEPRecords(e.target.value);
                if (ex.length > 0) setIep(ex[0]);
              }}
              className="px-3.5 py-2 text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden"
            >
              {accessibleStudents.map(s => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.grade})</option>
              ))}
            </select>
          </div>

          <div className="p-3.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl min-w-[140px]">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1">
              <span>Goal Mastery</span>
              <span className="text-[#6E161E] font-black">{achievedGoalsCount}/{iep.goals.length} Goals</span>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6E161E] rounded-full transition-all duration-500"
                style={{ width: `${goalProgressAvg}%` }}
              />
            </div>
          </div>

          <button
            id="btn-print-iep"
            onClick={handlePrint}
            className="p-2.5 bg-white hover:bg-stone-50 border border-[#E8DFC8] rounded-xl text-stone-700 shadow-2xs transition-colors"
            title="Print Official IEP Document"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 bg-white rounded-2xl p-1 shadow-xs gap-1 overflow-x-auto print:hidden">
        {IEP_TABS.map((tab) => (
          <button
            key={tab}
            id={`iep-tab-${tab.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:bg-[#FAF5EF]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Profile & Team */}
      {activeTab === 'Profile & Team' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900">Student Profile & Placement Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] space-y-2">
                <span className="font-bold text-stone-900 block">Placement & Considerations</span>
                <p><strong>Primary Classification:</strong> {iep.primaryClassification}</p>
                <p><strong>Current Placement:</strong> {iep.currentPlacement}</p>
                <p><strong>Academic Year:</strong> {iep.academicYear} ({iep.semester})</p>
              </div>

              <div className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] space-y-2">
                <span className="font-bold text-stone-900 block">Multidisciplinary IEP Team</span>
                <ul className="space-y-1.5">
                  {iep.teamMembers.map((tm) => (
                    <li key={tm.id} className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800">{tm.name}</span>
                      <span className="text-stone-500 text-[11px] bg-white px-2 py-0.5 rounded border border-stone-200">{tm.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Baseline Diagnostics */}
      {activeTab === 'Baseline Diagnostics' && (
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Present Levels of Academic Achievement & Functional Performance (PLAAFP)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Synthesis across FEDC emotional milestones, Sensory Profile 2 quadrants, and SFA.
              </p>
            </div>
            <button
              onClick={toggleObservationDrawer}
              className="px-3.5 py-1.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-[#6E161E] border border-[#E8DFC8] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Open Reference Drawer
            </button>
          </div>

          <div className="space-y-4">
            {iep.performanceAreas.map((pa) => (
              <div key={pa.id} className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">{pa.name}</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px]">{pa.category}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <p><strong>Strengths:</strong> {pa.strengths}</p>
                  <p><strong>Needs:</strong> {pa.needs}</p>
                  <p><strong>Impact of Need:</strong> {pa.impactOfNeed}</p>
                  <p><strong>Summary of Assessment Results:</strong> {pa.summaryOfResults}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: SMART Goals */}
      {activeTab === 'SMART Goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Annual SMART Goals ({iep.goals.length})
              </h2>
              <p className="text-xs text-stone-500">
                Specific, Measurable, Achievable, Relevant, and Time-bound objectives
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleObservationDrawer}
                className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-[#E8DFC8] text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#6E161E]" />
                Reference Data
              </button>

              <button
                type="button"
                id="btn-add-smart-goal"
                onClick={handleAddGoal}
                className="px-4 py-2 bg-[#F5B842] hover:bg-[#EEAA2B] text-stone-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                + Add SMART Goal
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {iep.goals.map((goal, gIdx) => (
              <div
                key={goal.id}
                id={`iep-goal-card-${goal.id}`}
                className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4 transition-all hover:border-[#6E161E]/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-[#6E161E] text-white flex items-center justify-center font-bold text-xs">
                      {goal.code}
                    </span>
                    <div>
                      <span className="text-[11px] font-bold text-[#6E161E] uppercase tracking-wider">
                        Domain: {goal.performanceArea}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900 mt-0.5">
                        {goal.measurableGoal}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleGoalAchieved(goal.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        goal.achieved 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {goal.achieved ? 'Target Achieved' : 'Mark Achieved'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FAF5EF] p-3.5 rounded-2xl border border-[#E8DFC8]">
                  <div>
                    <span className="font-bold text-stone-500 uppercase text-[10px] block">Evaluation Method</span>
                    <span className="text-stone-800">{goal.evaluationMethod}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 uppercase text-[10px] block">Schedule</span>
                    <span className="text-stone-800">{goal.schedule}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 uppercase text-[10px] block">Target Date</span>
                    <span className="text-[#6E161E] font-bold">{goal.targetDate || 'End of Term'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Accommodations & Services */}
      {activeTab === 'Accommodations & Services' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900">Direct & Related Services Schedule</h2>
            <div className="space-y-3">
              {iep.serviceSchedule.map((srv) => (
                <div key={srv.id} className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{srv.serviceName}</h3>
                    <p className="text-stone-500 mt-0.5">Type: {srv.type} · Location: {srv.location}</p>
                  </div>
                  <div className="text-right font-bold text-[#6E161E] shrink-0">
                    {srv.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900">Instructional & Environmental Accommodations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <span className="font-bold text-[#6E161E] uppercase text-[10px] block">Instructional Accommodations</span>
                <ul className="list-disc list-inside space-y-1 text-stone-700">
                  {iep.instructionalAccommodations.map((acc, i) => <li key={i}>{acc}</li>)}
                </ul>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <span className="font-bold text-[#6E161E] uppercase text-[10px] block">Environmental Accommodations</span>
                <ul className="list-disc list-inside space-y-1 text-stone-700">
                  {iep.environmentalAccommodations.map((acc, i) => <li key={i}>{acc}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Signatures */}
      {activeTab === 'Signatures' && (
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-stone-900">Official Signatures & Approvals</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Verified parent agreement and multidisciplinary committee approvals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-700 mx-auto" />
              <h3 className="text-xs font-bold text-emerald-950">GPK Coordinator</h3>
              <p className="text-[11px] text-emerald-800">Signed: {currentUser.name}</p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-700 mx-auto" />
              <h3 className="text-xs font-bold text-emerald-950">School Principal</h3>
              <p className="text-[11px] text-emerald-800">Approved for Year 2026–2027</p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-700 mx-auto" />
              <h3 className="text-xs font-bold text-emerald-950">Parent Consent Verified</h3>
              <p className="text-[11px] text-emerald-800">{iep.parentApproval.parentName} ({iep.parentApproval.date})</p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions */}
      <div 
        id="iep-sticky-bar"
        className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#EFE7DC] px-6 py-4 shadow-lg flex items-center justify-between"
      >
        <button
          type="button"
          onClick={toggleObservationDrawer}
          className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4" /> Toggle Observation Reference Drawer
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="iep-save-plan-btn"
            onClick={handleSaveIEP}
            className="px-6 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save IEP Plan
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
