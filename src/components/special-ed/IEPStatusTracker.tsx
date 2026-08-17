import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { IEPRecord, Student, LJReviewStatus, LJApprovalStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  RotateCcw, 
  Edit3, 
  Eye, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Send, 
  AlertCircle, 
  X,
  FileSignature,
  FileText,
  UserCheck
} from 'lucide-react';

interface IEPStatusTrackerProps {
  onSelectIEPForEdit?: (studentId: string) => void;
}

export const IEPStatusTracker: React.FC<IEPStatusTrackerProps> = ({ onSelectIEPForEdit }) => {
  const { currentUser, students, setSelectedStudentId, showToast, refreshData } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All Grades');
  const [stageFilter, setStageFilter] = useState('All Stages');

  // Review Modal state
  const [reviewingIEP, setReviewingIEP] = useState<IEPRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Return'>('Approve');
  const [reviewComment, setReviewComment] = useState('');

  // Timeline / History Modal state
  const [historyIEP, setHistoryIEP] = useState<IEPRecord | null>(null);

  // Fetch all special needs students and their IEPs
  const isCoordinator = currentUser.isSpecialEdCoordinator;
  const isDirector = currentUser.role === 'DIRECTOR' || currentUser.role === 'PRINCIPAL';
  const isSETeacher = currentUser.isGPK || (currentUser.role === 'SPECIAL_ED_TEACHER' && !currentUser.isSpecialEdCoordinator);

  const specialStudents = useMemo(() => {
    if (isCoordinator || isDirector) {
      return students.filter(s => s.specialNeedsFlag);
    }
    return students.filter(s => s.specialNeedsFlag && (s.assignedGPKTeacherId === currentUser.id || currentUser.assignedSpecialNeedsStudentIds?.includes(s.id)));
  }, [students, currentUser, isCoordinator, isDirector]);

  const iepRecords = storageService.getIEPRecords();

  // Build combined rows for all special needs students
  const studentIEPRows = useMemo(() => {
    return specialStudents.map(student => {
      const record = iepRecords.find(r => r.studentId === student.id) || {
        id: `iep-${student.id}-2026`,
        studentId: student.id,
        year: '2026',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        unit: 'Elementary',
        status: 'Draft' as const,
        draftStatus: 'Not Started' as const,
        coordinatorReviewStatus: 'Not Started' as LJReviewStatus,
        directorApprovalStatus: 'Not Started' as LJApprovalStatus,
        primaryClassification: student.primaryDiagnosis || 'Special Support',
        currentPlacement: 'General Education with GPK Support',
        teamMembers: [],
        performanceAreas: [],
        academicAccommodations: { math: 'A', science: 'A', english: 'A', pe: 'M', makerspace: 'A' },
        instructionalAccommodations: [],
        environmentalAccommodations: [],
        assessmentAccommodations: [],
        goals: [],
        workflowHistory: []
      };
      return { student, iep: record };
    });
  }, [specialStudents, iepRecords]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return studentIEPRows.filter(({ student, iep }) => {
      if (searchFilter && !student.name.toLowerCase().includes(searchFilter.toLowerCase()) && !student.nisn.includes(searchFilter)) {
        return false;
      }
      if (gradeFilter !== 'All Grades' && student.grade !== gradeFilter) return false;
      if (stageFilter === 'Draft' && iep.draftStatus !== 'Done') return false;
      if (stageFilter === 'Coordinator Review' && (iep.coordinatorReviewStatus !== 'On Progress' && iep.coordinatorReviewStatus !== 'Returned')) return false;
      if (stageFilter === 'Director Approval' && (iep.directorApprovalStatus !== 'On Progress' && iep.directorApprovalStatus !== 'Returned')) return false;
      if (stageFilter === 'Approved' && iep.directorApprovalStatus !== 'Done') return false;
      return true;
    });
  }, [studentIEPRows, searchFilter, gradeFilter, stageFilter]);

  // KPI Metrics
  const totalCount = studentIEPRows.length;
  const draftCount = studentIEPRows.filter(r => r.iep.draftStatus !== 'Done').length;
  const coordinatorReviewCount = studentIEPRows.filter(r => r.iep.draftStatus === 'Done' && r.iep.coordinatorReviewStatus !== 'Done').length;
  const directorApprovalCount = studentIEPRows.filter(r => r.iep.coordinatorReviewStatus === 'Done' && r.iep.directorApprovalStatus !== 'Done').length;
  const approvedCount = studentIEPRows.filter(r => r.iep.directorApprovalStatus === 'Done').length;

  // Handle Submit Draft (Teacher Action)
  const handleSubmitDraft = (iep: IEPRecord) => {
    storageService.updateIEPWorkflow(
      iep.id,
      'draftStatus',
      'Done',
      currentUser,
      'Submitted complete IEP proposal to Special Education Coordinator for review.'
    );
    refreshData();
    showToast('success', 'Draft Submitted', 'Annual IEP submitted to Coordinator for verification.');
  };

  // Handle Open Review
  const handleOpenReview = (iep: IEPRecord) => {
    setReviewingIEP(iep);
    setReviewAction('Approve');
    setReviewComment('');
  };

  // Handle Submit Review (Coordinator or Director Action)
  const handleSubmitReview = () => {
    if (!reviewingIEP) return;

    if (reviewAction === 'Return' && !reviewComment.trim()) {
      showToast('error', 'Feedback Required', 'Please provide revision notes explaining what adjustments are required.');
      return;
    }

    if (isCoordinator) {
      const status: LJReviewStatus = reviewAction === 'Approve' ? 'Done' : 'Returned';
      storageService.updateIEPWorkflow(
        reviewingIEP.id,
        'coordinatorReviewStatus',
        status,
        currentUser,
        reviewComment || 'Coordinator reviewed and verified baseline assessments and accommodation targets.'
      );
      showToast(
        reviewAction === 'Approve' ? 'success' : 'info',
        reviewAction === 'Approve' ? 'Coordinator Verified' : 'Returned for Adjustments',
        reviewAction === 'Approve' ? 'IEP forwarded to Director for final administrative authorization.' : 'IEP returned to assigned GPK teacher.'
      );
    } else if (isDirector) {
      const status: LJApprovalStatus = reviewAction === 'Approve' ? 'Done' : 'Returned';
      storageService.updateIEPWorkflow(
        reviewingIEP.id,
        'directorApprovalStatus',
        status,
        currentUser,
        reviewComment || 'Director authorized and ratified annual IEP accommodations and service schedule.'
      );
      showToast(
        reviewAction === 'Approve' ? 'success' : 'info',
        reviewAction === 'Approve' ? 'IEP Fully Approved' : 'Returned by Director',
        reviewAction === 'Approve' ? 'Annual IEP ratified and in active legal standing.' : 'IEP returned to Special Education Coordinator.'
      );
    }

    setReviewingIEP(null);
    refreshData();
  };

  return (
    <div id="iep-status-tracker-container" className="space-y-6">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setStageFilter('All Stages')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'All Stages' ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-sm' : 'bg-white border-[#EFE7DC] hover:border-[#6E161E]/40'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${stageFilter === 'All Stages' ? 'text-white/80' : 'text-stone-400'}`}>Total Students</span>
          <p className={`text-xl font-black mt-0.5 ${stageFilter === 'All Stages' ? 'text-white' : 'text-stone-900'}`}>{totalCount}</p>
        </div>

        <div 
          onClick={() => setStageFilter('Draft')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'Draft' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white border-[#EFE7DC] hover:border-amber-400'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${stageFilter === 'Draft' ? 'text-white/80' : 'text-amber-600'}`}>1. Teacher Draft</span>
          <p className={`text-xl font-black mt-0.5 ${stageFilter === 'Draft' ? 'text-white' : 'text-amber-700'}`}>{draftCount}</p>
        </div>

        <div 
          onClick={() => setStageFilter('Coordinator Review')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'Coordinator Review' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-[#EFE7DC] hover:border-blue-400'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${stageFilter === 'Coordinator Review' ? 'text-white/80' : 'text-blue-600'}`}>2. Coordinator Review</span>
          <p className={`text-xl font-black mt-0.5 ${stageFilter === 'Coordinator Review' ? 'text-white' : 'text-blue-700'}`}>{coordinatorReviewCount}</p>
        </div>

        <div 
          onClick={() => setStageFilter('Director Approval')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            stageFilter === 'Director Approval' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white border-[#EFE7DC] hover:border-purple-400'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${stageFilter === 'Director Approval' ? 'text-white/80' : 'text-purple-600'}`}>3. Director Approval</span>
          <p className={`text-xl font-black mt-0.5 ${stageFilter === 'Director Approval' ? 'text-white' : 'text-purple-700'}`}>{directorApprovalCount}</p>
        </div>

        <div 
          onClick={() => setStageFilter('Approved')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            stageFilter === 'Approved' ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white border-[#EFE7DC] hover:border-emerald-500'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${stageFilter === 'Approved' ? 'text-white/80' : 'text-emerald-700'}`}>4. Ratified & Active</span>
          <p className={`text-xl font-black mt-0.5 ${stageFilter === 'Approved' ? 'text-white' : 'text-emerald-800'}`}>{approvedCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search student by name or NISN..."
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
            <option value="4">Grade 4</option>
            <option value="5">Grade 5</option>
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

      {/* IEP Workflow Table */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#EFE7DC] bg-[#FAF5EF] text-stone-600 font-bold">
                <th className="py-3.5 px-4">Student & Diagnosis</th>
                <th className="py-3.5 px-4">Grade</th>
                <th className="py-3.5 px-4 text-center">Draft (Assigned Teacher)</th>
                <th className="py-3.5 px-4 text-center">Coordinator Review</th>
                <th className="py-3.5 px-4 text-center">Director Approval</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE7DC] text-stone-800">
              {filteredRows.map(({ student, iep }) => {
                const isAssignedGPK = student.assignedGPKTeacherId === currentUser.id;
                const canEdit = isAssignedGPK || isCoordinator || isDirector;
                const canSubmitDraft = (isAssignedGPK || isCoordinator) && iep.draftStatus !== 'Done';
                const canReviewCoordinator = isCoordinator && iep.draftStatus === 'Done' && iep.coordinatorReviewStatus !== 'Done';
                const canReviewDirector = isDirector && iep.coordinatorReviewStatus === 'Done' && iep.directorApprovalStatus !== 'Done';

                return (
                  <tr key={student.id} className="hover:bg-[#FAF5EF]/50 transition-colors">
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=80'}
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover border border-stone-200"
                        />
                        <div>
                          <p className="font-bold text-stone-900">{student.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-stone-500 font-mono">NISN: {student.nisn}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              {student.primaryDiagnosis || 'Special Needs'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Grade */}
                    <td className="py-3.5 px-4 font-bold text-stone-700">
                      Grade {student.grade} · {student.className}
                    </td>

                    {/* Step 1: Draft */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={iep.draftStatus || 'Not Started'} size="sm" />
                        <span className="text-[10px] text-stone-500 font-medium">
                          {student.assignedGPKTeacherName || 'Assigned GPK'}
                        </span>
                      </div>
                    </td>

                    {/* Step 2: Coordinator Review */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={iep.coordinatorReviewStatus || 'Not Started'} size="sm" />
                        <span className="text-[10px] text-stone-500 font-medium">
                          SpecEd Coordinator
                        </span>
                      </div>
                    </td>

                    {/* Step 3: Director Approval */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={iep.directorApprovalStatus || 'Not Started'} size="sm" />
                        <span className="text-[10px] text-stone-500 font-medium">
                          Director / Principal
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* History Button */}
                        <button
                          id={`iep-history-btn-${student.id}`}
                          onClick={() => setHistoryIEP(iep)}
                          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                          title="View Workflow Audit Trail"
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        {/* Edit IEP button */}
                        <button
                          id={`edit-iep-btn-${student.id}`}
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            if (onSelectIEPForEdit) onSelectIEPForEdit(student.id);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF5EF] hover:bg-[#6E161E] hover:text-white border border-[#E8DFC8] rounded-xl font-bold text-stone-700 transition-all text-xs shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>IEP Editor</span>
                        </button>

                        {/* Submit Draft (GPK) */}
                        {canSubmitDraft && (
                          <button
                            id={`submit-iep-draft-${student.id}`}
                            onClick={() => handleSubmitDraft(iep)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all text-xs shadow-2xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Draft</span>
                          </button>
                        )}

                        {/* Coordinator Review Action */}
                        {canReviewCoordinator && (
                          <button
                            id={`coord-review-iep-${student.id}`}
                            onClick={() => handleOpenReview(iep)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs shadow-2xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        )}

                        {/* Director Approval Action */}
                        {canReviewDirector && (
                          <button
                            id={`director-approve-iep-${student.id}`}
                            onClick={() => handleOpenReview(iep)}
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

      {/* REVIEW ACTION MODAL */}
      {reviewingIEP && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-stone-900">
                  {isCoordinator ? 'Special Education Coordinator Review' : 'Administrative Authorization'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  IEP ID: {reviewingIEP.id} · Student: {specialStudents.find(s => s.id === reviewingIEP.studentId)?.name}
                </p>
              </div>
              <button 
                onClick={() => setReviewingIEP(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('Approve')}
                  className={`p-3 rounded-2xl border text-center font-bold transition-all ${
                    reviewAction === 'Approve'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  <span>{isCoordinator ? 'Verify & Forward' : 'Approve & Ratify'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('Return')}
                  className={`p-3 rounded-2xl border text-center font-bold transition-all ${
                    reviewAction === 'Return'
                      ? 'bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-600/20'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <RotateCcw className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                  <span>Return for Revisions</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {reviewAction === 'Return' ? 'Revision Notes & Required Adjustments *' : 'Reviewer Feedback & Remarks (Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={reviewAction === 'Return' ? 'Specify required adjustments in goals, accommodations, or baseline evidence...' : 'Add congratulatory or clarifying comments...'}
                  className="w-full p-2.5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl font-normal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setReviewingIEP(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  className="px-4 py-2 bg-[#6E161E] hover:bg-[#581118] text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm {reviewAction === 'Approve' ? 'Verification' : 'Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORKFLOW HISTORY / AUDIT TRAIL MODAL */}
      {historyIEP && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-[#FAF5EF]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#6E161E]" />
                <div>
                  <h3 className="font-heading font-black text-base text-stone-900">IEP Workflow Audit Trail</h3>
                  <p className="text-xs text-stone-500">Student: {specialStudents.find(s => s.id === historyIEP.studentId)?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setHistoryIEP(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {(!historyIEP.workflowHistory || historyIEP.workflowHistory.length === 0) ? (
                <p className="text-stone-400 text-center py-6">No historical workflow transitions recorded yet.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {historyIEP.workflowHistory.map((h, i) => (
                    <div key={h.id || i} className="relative pl-9 space-y-1">
                      <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-[#6E161E] ring-4 ring-[#FAF5EF]" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{h.stage} → {h.status}</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 font-medium">
                        By <strong className="text-stone-800">{h.authorName}</strong> ({h.authorRole})
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
                onClick={() => setHistoryIEP(null)}
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
