import React, { useState } from 'react';
import { demoRoleSwitcherEnabled, useApp } from '../../context/AppContext';
import { ApiClientError } from '../../services/apiClient';
import { storageService } from '../../services/storageService';
import { studentAdministrationService } from '../../services/studentAdministrationService';
import {
  Student,
  ObservationAssignment,
  ObservationFormDefinition,
  ObservationInstrumentType,
} from '../../types';
import { ObservationHistoryViewer } from './ObservationHistoryViewer';
import {
  Users,
  ClipboardCheck,
  Plus,
  Edit3,
  AlertCircle,
  Trash2,
  Layers,
  Settings2,
  Send,
  UserCheck,
} from 'lucide-react';

type CoordinatorTab =
  'FORMS' | 'ASSIGNMENTS' | 'GPK_MANAGEMENT' | 'ALL_RESULTS';

export const CoordinatorObservationManager: React.FC = () => {
  const {
    organizationId,
    currentUser,
    allUsers,
    students,
    showToast,
    refreshData,
    selectedStudentId,
    setSelectedStudentId,
    navigateToIEP,
  } = useApp();

  const [activeTab, setActiveTab] = useState<CoordinatorTab>('GPK_MANAGEMENT');
  const [searchQuery, setSearchQuery] = useState('');

  // Forms state
  const [forms, setForms] = useState<ObservationFormDefinition[]>(() =>
    storageService.getObservationForms(),
  );
  const [editingForm, setEditingForm] =
    useState<ObservationFormDefinition | null>(null);

  // Assignments state
  const [assignments, setAssignments] = useState<ObservationAssignment[]>(() =>
    storageService.getObservationAssignments(),
  );
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    studentId:
      students.filter((s) => s.specialNeedsFlag)[0]?.id ||
      students[0]?.id ||
      '',
    assignedToUserId:
      allUsers.find((u) => u.roleTitle.includes('Therapist') || u.isGPK)?.id ||
      allUsers[0]?.id ||
      '',
    instrumentType: 'FEDC' as ObservationInstrumentType,
    academicYear: '2026-2027',
    dueDate: '2026-11-30',
    notes: 'Annual developmental observation evaluation',
  });

  // GPK-Student Assignment state
  const [isAssignGPKModalOpen, setIsAssignGPKModalOpen] = useState(false);
  const [selectedStudentForGPK, setSelectedStudentForGPK] =
    useState<Student | null>(null);
  const [selectedGPKTeacherId, setSelectedGPKTeacherId] = useState<string>('');
  const [isAssigningGPK, setIsAssigningGPK] = useState(false);

  // Selected student for "ALL_RESULTS" tab
  const specialStudents = students.filter((s) => s.specialNeedsFlag);
  const activeStudentForResults =
    students.find((s) => s.id === selectedStudentId) ||
    specialStudents[0] ||
    students[0];

  // Security check: Only Coordinator and Leadership should access this view
  const isAuthorizedCoordinator =
    currentUser.isSpecialEdCoordinator ||
    currentUser.role === 'PRINCIPAL' ||
    currentUser.role === 'DIRECTOR' ||
    (currentUser.role === 'SPECIAL_ED_TEACHER' && !currentUser.isGPK);

  // GPK Teachers list (strictly filter actual GPK teachers, excluding coordinator)
  const gpkTeachers = allUsers.filter(
    (u) =>
      u.isGPK ||
      (u.roleTitle.toLowerCase().includes('gpk') && !u.isSpecialEdCoordinator),
  );

  // Handle Form Save
  const handleSaveForm = (form: ObservationFormDefinition) => {
    storageService.saveObservationForm(form);
    setForms(storageService.getObservationForms());
    setEditingForm(null);
    showToast(
      'success',
      'Observation Form Template Saved',
      `Updated configuration for "${form.title}"`,
    );
  };

  // Handle Create Assignment
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === newAssignment.studentId);
    const assignedUser = allUsers.find(
      (u) => u.id === newAssignment.assignedToUserId,
    );

    if (!student || !assignedUser) {
      showToast(
        'error',
        'Incomplete Assignment',
        'Please select a valid student and assessor.',
      );
      return;
    }

    const created: ObservationAssignment = {
      id: `oa-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      assignedToUserId: assignedUser.id,
      assignedToUserName: assignedUser.name,
      assignedToUserRole: assignedUser.roleTitle,
      instrumentType: newAssignment.instrumentType,
      academicYear: newAssignment.academicYear,
      dueDate: newAssignment.dueDate,
      status: 'PENDING',
      assignedByCoordinatorId: currentUser.id,
      assignedByCoordinatorName: currentUser.name,
      assignedDate: new Date().toISOString().split('T')[0],
      notes: newAssignment.notes,
    };

    storageService.saveObservationAssignment(created);
    setAssignments(storageService.getObservationAssignments());
    setIsAssignModalOpen(false);
    showToast(
      'success',
      'Observation Assigned',
      `Assigned ${created.instrumentType} for ${student.name} to ${assignedUser.name}`,
    );
  };

  // Handle Delete Assignment
  const handleDeleteAssignment = (id: string) => {
    storageService.deleteObservationAssignment(id);
    setAssignments(storageService.getObservationAssignments());
    showToast(
      'info',
      'Assignment Removed',
      'The observation assignment was deleted.',
    );
  };

  const handleAssignGPK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForGPK || !selectedGPKTeacherId || isAssigningGPK)
      return;

    const teacher = allUsers.find((u) => u.id === selectedGPKTeacherId);
    if (!teacher) return;

    setIsAssigningGPK(true);
    try {
      if (demoRoleSwitcherEnabled) {
        const success = storageService.assignGPKTeacherToStudent(
          selectedStudentForGPK.id,
          teacher.id,
          teacher.name,
        );
        if (!success) {
          showToast(
            'error',
            'Capacity Limit Reached',
            'The fake-data GPK teacher has reached the demo caseload limit.',
          );
          return;
        }
      } else {
        if (!teacher.membershipId) {
          showToast(
            'error',
            'Assignment Failed',
            'This staff entry is missing the membership required for assignment.',
          );
          return;
        }
        const now = new Date();
        const startsOn = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        await studentAdministrationService.assignGpkTeacher(
          organizationId,
          selectedStudentForGPK.id,
          { membershipId: teacher.membershipId, startsOn },
        );
      }

      await refreshData();
      setIsAssignGPKModalOpen(false);
      setSelectedGPKTeacherId('');
      showToast(
        'success',
        'GPK Teacher Assigned',
        `Assigned ${selectedStudentForGPK.name} to GPK Teacher ${teacher.name}.`,
      );
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === 'GPK_CASELOAD_CAPACITY'
      ) {
        showToast(
          'error',
          'Capacity Limit Reached',
          'This GPK teacher has reached the server-configured caseload limit. Choose another teacher or update an existing assignment.',
        );
      } else if (
        error instanceof ApiClientError &&
        (error.code === 'GPK_ASSIGNMENT_CONFLICT' ||
          error.category === 'conflict')
      ) {
        showToast(
          'error',
          'Assignment Conflict',
          'The assignment changed in another request. Refresh the data and try again.',
        );
      } else {
        showToast(
          'error',
          'Assignment Failed',
          'The GPK assignment could not be saved. Please try again.',
        );
      }
    } finally {
      setIsAssigningGPK(false);
    }
  };

  if (!isAuthorizedCoordinator) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-lg mx-auto my-8">
        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-stone-900 text-base">
          Special Education Coordinator Access Required
        </h3>
        <p className="text-xs text-stone-600 mt-1">
          Observation form template administration, staff assignments, and GPK
          caseload allocation are managed by the Special Education Coordinator.
        </p>
      </div>
    );
  }

  return (
    <div id="coordinator-observation-manager" className="space-y-6">
      {/* Coordinator Header & Tab Navigation */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#6E161E] text-white">
              COORDINATOR PORTAL
            </span>
            <h2 className="font-heading font-black text-base text-stone-900">
              Observation & Special Needs Management
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure observation forms, assign specialist evaluations, manage
            GPK caseloads, and inspect results.
          </p>
        </div>

        {/* 4 Feature Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF5EF] p-1.5 rounded-xl border border-[#E8DFC8]">
          <button
            id="tab-coord-gpk"
            onClick={() => setActiveTab('GPK_MANAGEMENT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'GPK_MANAGEMENT'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. GPK & Student Assignment</span>
          </button>

          <button
            id="tab-coord-assignments"
            onClick={() => setActiveTab('ASSIGNMENTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ASSIGNMENTS'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>2. Assign Observations ({assignments.length})</span>
          </button>

          <button
            id="tab-coord-forms"
            onClick={() => setActiveTab('FORMS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'FORMS'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>3. Observation Forms ({forms.length})</span>
          </button>

          <button
            id="tab-coord-results"
            onClick={() => setActiveTab('ALL_RESULTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ALL_RESULTS'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. View All Results</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GPK TEACHERS & STUDENTS ASSIGNMENT MANAGEMENT */}
      {activeTab === 'GPK_MANAGEMENT' && (
        <div id="gpk-management-section" className="space-y-6">
          {/* GPK Caseload Capacity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gpkTeachers.map((teacher) => {
              const assigned = students.filter(
                (s) => s.assignedGPKTeacherId === teacher.id,
              );
              const maxCaseload = assigned[0]?.gpkMaxCaseload ?? 2;
              const isAtDisplayedCapacity = assigned.length >= maxCaseload;
              return (
                <div
                  key={teacher.id}
                  id={`gpk-card-${teacher.id}`}
                  className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 transition-all ${
                    isAtDisplayedCapacity
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-[#EFE7DC]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          teacher.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'
                        }
                        alt={teacher.name}
                        className="w-9 h-9 rounded-xl object-cover border border-stone-200"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-stone-900">
                          {teacher.name}
                        </h4>
                        <p className="text-[10px] text-stone-500">
                          {teacher.roleTitle}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isAtDisplayedCapacity
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {assigned.length} / {maxCaseload} Students
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-100 space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">
                      Assigned Special Needs Students:
                    </span>
                    {assigned.length === 0 ? (
                      <p className="text-[11px] text-stone-400 italic">
                        No students assigned currently (displayed capacity:{' '}
                        {maxCaseload})
                      </p>
                    ) : (
                      assigned.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between bg-[#FAF5EF] p-2 rounded-lg border border-[#E8DFC8]"
                        >
                          <span className="font-semibold text-stone-800 text-xs">
                            {s.name} (Gr {s.grade})
                          </span>
                          <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded">
                            {s.primaryDiagnosis?.split(' ')[0] || 'SN'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Needs Students Assignment Table */}
          <div className="bg-white border border-[#EFE7DC] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#EFE7DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF5EF]">
              <div>
                <h3 className="font-heading font-bold text-sm text-stone-900">
                  Special Needs Students GPK Assignment Roster
                </h3>
                <p className="text-xs text-stone-500">
                  Rule: Each GPK Teacher can support a maximum of 2 Special
                  Needs students.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DC] bg-stone-50/70 text-stone-500 font-bold">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Grade & Homeroom</th>
                    <th className="py-3 px-4">Classification / Diagnosis</th>
                    <th className="py-3 px-4">Assigned GPK Teacher</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DC] text-stone-800">
                  {specialStudents.map((student) => {
                    const assignedTeacher = allUsers.find(
                      (u) => u.id === student.assignedGPKTeacherId,
                    );
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-[#FAF5EF]/60 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                student.avatarUrl ||
                                'https://images.unsplash.com/photo-1544717305-2782549b5136?w=80'
                              }
                              alt={student.name}
                              className="w-8 h-8 rounded-full object-cover border border-stone-200"
                            />
                            <div>
                              <p className="font-bold text-stone-900">
                                {student.name}
                              </p>
                              <p className="text-[10px] text-stone-400 font-mono">
                                NISN: {student.nisn}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-700">
                          Grade {student.grade} · {student.className}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            {student.primaryDiagnosis || 'Special Support'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {assignedTeacher ? (
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div>
                                <p className="font-bold text-stone-900">
                                  {assignedTeacher.name}
                                </p>
                                <p className="text-[10px] text-stone-500">
                                  {assignedTeacher.roleTitle}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            id={`reassign-gpk-btn-${student.id}`}
                            onClick={() => {
                              setSelectedStudentForGPK(student);
                              setSelectedGPKTeacherId(
                                student.assignedGPKTeacherId ||
                                  gpkTeachers[0]?.id ||
                                  '',
                              );
                              setIsAssignGPKModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#6E161E] hover:text-white border border-[#E8DFC8] rounded-xl font-bold text-stone-700 transition-all text-xs shadow-2xs"
                          >
                            Assign / Reassign GPK
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGN OBSERVATION TO ANOTHER USER */}
      {activeTab === 'ASSIGNMENTS' && (
        <div id="observation-assignments-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-stone-900">
                Active Observation Assignments & Specialist Referrals
              </h3>
              <p className="text-xs text-stone-500">
                Delegate annual or ad-hoc developmental evaluations to
                Occupational Therapists, Speech Pathologists, or GPKs.
              </p>
            </div>

            <button
              id="open-assign-obs-modal-btn"
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#6E161E] hover:bg-[#581118] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New Observation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assn) => (
              <div
                key={assn.id}
                id={`assignment-card-${assn.id}`}
                className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      assn.instrumentType === 'FEDC'
                        ? 'bg-purple-100 text-purple-800'
                        : assn.instrumentType === 'SENSORY_PROFILE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {assn.instrumentType} Instrument
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      assn.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : assn.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {assn.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-sm text-stone-900">
                    {assn.studentName}
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Assigned to:{' '}
                    <strong className="text-stone-900">
                      {assn.assignedToUserName}
                    </strong>{' '}
                    ({assn.assignedToUserRole})
                  </p>
                </div>

                <div className="bg-[#FAF5EF] p-2.5 rounded-xl border border-[#E8DFC8] text-[11px] space-y-1 text-stone-600">
                  <p>
                    <strong className="text-stone-800">Due Date:</strong>{' '}
                    {assn.dueDate}
                  </p>
                  <p>
                    <strong className="text-stone-800">Academic Year:</strong>{' '}
                    {assn.academicYear}
                  </p>
                  <p>
                    <strong className="text-stone-800">Notes:</strong>{' '}
                    {assn.notes}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                  <span className="text-stone-400">
                    Assigned {assn.assignedDate}
                  </span>
                  <button
                    onClick={() => handleDeleteAssignment(assn.id)}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OBSERVATION FORMS MANAGEMENT */}
      {activeTab === 'FORMS' && (
        <div id="observation-forms-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-stone-900">
                Observation Instruments & Rubric Form Templates
              </h3>
              <p className="text-xs text-stone-500">
                Manage evaluation criteria, score ranges, and diagnostic
                instruments for the Special Education program.
              </p>
            </div>

            <button
              id="create-new-form-btn"
              onClick={() =>
                setEditingForm({
                  id: `form-${Date.now()}`,
                  title: 'New Observation Instrument',
                  type: 'CUSTOM',
                  version: '1.0',
                  description:
                    'Custom diagnostic rubric for classroom observation.',
                  sectionsCount: 4,
                  totalItemsCount: 20,
                  maxScore: 60,
                  lastUpdated: new Date().toISOString().split('T')[0],
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-[#6E161E] hover:bg-[#581118] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Form</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forms.map((form) => (
              <div
                key={form.id}
                id={`form-card-${form.id}`}
                className="bg-white border border-[#EFE7DC] rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6E161E]/10 text-[#6E161E] border border-[#6E161E]/20">
                    {form.type} Instrument
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    v{form.version}
                  </span>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-sm text-stone-900">
                    {form.title}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    {form.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#FAF5EF] p-2.5 rounded-xl border border-[#E8DFC8] text-center text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold">
                      Sections
                    </span>
                    <p className="font-bold text-stone-800">
                      {form.sectionsCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold">
                      Items
                    </span>
                    <p className="font-bold text-stone-800">
                      {form.totalItemsCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold">
                      Max Score
                    </span>
                    <p className="font-bold text-stone-800">{form.maxScore}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-[10px] text-stone-400">
                    Updated: {form.lastUpdated}
                  </span>
                  <button
                    onClick={() => setEditingForm(form)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#6E161E] hover:text-white border border-[#E8DFC8] rounded-xl text-xs font-bold transition-all text-stone-700 shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Form</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VIEW ALL OBSERVATION RESULTS */}
      {activeTab === 'ALL_RESULTS' && (
        <div id="all-results-section" className="space-y-6">
          {/* Student Selector Ribbon for Coordinator */}
          <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase">
                  Coordinator Student Explorer
                </span>
                <h3 className="font-heading font-bold text-sm text-stone-900">
                  Select Special Needs Student:
                </h3>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {specialStudents.map((s) => (
                  <button
                    key={s.id}
                    id={`select-student-result-btn-${s.id}`}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeStudentForResults.id === s.id
                        ? 'bg-[#6E161E] text-white shadow-xs'
                        : 'bg-[#FAF5EF] text-stone-700 hover:bg-[#F2EAE0] border border-[#E8DFC8]'
                    }`}
                  >
                    <img
                      src={
                        s.avatarUrl ||
                        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=60'
                      }
                      alt={s.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Render Multi-Year Observation History Viewer for Selected Student */}
          <ObservationHistoryViewer
            student={activeStudentForResults}
            currentUser={currentUser}
            onNavigateToIEP={navigateToIEP}
            onOpenAssessmentForm={(type) => {
              setActiveTab('FORM_TEMPLATES');
            }}
          />
        </div>
      )}

      {/* MODAL: ASSIGN GPK TEACHER */}
      {isAssignGPKModalOpen && selectedStudentForGPK && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-stone-900">
                  Assign GPK Teacher
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Student: {selectedStudentForGPK.name} (Grade{' '}
                  {selectedStudentForGPK.grade})
                </p>
              </div>
              <button
                onClick={() => setIsAssignGPKModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignGPK} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700">
                  Select GPK Teacher (capacity is enforced by the server):
                </label>
                <div className="space-y-2">
                  {gpkTeachers.map((teacher) => {
                    const assigned = students.filter(
                      (s) =>
                        s.assignedGPKTeacherId === teacher.id &&
                        s.id !== selectedStudentForGPK.id,
                    );
                    const maxCaseload = assigned[0]?.gpkMaxCaseload ?? 2;
                    const isAtDisplayedCapacity =
                      assigned.length >= maxCaseload;
                    return (
                      <label
                        key={teacher.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedGPKTeacherId === teacher.id
                            ? 'border-[#6E161E] bg-[#6E161E]/5 ring-1 ring-[#6E161E]'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="gpkTeacher"
                            value={teacher.id}
                            disabled={isAssigningGPK}
                            checked={selectedGPKTeacherId === teacher.id}
                            onChange={() => setSelectedGPKTeacherId(teacher.id)}
                            className="accent-[#6E161E]"
                          />
                          <div>
                            <p className="font-bold text-stone-900">
                              {teacher.name}
                            </p>
                            <p className="text-[10px] text-stone-500">
                              {teacher.roleTitle}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAtDisplayedCapacity
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {assigned.length}/{maxCaseload} currently assigned
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  GPK Direct Access Policy:
                </p>
                <p>
                  Upon assignment, this teacher will have exclusive direct
                  access to {selectedStudentForGPK.name}'s observation records,
                  IEP plan, and weekly logs.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAssignGPKModalOpen(false)}
                  disabled={isAssigningGPK}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedGPKTeacherId || isAssigningGPK}
                  className="px-4 py-2 bg-[#6E161E] hover:bg-[#581118] text-white rounded-xl font-bold shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAssigningGPK ? 'Assigning…' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN OBSERVATION EVALUATION */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-stone-900">
                  Assign Observation Task
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Delegate developmental evaluation to specialist
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateAssignment}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  Special Needs Student:
                </label>
                <select
                  value={newAssignment.studentId}
                  onChange={(e) =>
                    setNewAssignment({
                      ...newAssignment,
                      studentId: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-semibold"
                >
                  {specialStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Grade {s.grade} - {s.primaryDiagnosis})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  Assign To Assessor / Specialist:
                </label>
                <select
                  value={newAssignment.assignedToUserId}
                  onChange={(e) =>
                    setNewAssignment({
                      ...newAssignment,
                      assignedToUserId: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-semibold"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    Instrument Type:
                  </label>
                  <select
                    value={newAssignment.instrumentType}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        instrumentType: e.target.value as any,
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-semibold"
                  >
                    <option value="FEDC">FEDC (Greenspan)</option>
                    <option value="SENSORY_PROFILE">Sensory Profile 2</option>
                    <option value="SFA">SFA Assessment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Due Date:</label>
                  <input
                    type="date"
                    value={newAssignment.dueDate}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        dueDate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  Evaluation Instructions & Scope:
                </label>
                <textarea
                  rows={3}
                  value={newAssignment.notes}
                  onChange={(e) =>
                    setNewAssignment({
                      ...newAssignment,
                      notes: e.target.value,
                    })
                  }
                  placeholder="e.g. Conduct sensory motor assessment in OT room and morning classroom observation."
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-normal placeholder-stone-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6E161E] hover:bg-[#581118] text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / CREATE OBSERVATION FORM DEFINITION */}
      {editingForm && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-stone-900">
                  {editingForm.id.startsWith('form-')
                    ? 'Create Observation Form'
                    : 'Edit Observation Form Template'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Customize rubric fields and scoring bounds
                </p>
              </div>
              <button
                onClick={() => setEditingForm(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Form Title:</label>
                <input
                  type="text"
                  value={editingForm.title}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, title: e.target.value })
                  }
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  Description / Diagnostic Framework:
                </label>
                <textarea
                  rows={2}
                  value={editingForm.description}
                  onChange={(e) =>
                    setEditingForm({
                      ...editingForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    Sections Count:
                  </label>
                  <input
                    type="number"
                    value={editingForm.sectionsCount}
                    onChange={(e) =>
                      setEditingForm({
                        ...editingForm,
                        sectionsCount: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    Items Count:
                  </label>
                  <input
                    type="number"
                    value={editingForm.totalItemsCount}
                    onChange={(e) =>
                      setEditingForm({
                        ...editingForm,
                        totalItemsCount: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Max Score:</label>
                  <input
                    type="number"
                    value={editingForm.maxScore}
                    onChange={(e) =>
                      setEditingForm({
                        ...editingForm,
                        maxScore: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingForm(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm(editingForm)}
                  className="px-4 py-2 bg-[#6E161E] hover:bg-[#581118] text-white rounded-xl font-bold shadow-xs"
                >
                  Save Form Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
