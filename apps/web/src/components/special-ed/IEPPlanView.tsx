import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { IEPRecord, IEPGoal, Student } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { IEPStatusTracker } from './IEPStatusTracker';
import {
  FileText,
  Target,
  Calendar,
  CheckCircle2,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit3,
  ListOrdered,
  FileSignature,
  Clock,
  ArrowRight,
  Award,
  ExternalLink,
} from 'lucide-react';

const IEP_TABS = [
  'Profile & Team',
  'Baseline Diagnostics',
  'SMART Goals',
  'Accommodations & Services',
  'Signatures',
] as const;

export const IEPPlanView: React.FC = () => {
  const {
    selectedStudentId,
    setSelectedStudentId,
    students,
    currentUser,
    toggleObservationDrawer,
    showToast,
    refreshData,
    navigateToWeeklyReport,
  } = useApp();

  const [iepViewMode, setIepViewMode] = useState<'DOCUMENT' | 'STATUS_TRACKER'>(
    'DOCUMENT',
  );
  const [expandedHistoryGoalId, setExpandedHistoryGoalId] = useState<
    string | null
  >(null);

  // Edit goal modal
  const [editingGoal, setEditingGoal] = useState<IEPGoal | null>(null);
  const [isEditingNew, setIsEditingNew] = useState(false);

  const isCoordinatorOrLeadership =
    Boolean(currentUser.isSpecialEdCoordinator) ||
    currentUser.role === 'PRINCIPAL' ||
    currentUser.role === 'DIRECTOR';

  const isSETeacher =
    currentUser.isGPK ||
    (currentUser.role === 'SPECIAL_ED_TEACHER' &&
      !currentUser.isSpecialEdCoordinator);

  // Filter accessible students: SE teachers can ONLY access SN students assigned to them
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

  // Current active student must be within accessible list
  const currentStudent =
    accessibleStudents.find((s) => s.id === selectedStudentId) ||
    accessibleStudents[0];

  const [activeTab, setActiveTab] =
    useState<(typeof IEP_TABS)[number]>('SMART Goals');

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
    primaryClassification:
      stud.primaryClassification || 'Sensory Processing Sensitivity',
    currentPlacement:
      'General Education Classroom with GPK Shadow (1:1 Support)',
    teamMembers: [
      {
        id: 'tm1',
        role: 'GPK Case Manager',
        name: stud.assignedGPKTeacherName || currentUser.name,
        initial: 'CM',
        confirmed: true,
      },
      {
        id: 'tm2',
        role: 'Occupational Therapist',
        name: 'Dr. Clara Vance, OTR/L',
        initial: 'CV',
        confirmed: true,
      },
      {
        id: 'tm3',
        role: 'Grade Teacher',
        name: 'Sarah Woods',
        initial: 'SW',
        confirmed: true,
      },
      {
        id: 'tm4',
        role: 'Special Ed Coordinator',
        name: 'Ms. Elena Johnson',
        initial: 'EJ',
        confirmed: true,
      },
      {
        id: 'tm5',
        role: 'Parents',
        name: stud.parentGuardianName || 'Parents / Guardians',
        initial: 'PG',
        confirmed: true,
      },
    ],
    performanceAreas: [
      {
        id: 'pa1',
        name: 'Emotional Self-Regulation',
        category: 'Social/Emotional',
        strengths:
          'Eager to participate, strong visual memory, affectionate with familiar staff.',
        needs:
          'Assistance during unscheduled transitions and auditory overstimulation.',
        impactOfNeed:
          'May become vocal and disengage during abrupt schedule changes.',
        informationSource: 'FEDC Observation & SFA Part 1',
        assessmentDate: '2026-10-14',
        summaryOfResults:
          'Tonggak 1 & 2 mastered; emerging Tonggak 3 (Circle Time transitions).',
      },
    ],
    academicAccommodations: {
      math: 'A',
      science: 'A',
      english: 'A',
      pe: 'M',
      makerspace: 'A',
    },
    instructionalAccommodations: [
      'Visual first-then routine board',
      'Frequent check-ins during multi-step tasks',
      'Slant board for handwriting assignments',
    ],
    environmentalAccommodations: [
      'Preferential seating away from high-traffic doorways',
      'Noise-cancelling earmuffs accessible on desk',
    ],
    assessmentAccommodations: [
      'Extended time (1.5x) for written assessments',
      'Frequent sensory movement breaks',
    ],
    goals: [
      {
        id: 'g1',
        code: 'GL-001',
        performanceArea: 'Social/Emotional',
        measurableGoal: `${stud.nickname || stud.fullName} will independently request a break or utilize the quiet corner during transitions in 4 out of 5 observed opportunities.`,
        evaluationMethod:
          'Daily GPK observation log and transition rating checklist',
        schedule: 'Weekly',
        targetDate: '2027-02-15',
        active: true,
        achieved: false,
        lastAddressedDate: '2026-10-23',
        lastAddressedWeek: 8,
        lastAddressedRating: 4,
        timesAddressed: 3,
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
        achieved: false,
        lastAddressedDate: '2026-10-23',
        lastAddressedWeek: 8,
        lastAddressedRating: 3,
        timesAddressed: 2,
      },
    ],
    serviceSchedule: [
      {
        id: 'srv1',
        serviceName: 'Occupational Therapy (Sensory & Fine Motor)',
        type: '1:1',
        duration: '45 mins / 2x per week',
        frequency: 'Twice Weekly',
        location: 'Sensory Gym',
      },
      {
        id: 'srv2',
        serviceName: 'GPK Shadow Teacher Classroom Support',
        type: '1:1',
        duration: '4 hours / daily',
        frequency: 'Daily',
        location: 'General Ed Classroom',
      },
    ],
    progressMeasurementMethods: [
      'Weekly GPK IEP Report to parents',
      'Monthly multidisciplinary team review',
    ],
    parentCommunicationMethods: [
      'Daily digital log via Learnspace Portal',
      'Termly IEP review conferences',
    ],
    homePartnershipSupport:
      'Reinforce deep-pressure calming strategies at home.',
    homePartnershipRecommendations:
      'Finger-strengthening games with playdough and sensory breaks.',
    parentApproval: {
      agreed: true,
      parentName: stud.parentGuardianName || 'Parents',
      date: '2026-10-20',
    },
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    updatedBy: currentUser.id,
    updatedAt: new Date().toISOString(),
  });

  const [iep, setIep] = useState<IEPRecord>(() => {
    if (!currentStudent) {
      return loadDefaultIEP({
        id: 'temp',
        fullName: 'Student',
        name: 'Student',
        specialNeedsFlag: true,
      } as any);
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

  const achievedGoalsCount = iep.goals.filter((g) => g.achieved).length;
  const addressedGoalsCount = iep.goals.filter(
    (g) =>
      g.lastAddressedDate ||
      (g.addressedHistory && g.addressedHistory.length > 0),
  ).length;
  const goalProgressAvg = iep.goals.length
    ? Math.round((achievedGoalsCount / iep.goals.length) * 100)
    : 0;

  const handleToggleGoalAchieved = (goalId: string) => {
    if (
      !isCoordinatorOrLeadership &&
      currentStudent.assignedGPKTeacherId !== currentUser.id &&
      !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)
    ) {
      showToast(
        'error',
        'Unauthorized Access',
        'You can only update IEP goals for students assigned to you.',
      );
      return;
    }
    setIep((prev) => {
      const updatedGoals = prev.goals.map((g) => {
        if (g.id === goalId) {
          const nextAchieved = !g.achieved;
          return {
            ...g,
            achieved: nextAchieved,
            achievedDate: nextAchieved
              ? g.achievedDate || new Date().toISOString().split('T')[0]
              : undefined,
            achievedNote: nextAchieved
              ? g.achievedNote ||
                'Mastery criteria achieved in classroom trials.'
              : undefined,
          };
        }
        return g;
      });
      const updated = {
        ...prev,
        goals: updatedGoals,
        updatedAt: new Date().toISOString(),
      };
      storageService.saveIEPRecord(updated);
      return updated;
    });
    showToast(
      'success',
      'IEP Goal Status Updated',
      'Goal achievement status and date updated in the IEP Plan.',
    );
    refreshData();
  };

  const handleOpenAddGoal = () => {
    if (
      !isCoordinatorOrLeadership &&
      currentStudent.assignedGPKTeacherId !== currentUser.id &&
      !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)
    ) {
      showToast(
        'error',
        'Unauthorized Access',
        'You can only add IEP goals for students assigned to you.',
      );
      return;
    }
    setEditingGoal({
      id: `goal-${Date.now()}`,
      code: `GL-00${iep.goals.length + 1}`,
      performanceArea: 'Social/Emotional',
      measurableGoal: '',
      evaluationMethod: 'Weekly observation rubric & anecdotal logs',
      schedule: 'Weekly',
      targetDate: '2027-06-01',
      active: true,
      achieved: false,
    });
    setIsEditingNew(true);
  };

  const handleOpenEditGoal = (goal: IEPGoal) => {
    if (
      !isCoordinatorOrLeadership &&
      currentStudent.assignedGPKTeacherId !== currentUser.id &&
      !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)
    ) {
      showToast(
        'error',
        'Unauthorized Access',
        'You can only edit IEP goals for students assigned to you.',
      );
      return;
    }
    setEditingGoal({ ...goal });
    setIsEditingNew(false);
  };

  const handleSaveEditedGoal = () => {
    if (!editingGoal || !editingGoal.measurableGoal.trim()) {
      showToast(
        'error',
        'Goal Description Required',
        'Please enter a measurable SMART goal statement.',
      );
      return;
    }

    setIep((prev) => {
      let updatedGoals: IEPGoal[];
      if (isEditingNew) {
        updatedGoals = [...prev.goals, editingGoal];
      } else {
        updatedGoals = prev.goals.map((g) =>
          g.id === editingGoal.id ? editingGoal : g,
        );
      }
      const updatedRecord: IEPRecord = {
        ...prev,
        goals: updatedGoals,
        updatedAt: new Date().toISOString(),
      };
      storageService.saveIEPRecord(updatedRecord);
      return updatedRecord;
    });

    showToast(
      'success',
      isEditingNew ? 'SMART Goal Added' : 'SMART Goal Updated',
      `Saved goal ${editingGoal.code} for ${currentStudent.fullName}.`,
    );
    setEditingGoal(null);
    refreshData();
  };

  const handleDeleteGoal = (goalId: string) => {
    if (
      !isCoordinatorOrLeadership &&
      currentStudent.assignedGPKTeacherId !== currentUser.id &&
      !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)
    ) {
      showToast(
        'error',
        'Unauthorized Access',
        'You can only delete IEP goals for students assigned to you.',
      );
      return;
    }
    setIep((prev) => {
      const updatedGoals = prev.goals.filter((g) => g.id !== goalId);
      const updatedRecord: IEPRecord = {
        ...prev,
        goals: updatedGoals,
        updatedAt: new Date().toISOString(),
      };
      storageService.saveIEPRecord(updatedRecord);
      return updatedRecord;
    });
    showToast('info', 'Goal Removed', 'SMART IEP Goal removed from plan.');
    refreshData();
  };

  const handleSaveIEP = () => {
    if (
      !isCoordinatorOrLeadership &&
      currentStudent.assignedGPKTeacherId !== currentUser.id &&
      !currentUser.assignedSpecialNeedsStudentIds?.includes(currentStudent.id)
    ) {
      showToast(
        'error',
        'Unauthorized Access',
        'You can only save IEP plans for students assigned to you.',
      );
      return;
    }
    storageService.saveIEPRecord({
      ...iep,
      studentId: currentStudent.id,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      'success',
      'IEP Plan Saved',
      `Updated Individualized Education Program for ${currentStudent.fullName}. All goal dates synchronized.`,
    );
    refreshData();
  };

  const handlePrint = () => {
    window.print();
  };

  if (accessibleStudents.length === 0) {
    return (
      <div
        id="iep-restricted-view"
        className="max-w-3xl mx-auto my-12 bg-white border border-[#EFE7DC] rounded-3xl p-8 text-center space-y-4 shadow-xs"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="font-heading font-black text-lg text-stone-900">
          No Special Needs Students Assigned Yet
        </h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
          Special Education and GPK teachers can only access, create, and edit
          IEP documents for students assigned to their 1:1 / caseload care.
        </p>
        <p className="text-xs text-stone-500">
          Please contact the Special Education Coordinator (
          <strong>Ms. Elena Johnson</strong>) to assign students to your
          profile.
        </p>
      </div>
    );
  }

  return (
    <div id="iep-plan-view" className="space-y-6 max-w-6xl mx-auto pb-28">
      {/* SE Teacher Caseload Notice */}
      {isSETeacher && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              <strong>Tied SE Teacher Access:</strong> You are authorized to
              access, create, and edit IEP documents strictly for your assigned
              student(s):{' '}
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
            <span>
              2. IEP Status Tracker (
              {isCoordinatorOrLeadership ? 'All Students' : 'My Caseload'})
            </span>
          </button>
        </div>

        {iepViewMode === 'DOCUMENT' && (
          <button
            onClick={() => setIepViewMode('STATUS_TRACKER')}
            className="text-xs font-bold text-[#6E161E] hover:underline px-3 py-1.5 hidden sm:block"
          >
            Manage All IEP Plans Tracker →
          </button>
        )}
      </div>

      {iepViewMode === 'STATUS_TRACKER' ? (
        <IEPStatusTracker
          onSelectStudentForEdit={(studentId) => {
            setSelectedStudentId(studentId);
            setIepViewMode('DOCUMENT');
          }}
        />
      ) : (
        <>
          {/* Header Banner */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 print:border-none">
            <div className="flex items-center gap-4">
              <img
                src={
                  currentStudent.avatarUrl ||
                  'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120'
                }
                alt={currentStudent.fullName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#EFE7DC] shadow-xs"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                    Official Individualized Education Program (IEP)
                  </span>
                  <StatusBadge status={iep.status || 'Active'} size="sm" />
                </div>
                <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
                  {currentStudent.fullName}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Academic Year: <strong>{iep.academicYear}</strong> · Primary
                  Classification: <strong>{iep.primaryClassification}</strong>
                </p>
              </div>
            </div>

            {/* Quick Student Switcher and Print */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  {isCoordinatorOrLeadership
                    ? 'Student Caseload'
                    : 'My Assigned Student'}
                </span>
                <select
                  id="iep-student-select"
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

              <button
                type="button"
                onClick={handlePrint}
                className="p-2.5 bg-white hover:bg-stone-50 border border-[#E8DFC8] rounded-xl text-stone-700 shadow-2xs transition-colors self-end"
                title="Print Official IEP Document"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#EFE7DC]">
            {IEP_TABS.map((tab) => (
              <button
                key={tab}
                id={`iep-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-[#6E161E] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF]'
                }`}
              >
                {tab}
                {tab === 'SMART Goals' && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}
                  >
                    {iep.goals.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Profile & Team */}
          {activeTab === 'Profile & Team' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-stone-900">
                  Student IEP Context & Placement
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">
                      Special Consideration / Program Type
                    </label>
                    <input
                      type="text"
                      value={iep.consideration}
                      onChange={(e) =>
                        setIep({ ...iep, consideration: e.target.value })
                      }
                      className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">
                      Educational Placement & Support Level
                    </label>
                    <input
                      type="text"
                      value={iep.currentPlacement}
                      onChange={(e) =>
                        setIep({ ...iep, currentPlacement: e.target.value })
                      }
                      className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-stone-900">
                  Multidisciplinary IEP Team Members
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {iep.teamMembers.map((tm) => (
                    <div
                      key={tm.id}
                      className="p-3.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#6E161E] text-white flex items-center justify-center font-bold text-xs">
                        {tm.initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-stone-900 truncate">
                          {tm.name}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {tm.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Baseline Diagnostics */}
          {activeTab === 'Baseline Diagnostics' && (
            <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Present Levels of Academic & Functional Performance (PLAAFP)
                  </h2>
                  <p className="text-xs text-stone-500">
                    Synthesized from FEDC observations, sensory profiles, and
                    School Function Assessment (SFA).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleObservationDrawer}
                  className="px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-[#6E161E] border border-[#E8DFC8] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Open Reference Drawer
                </button>
              </div>

              <div className="space-y-4">
                {iep.performanceAreas.map((pa) => (
                  <div
                    key={pa.id}
                    className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        {pa.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px]">
                        {pa.category}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <p>
                        <strong>Strengths:</strong> {pa.strengths}
                      </p>
                      <p>
                        <strong>Needs:</strong> {pa.needs}
                      </p>
                      <p>
                        <strong>Impact of Need:</strong> {pa.impactOfNeed}
                      </p>
                      <p>
                        <strong>Summary of Assessment Results:</strong>{' '}
                        {pa.summaryOfResults}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: SMART Goals with Deep Weekly Report Tracking Integration */}
          {activeTab === 'SMART Goals' && (
            <div className="space-y-6">
              {/* Linked Weekly Progress Header Card */}
              <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-stone-900">
                        Annual SMART Goals & Weekly Monitoring (
                        {iep.goals.length})
                      </h2>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {achievedGoalsCount} Mastered / {iep.goals.length} Goals
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Goals automatically sync with Weekly IEP Reports. When the
                      SE Teacher logs weekly ratings and marks mastery, the last
                      addressed date and achievement records update here.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      id="btn-open-weekly-report-from-iep"
                      onClick={() => navigateToWeeklyReport(currentStudent.id)}
                      className="px-4 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>Log Weekly Progress</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-add-smart-goal"
                      onClick={handleOpenAddGoal}
                      className="px-4 py-2 bg-[#F5B842] hover:bg-[#EEAA2B] text-stone-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add SMART Goal</span>
                    </button>
                  </div>
                </div>

                {/* Progress Summary KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">
                        Total SMART Goals
                      </span>
                      <p className="text-base font-black text-stone-900">
                        {iep.goals.length} Active
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">
                        Tracked in Weekly Reports
                      </span>
                      <p className="text-base font-black text-amber-800">
                        {addressedGoalsCount} Addressed
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase">
                        Mastery / Achievement
                      </span>
                      <p className="text-base font-black text-emerald-800">
                        {goalProgressAvg}% Completed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SMART Goals List */}
              <div className="space-y-4">
                {iep.goals.map((goal, gIdx) => {
                  const isExpanded = expandedHistoryGoalId === goal.id;
                  const hasHistory = Boolean(
                    goal.addressedHistory && goal.addressedHistory.length > 0,
                  );

                  return (
                    <div
                      key={goal.id}
                      id={`iep-goal-card-${goal.id}`}
                      className={`bg-white border rounded-3xl p-6 shadow-xs space-y-4 transition-all ${
                        goal.achieved
                          ? 'border-emerald-200 ring-1 ring-emerald-300/40 bg-linear-to-b from-white to-emerald-50/20'
                          : 'border-[#EFE7DC] hover:border-[#6E161E]/30'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-stone-100">
                        <div className="flex items-start gap-3">
                          <span className="w-8 h-8 rounded-xl bg-[#6E161E] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                            {goal.code || `GL-00${gIdx + 1}`}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-bold text-[#6E161E] uppercase tracking-wider bg-[#6E161E]/10 px-2 py-0.5 rounded-md">
                                Domain: {goal.performanceArea}
                              </span>
                              {goal.achieved ? (
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                  🎯 Goal Mastered / Achieved
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                                  In Progress
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-stone-900 mt-1.5 leading-snug">
                              {goal.measurableGoal}
                            </h3>
                          </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleGoalAchieved(goal.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                              goal.achieved
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50 hover:text-emerald-900'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {goal.achieved
                              ? '✓ Target Achieved'
                              : 'Mark Achieved'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditGoal(goal)}
                            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                            title="Edit SMART Goal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Delete Goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Goal Achievement Detail Banner (if achieved) */}
                      {goal.achieved && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-emerald-700" />
                              Achieved on:{' '}
                              {goal.achievedDate || 'Recent Weekly Log'}
                            </span>
                            {goal.achievedInReportId && (
                              <span className="text-[10px] font-mono text-emerald-800 bg-white/70 px-2 py-0.5 rounded-md border border-emerald-200">
                                Via Weekly Report
                              </span>
                            )}
                          </div>
                          {goal.achievedNote && (
                            <p className="text-[11px] text-emerald-900 mt-1 font-medium bg-white/60 p-2 rounded-xl border border-emerald-200/60">
                              "{goal.achievedNote}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Goal Benchmark Parameters Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FAF5EF] p-3.5 rounded-2xl border border-[#E8DFC8]">
                        <div>
                          <span className="font-bold text-stone-500 uppercase text-[10px] block">
                            Evaluation Method
                          </span>
                          <span className="text-stone-800">
                            {goal.evaluationMethod || 'Observation checklist'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-stone-500 uppercase text-[10px] block">
                            Schedule
                          </span>
                          <span className="text-stone-800">
                            {goal.schedule || 'Weekly'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-stone-500 uppercase text-[10px] block">
                            Target Date
                          </span>
                          <span className="text-[#6E161E] font-bold">
                            {goal.targetDate || 'End of Term'}
                          </span>
                        </div>
                      </div>

                      {/* Addressed Date & Weekly Progress Tracking Section */}
                      <div className="pt-2 border-t border-stone-100 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            {goal.lastAddressedDate ? (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold flex items-center gap-1.5 text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                                Last Addressed:{' '}
                                <strong>{goal.lastAddressedDate}</strong> (Week{' '}
                                {goal.lastAddressedWeek || 8})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 text-[11px]">
                                ⏳ Not yet addressed in weekly reports
                              </span>
                            )}

                            {goal.lastAddressedRating && (
                              <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800 font-bold text-[11px]">
                                Latest Weekly Rating: {goal.lastAddressedRating}{' '}
                                / 5
                              </span>
                            )}

                            {(goal.timesAddressed || 0) > 0 && (
                              <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 text-[10px]">
                                {goal.timesAddressed} weekly report(s)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {hasHistory && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedHistoryGoalId(
                                    isExpanded ? null : goal.id,
                                  )
                                }
                                className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1"
                              >
                                <span>
                                  {isExpanded
                                    ? 'Hide Addressed History'
                                    : `View Addressed History (${goal.addressedHistory?.length})`}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                navigateToWeeklyReport(currentStudent.id)
                              }
                              className="text-[11px] font-bold text-stone-600 hover:text-[#6E161E] hover:underline flex items-center gap-1"
                            >
                              <span>Log in Weekly Report</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Collapsible History Table of Addressed Dates */}
                        {isExpanded && hasHistory && (
                          <div className="bg-[#FAF5EF] rounded-2xl p-3 border border-[#E8DFC8] space-y-2 animate-in fade-in duration-150">
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                              Weekly Progress Report Addressed Dates &
                              Observation Log
                            </span>
                            <div className="space-y-1.5">
                              {goal.addressedHistory?.map((log, lIdx) => (
                                <div
                                  key={log.reportId || lIdx}
                                  className="bg-white p-2.5 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="px-2 py-0.5 rounded-md bg-[#6E161E] text-white font-bold text-[10px]">
                                      Week {log.weekNumber}
                                    </span>
                                    <span className="font-semibold text-stone-800">
                                      Date: {log.addressedDate}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                      Rating: {log.rating}/5
                                    </span>
                                    {log.achieved && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                        🎯 Mastered
                                      </span>
                                    )}
                                  </div>
                                  {log.notes && (
                                    <p className="text-[11px] text-stone-600 italic line-clamp-1 max-w-md">
                                      "{log.notes}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: Accommodations & Services */}
          {activeTab === 'Accommodations & Services' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-stone-900">
                  Direct & Related Services Schedule
                </h2>
                <div className="space-y-3">
                  {iep.serviceSchedule.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">
                          {srv.serviceName}
                        </h3>
                        <p className="text-stone-500 mt-0.5">
                          Type: {srv.type} · Location: {srv.location}
                        </p>
                      </div>
                      <div className="text-right font-bold text-[#6E161E] shrink-0">
                        {srv.duration}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-stone-900">
                  Instructional & Environmental Accommodations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <span className="font-bold text-[#6E161E] uppercase text-[10px] block">
                      Instructional Accommodations
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-stone-700">
                      {iep.instructionalAccommodations.map((acc, i) => (
                        <li key={i}>{acc}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <span className="font-bold text-[#6E161E] uppercase text-[10px] block">
                      Environmental Accommodations
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-stone-700">
                      {iep.environmentalAccommodations.map((acc, i) => (
                        <li key={i}>{acc}</li>
                      ))}
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
                <h2 className="text-base font-bold text-stone-900">
                  Official Signatures & Approvals
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Verified parent agreement and multidisciplinary committee
                  approvals.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-700 mx-auto" />
                  <h3 className="text-xs font-bold text-emerald-950">
                    GPK Coordinator
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    Signed: {currentUser.name}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-700 mx-auto" />
                  <h3 className="text-xs font-bold text-emerald-950">
                    School Principal
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    Approved for Year 2026–2027
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-700 mx-auto" />
                  <h3 className="text-xs font-bold text-emerald-950">
                    Parent Consent Verified
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    {iep.parentApproval.parentName} ({iep.parentApproval.date})
                  </p>
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
              <FileText className="w-4 h-4" /> Toggle Observation Reference
              Drawer
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

      {/* EDIT / ADD SMART GOAL MODAL */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-heading font-black text-base text-stone-900">
                {isEditingNew
                  ? 'Add Annual SMART Goal'
                  : `Edit Goal ${editingGoal.code}`}
              </h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Goal Code</label>
                  <input
                    type="text"
                    value={editingGoal.code}
                    onChange={(e) =>
                      setEditingGoal({ ...editingGoal, code: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    Performance Domain Area
                  </label>
                  <select
                    value={editingGoal.performanceArea}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        performanceArea: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-semibold"
                  >
                    <option value="Social/Emotional">Social/Emotional</option>
                    <option value="Motor">Motor / Sensory</option>
                    <option value="Communication">
                      Communication & Speech
                    </option>
                    <option value="Academic">Academic & Cognitive</option>
                    <option value="Adaptive/Independence">
                      Adaptive / Daily Living
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  Measurable Goal Statement (SMART)
                </label>
                <textarea
                  rows={3}
                  value={editingGoal.measurableGoal}
                  onChange={(e) =>
                    setEditingGoal({
                      ...editingGoal,
                      measurableGoal: e.target.value,
                    })
                  }
                  placeholder="E.g., Student will independently request a sensory break in 4 out of 5 observed opportunities..."
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={editingGoal.targetDate || ''}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        targetDate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    Monitoring Schedule
                  </label>
                  <select
                    value={editingGoal.schedule || 'Weekly'}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        schedule: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-semibold"
                  >
                    <option value="Weekly">Weekly (GPK Report)</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Termly">Termly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  Evaluation Method
                </label>
                <input
                  type="text"
                  value={editingGoal.evaluationMethod || ''}
                  onChange={(e) =>
                    setEditingGoal({
                      ...editingGoal,
                      evaluationMethod: e.target.value,
                    })
                  }
                  placeholder="E.g., Weekly GPK observation rubric and anecdotal logs"
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl"
                />
              </div>

              {/* Goal Achievement Settings */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingGoal.achieved}
                    onChange={(e) =>
                      setEditingGoal({
                        ...editingGoal,
                        achieved: e.target.checked,
                        achievedDate: e.target.checked
                          ? editingGoal.achievedDate ||
                            new Date().toISOString().split('T')[0]
                          : undefined,
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-emerald-950">
                    Mark Goal as Achieved / Mastered
                  </span>
                </label>

                {editingGoal.achieved && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-emerald-900 block">
                        Achieved Date
                      </label>
                      <input
                        type="date"
                        value={editingGoal.achievedDate || ''}
                        onChange={(e) =>
                          setEditingGoal({
                            ...editingGoal,
                            achievedDate: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-emerald-900 block">
                        Achievement Notes
                      </label>
                      <input
                        type="text"
                        value={editingGoal.achievedNote || ''}
                        onChange={(e) =>
                          setEditingGoal({
                            ...editingGoal,
                            achievedNote: e.target.value,
                          })
                        }
                        placeholder="Mastery summary..."
                        className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedGoal}
                className="px-5 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
