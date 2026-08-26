import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLearningJourneys } from '../../hooks/useLearningJourneys';
import { ApiClientError } from '../../services/apiClient';
import { learningJourneyService } from '../../services/learningJourneyService';
import { LearningJourney } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  Plus,
  Search,
  CheckCircle2,
  RotateCcw,
  Edit3,
  Eye,
  Trash2,
  MessageSquare,
  ShieldCheck,
  Lock,
  Layers,
  Clock,
  Send,
  AlertCircle,
  X,
} from 'lucide-react';

export const LearningJourneyStatusTracker: React.FC = () => {
  const { currentUser, organizationId, navigateToJourneyEditor, showToast } =
    useApp();
  const [searchFilter, setSearchFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('All Stages');

  // Review Modal state (for Principal or Director)
  const [reviewingJourney, setReviewingJourney] =
    useState<LearningJourney | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Return'>(
    'Approve',
  );
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string>();

  // General Preview Modal state (for any user to view submitted curriculum)
  const [previewingJourney, setPreviewingJourney] =
    useState<LearningJourney | null>(null);

  const { journeys, metadata, status, error, retry } = useLearningJourneys(
    organizationId,
    {
      ...(searchFilter.trim() ? { search: searchFilter.trim() } : {}),
      ...(unitFilter ? { unitId: unitFilter } : {}),
      ...(gradeFilter ? { gradeId: gradeFilter } : {}),
      ...(subjectFilter ? { subjectId: subjectFilter } : {}),
      ...(stageFilter === 'Draft'
        ? { state: 'DRAFT' as const }
        : stageFilter === 'Principal Review'
          ? { state: 'PRINCIPAL_REVIEW' as const }
          : stageFilter === 'Director Approval'
            ? { state: 'DIRECTOR_APPROVAL' as const }
            : stageFilter === 'Approved'
              ? { state: 'APPROVED' as const }
              : {}),
    },
  );

  const isPrincipal = currentUser.role === 'PRINCIPAL';
  const isDirector = currentUser.role === 'DIRECTOR';
  const isGradeTeacher = currentUser.role === 'GRADE_TEACHER';
  const isSubjectTeacher = currentUser.role === 'SUBJECT_TEACHER';
  const canWrite = currentUser.permissions.includes('journey:write');

  const filteredJourneys = journeys;

  // KPI Metrics
  const totalCount = journeys.length;
  const draftCount = journeys.filter(
    (j) => j.draftStatus === 'On Progress' || j.draftStatus === 'Not Started',
  ).length;
  const principalReviewCount = journeys.filter(
    (j) =>
      j.draftStatus === 'Done' &&
      (j.principalReviewStatus === 'On Progress' ||
        j.principalReviewStatus === 'Returned'),
  ).length;
  const directorApprovalCount = journeys.filter(
    (j) =>
      j.principalReviewStatus === 'Done' &&
      (j.directorApprovalStatus === 'On Progress' ||
        j.directorApprovalStatus === 'Not Started'),
  ).length;
  const approvedCount = journeys.filter(
    (j) => j.directorApprovalStatus === 'Done',
  ).length;

  // Open Review Dialog
  const handleOpenReview = (journey: LearningJourney) => {
    setReviewingJourney(journey);
    setReviewAction('Approve');
    setReviewComment('');
    setReviewError(undefined);
  };

  const handleSubmitReview = async () => {
    if (!reviewingJourney || isSubmittingReview) return;
    if (reviewAction === 'Return' && !reviewComment.trim()) {
      setReviewError('Feedback is required when returning a journey.');
      return;
    }
    setIsSubmittingReview(true);
    setReviewError(undefined);
    try {
      const command = {
        expectedVersion: reviewingJourney.version ?? 1,
        decision:
          reviewAction === 'Approve'
            ? ('APPROVE' as const)
            : ('RETURN' as const),
        ...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
      };
      if (isPrincipal) {
        await learningJourneyService.principalReviewJourney(
          organizationId,
          reviewingJourney.id,
          command,
        );
      } else {
        await learningJourneyService.directorReviewJourney(
          organizationId,
          reviewingJourney.id,
          command,
        );
      }
      setReviewingJourney(null);
      showToast(
        'success',
        reviewAction === 'Approve'
          ? 'Decision approved'
          : 'Returned for revision',
        reviewAction === 'Approve'
          ? isPrincipal
            ? 'The journey was forwarded for director approval.'
            : 'The learning journey received final approval.'
          : 'The learning journey was returned to draft with your feedback.',
      );
      retry();
    } catch (error) {
      const message =
        error instanceof ApiClientError &&
        error.code === 'LEARNING_JOURNEY_VERSION_CONFLICT'
          ? 'This journey changed while you were reviewing it. Close and reopen the latest version.'
          : error instanceof ApiClientError &&
              error.code === 'AUTHORIZATION_DENIED'
            ? 'Your current role is not authorized to make this decision.'
            : error instanceof Error
              ? error.message
              : 'The review decision could not be saved.';
      setReviewError(message);
      showToast('error', 'Review not saved', message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Delete journey (allowed only for drafts or admin)
  const handleDelete = (_id: string, title: string, isLocked: boolean) => {
    if (isLocked) {
      showToast(
        'error',
        'Cannot Delete',
        'Journeys submitted for review or approved cannot be deleted.',
      );
      return;
    }
    showToast(
      'info',
      'Delete unavailable',
      `Deletion of "${title}" is deferred until the draft deletion policy is finalized.`,
    );
  };

  return (
    <div
      id="learning-journey-tracker-view"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {status === 'loading' && (
        <div className="rounded-2xl border border-[#EFE7DC] bg-white p-4 text-sm text-stone-600">
          Loading learning journeys…
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button onClick={retry} className="font-bold underline">
            Retry
          </button>
        </div>
      )}
      {/* Header Bar */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Workflow & Review Tracker
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Academic Year {metadata.academicYears[0]?.name ?? '—'}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              Active User: {currentUser.name} ({currentUser.roleTitle})
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-heading text-stone-900 tracking-tight">
            Learning Journey Status Tracker
          </h1>
          <p className="text-xs md:text-sm text-stone-600 max-w-2xl leading-relaxed">
            Role-gated curriculum approval pipeline. Principal reviews submitted
            drafts; Director grants final approval. Submitted and approved
            journeys are locked against edits.
          </p>
        </div>

        {canWrite && (
          <button
            id="btn-create-journey-tracker"
            onClick={() => navigateToJourneyEditor()}
            className="px-5 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />+ Create Learning Journey
          </button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setStageFilter('All Stages')}
          className={`p-4 bg-white border rounded-2xl shadow-xs cursor-pointer transition-all ${
            stageFilter === 'All Stages'
              ? 'border-[#6E161E] ring-2 ring-[#6E161E]/10'
              : 'border-[#EFE7DC] hover:border-stone-300'
          }`}
        >
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            All Journeys
          </span>
          <div className="text-2xl font-black text-stone-900 mt-1">
            {totalCount}
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Total curriculum units
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Draft')}
          className={`p-4 bg-white border rounded-2xl shadow-xs cursor-pointer transition-all ${
            stageFilter === 'Draft'
              ? 'border-amber-500 ring-2 ring-amber-500/10'
              : 'border-[#EFE7DC] hover:border-stone-300'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            1. Draft Phase
          </span>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {draftCount}
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Authoring & editable
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Principal Review')}
          className={`p-4 bg-white border rounded-2xl shadow-xs cursor-pointer transition-all ${
            stageFilter === 'Principal Review'
              ? 'border-blue-500 ring-2 ring-blue-500/10'
              : 'border-[#EFE7DC] hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              2. Principal Review
            </span>
            {isPrincipal && (
              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                Your Role
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {principalReviewCount}
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Principal verification
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Director Approval')}
          className={`p-4 bg-white border rounded-2xl shadow-xs cursor-pointer transition-all ${
            stageFilter === 'Director Approval'
              ? 'border-purple-500 ring-2 ring-purple-500/10'
              : 'border-[#EFE7DC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
              3. Director Approval
            </span>
            {isDirector && (
              <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                Your Role
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-purple-900 mt-1">
            {directorApprovalCount}
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Final sign-off queue
          </p>
        </div>

        <div
          onClick={() => setStageFilter('Approved')}
          className={`p-4 bg-white border rounded-2xl shadow-xs cursor-pointer transition-all ${
            stageFilter === 'Approved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/10'
              : 'border-[#EFE7DC]'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            4. Approved & Live
          </span>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {approvedCount}
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Locked active curriculum
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
          <input
            id="tracker-search-input"
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by title, author, subject..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl focus:outline-hidden text-stone-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            id="tracker-unit-filter"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-800"
          >
            <option value="">All Units</option>
            {metadata.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <select
            id="tracker-grade-filter"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-800"
          >
            <option value="">All Grades</option>
            {metadata.grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>

          <select
            id="tracker-subject-filter"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-800"
          >
            <option value="">All Subjects</option>
            {metadata.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Tracker Table */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full text-left border-collapse"
            id="learning-journey-tracker-table"
          >
            <thead>
              <tr className="bg-[#FAF5EF] border-b border-[#EFE7DC] text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-4 px-6">Learning Journey & Scope</th>
                <th className="py-4 px-4">Author</th>
                <th className="py-4 px-4">1. Draft</th>
                <th className="py-4 px-4">2. Principal Review</th>
                <th className="py-4 px-4">3. Director Approval</th>
                <th className="py-4 px-4">Edit Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE7DC] text-xs text-stone-700">
              {filteredJourneys.map((journey) => {
                // Strict Role-Based Review Action Authorization
                const canPrincipalReview =
                  isPrincipal &&
                  journey.draftStatus === 'Done' &&
                  (journey.principalReviewStatus === 'On Progress' ||
                    journey.principalReviewStatus === 'Not Started');

                const canDirectorApprove =
                  isDirector &&
                  journey.principalReviewStatus === 'Done' &&
                  (journey.directorApprovalStatus === 'On Progress' ||
                    journey.directorApprovalStatus === 'Not Started');

                const isReviewableByCurrentUser =
                  canPrincipalReview || canDirectorApprove;

                // Locking rules:
                // If submitted for review or approved, it is locked against edits
                const isUnderReview =
                  journey.draftStatus === 'Done' &&
                  (journey.principalReviewStatus === 'On Progress' ||
                    journey.directorApprovalStatus === 'On Progress');
                const isApproved = journey.directorApprovalStatus === 'Done';
                const isOwned =
                  journey.createdBy === currentUser.id ||
                  journey.ownerMembershipIds?.includes(
                    currentUser.membershipId ?? '',
                  ) === true;
                const isReturned =
                  journey.principalReviewStatus === 'Returned' ||
                  journey.directorApprovalStatus === 'Returned';
                const isLocked =
                  !canWrite ||
                  !isOwned ||
                  ((isUnderReview || isApproved) && !isReturned);

                return (
                  <tr
                    key={journey.id}
                    id={`journey-row-${journey.id}`}
                    className="hover:bg-[#FAF5EF]/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div
                        onClick={() => setPreviewingJourney(journey)}
                        className="font-bold text-stone-900 text-sm hover:text-[#6E161E] cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{journey.title}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {journey.unit} · {journey.grade} · {journey.subject} ·{' '}
                        {journey.semester}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-medium text-stone-800">
                      {journey.authorName}
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={journey.draftStatus} size="sm" />
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <StatusBadge
                          status={journey.principalReviewStatus}
                          size="sm"
                        />
                        {journey.principalReviewStatus === 'Returned' && (
                          <div className="text-[10px] text-rose-700 font-semibold flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Revision Requested
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <StatusBadge
                          status={journey.directorApprovalStatus}
                          size="sm"
                        />
                        {journey.directorApprovalStatus === 'Returned' && (
                          <div className="text-[10px] text-rose-700 font-semibold flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Revision Requested
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Edit Lock Status */}
                    <td className="py-4 px-4">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                          <Lock className="w-3 h-3 text-stone-500" />
                          Locked {isApproved ? '(Approved)' : '(In Review)'}
                        </span>
                      ) : isReturned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                          Editable (Revision)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Edit3 className="w-3 h-3 text-emerald-600" />
                          Editable (Draft)
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Review Button strictly for authorized role */}
                        {isReviewableByCurrentUser && (
                          <button
                            id={`review-btn-${journey.id}`}
                            onClick={() => handleOpenReview(journey)}
                            className="px-3 py-1.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {isPrincipal
                              ? 'Principal Review'
                              : 'Director Approval'}
                          </button>
                        )}

                        {/* Inspect / View Full Curriculum */}
                        <button
                          id={`view-journey-btn-${journey.id}`}
                          onClick={() => setPreviewingJourney(journey)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                          title="View Journey Content"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button: Opens in read-only if locked */}
                        <button
                          id={`edit-journey-btn-${journey.id}`}
                          onClick={() => navigateToJourneyEditor(journey.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isLocked
                              ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                              : 'text-[#6E161E] hover:text-[#581117] hover:bg-[#FAF5EF]'
                          }`}
                          title={
                            isLocked ? 'View Journey (Locked)' : 'Edit Journey'
                          }
                        >
                          {isLocked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Edit3 className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete Button (Only for unlocked drafts) */}
                        {!isLocked && (
                          <button
                            id={`delete-journey-btn-${journey.id}`}
                            onClick={() =>
                              handleDelete(journey.id, journey.title, isLocked)
                            }
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Journey"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Footer */}
        <div className="p-4 bg-[#FAF5EF] border-t border-[#EFE7DC] flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <span>
            Showing {filteredJourneys.length} of {journeys.length} Learning
            Journeys
          </span>
          <span className="font-medium text-stone-600">
            Current simulated role:{' '}
            <strong className="text-[#6E161E]">{currentUser.roleTitle}</strong>{' '}
            (Switch role in top right menu to test approval boundaries)
          </span>
        </div>
      </div>

      {/* Comprehensive Split Review Studio Modal (Submitted Journey Preview on Left, Decision on Right) */}
      {reviewingJourney && (
        <div
          id="review-journey-modal-backdrop"
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setReviewingJourney(null)}
        >
          <div
            id="review-journey-modal"
            className="bg-white max-w-5xl w-full rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#FAF5EF] border-b border-[#EFE7DC] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6E161E] text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#6E161E] uppercase tracking-wider">
                    {isPrincipal
                      ? 'Principal Review Studio'
                      : 'Director Governance Sign-off'}
                  </span>
                  <h2 className="text-lg font-bold text-stone-900">
                    Review: "{reviewingJourney.title}"
                  </h2>
                </div>
              </div>

              <button
                id="btn-close-review-modal"
                onClick={() => setReviewingJourney(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Body: Left = Full Journey Content Preview, Right = Review & Feedback Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#EFE7DC] max-h-[75vh]">
              {/* Left Column: Full Journey Inspection Content (7 cols) */}
              <div className="lg:col-span-7 p-6 overflow-y-auto space-y-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-bold text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                      {reviewingJourney.unit} · {reviewingJourney.grade}
                    </span>
                    <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      {reviewingJourney.subject}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      {reviewingJourney.semester} ·{' '}
                      {reviewingJourney.academicYear}
                    </span>
                  </div>
                  <h3 className="text-xl font-black font-heading text-stone-900">
                    {reviewingJourney.title}
                  </h3>
                  {reviewingJourney.unitName && (
                    <p className="text-xs text-[#8F5900] font-bold mt-0.5">
                      {reviewingJourney.unitName}
                    </p>
                  )}
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    Authored by{' '}
                    <strong className="text-stone-700">
                      {reviewingJourney.authorName}
                    </strong>
                  </p>
                </div>

                {/* Projects Inspection */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#6E161E]" />
                    Curriculum Projects ({reviewingJourney.projects.length})
                  </span>

                  {reviewingJourney.projects.map((proj, idx) => (
                    <div
                      key={proj.id}
                      className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E161E]">
                            Project {idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-stone-900">
                            {proj.title}
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shrink-0">
                          {proj.startMonth} – {proj.endMonth}
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed bg-white p-3 rounded-xl border border-stone-200">
                        {proj.description}
                      </p>

                      {/* Learning Goals */}
                      {proj.learningGoals?.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-stone-800">
                            Targeted Learning Goals:
                          </span>
                          <ul className="space-y-1.5">
                            {proj.learningGoals.map((goal, gi) => (
                              <li
                                key={goal.id || gi}
                                className="text-xs text-stone-700 flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-stone-200"
                              >
                                <span className="font-bold text-[#6E161E] shrink-0">
                                  {gi + 1}.
                                </span>
                                <span className="leading-snug">
                                  {goal.description}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Cross Curricular Connections */}
                      {proj.crossCurricularConnections?.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-stone-800">
                            Interdisciplinary Connections:
                          </span>
                          <div className="space-y-1.5">
                            {proj.crossCurricularConnections.map((conn) => (
                              <div
                                key={conn.id}
                                className="text-xs p-2 rounded-lg bg-amber-50 border border-amber-200"
                              >
                                <strong className="text-amber-900">
                                  {conn.subject}:{' '}
                                </strong>
                                <span className="text-amber-800">
                                  {conn.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Workflow History Audit Log */}
                {reviewingJourney.workflowHistory?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Workflow History Trail
                    </span>
                    <div className="space-y-2">
                      {reviewingJourney.workflowHistory.map((wf) => (
                        <div
                          key={wf.id}
                          className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-800">
                              {wf.stage} —{' '}
                              <span
                                className={
                                  wf.action === 'Approved'
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }
                              >
                                {wf.action}
                              </span>
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(wf.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600">
                            By {wf.userName} ({wf.userRole})
                          </p>
                          {wf.comment && (
                            <p className="text-xs text-stone-800 bg-white p-2 rounded-lg border border-stone-100 italic">
                              "{wf.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Review Controls & Feedback Input (5 cols) */}
              <div className="lg:col-span-5 p-6 overflow-y-auto space-y-5 bg-[#FFFDF9]">
                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900">
                    <strong className="block font-bold">
                      Reviewer: {currentUser.name}
                    </strong>
                    <span>You are acting as {currentUser.roleTitle}.</span>
                  </div>
                </div>

                {/* Decision Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Review Decision *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="decision-approve-btn"
                      onClick={() => setReviewAction('Approve')}
                      className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        reviewAction === 'Approve'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/20'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {isPrincipal
                          ? 'Approve & Forward'
                          : 'Grant Final Sign-off'}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="decision-return-btn"
                      onClick={() => setReviewAction('Return')}
                      className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        reviewAction === 'Return'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-600/20'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Return for Revision</span>
                    </button>
                  </div>
                </div>

                {/* Quick Feedback Suggestions */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                    Quick Feedback Suggestions:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewComment((prev) =>
                          prev
                            ? `${prev} Commend strong cross-curricular interdisciplinary links.`
                            : 'Commend strong cross-curricular interdisciplinary links.',
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-[11px] rounded-lg transition-colors"
                    >
                      + Commend Connections
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewComment((prev) =>
                          prev
                            ? `${prev} Please add sensory and differentiated accommodations for diverse learners.`
                            : 'Please add sensory and differentiated accommodations for diverse learners.',
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-[11px] rounded-lg transition-colors"
                    >
                      + Request Accommodations
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewComment((prev) =>
                          prev
                            ? `${prev} Please adjust project timeline milestones to balance workload.`
                            : 'Please adjust project timeline milestones to balance workload.',
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-[11px] rounded-lg transition-colors"
                    >
                      + Adjust Timeline
                    </button>
                  </div>
                </div>

                {/* Comments Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center justify-between">
                    <span>
                      Feedback & Notes{' '}
                      {reviewAction === 'Return' && (
                        <span className="text-rose-600">*</span>
                      )}
                    </span>
                    <span className="text-[10px] text-stone-400 font-normal">
                      Visible to author
                    </span>
                  </label>
                  <textarea
                    id="review-comment-textarea"
                    rows={5}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={
                      reviewAction === 'Return'
                        ? 'Provide specific instructions for the author (e.g. adjust week 3 goal wording, include science connection)...'
                        : 'Add commendations or notes for the next stage...'
                    }
                    disabled={isSubmittingReview}
                    className="w-full p-3.5 text-xs bg-white border border-[#E8DFC8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20 text-stone-900 shadow-2xs disabled:opacity-60"
                  />
                  {reviewError && (
                    <p
                      className="text-xs font-semibold text-rose-700"
                      role="alert"
                    >
                      {reviewError}
                    </p>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewingJourney(null)}
                    disabled={isSubmittingReview}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="submit-review-modal-btn"
                    onClick={() => void handleSubmitReview()}
                    disabled={isSubmittingReview}
                    className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors text-white flex items-center gap-1.5 disabled:opacity-60 ${
                      reviewAction === 'Approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingReview
                      ? 'Saving Decision…'
                      : 'Submit Review Decision'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Inspection Modal (For viewing submitted curriculum) */}
      {previewingJourney && (
        <div
          id="preview-journey-modal-backdrop"
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPreviewingJourney(null)}
        >
          <div
            id="preview-journey-modal"
            className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                    {previewingJourney.unit} · {previewingJourney.grade} ·{' '}
                    {previewingJourney.subject}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    {previewingJourney.semester} ·{' '}
                    {previewingJourney.academicYear}
                  </span>
                </div>
                <h2 className="text-2xl font-black font-heading text-stone-900 mt-2">
                  {previewingJourney.title}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Author:{' '}
                  <strong className="text-stone-700">
                    {previewingJourney.authorName}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setPreviewingJourney(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Curriculum Projects Breakdown (
                {previewingJourney.projects.length})
              </span>

              {previewingJourney.projects.map((proj, idx) => (
                <div
                  key={proj.id}
                  className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900">
                      Project {idx + 1}: {proj.title}
                    </h3>
                    <span className="text-xs font-semibold text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                      {proj.startMonth} – {proj.endMonth}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed bg-white p-3 rounded-xl border border-stone-200">
                    {proj.description}
                  </p>

                  {proj.learningGoals?.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-stone-800">
                        Targeted Learning Goals:
                      </span>
                      <ul className="mt-1 space-y-1.5">
                        {proj.learningGoals.map((g, gi) => (
                          <li
                            key={g.id}
                            className="text-xs text-stone-700 flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-stone-200"
                          >
                            <span className="font-bold text-[#6E161E]">
                              {gi + 1}.
                            </span>
                            <span>{g.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {proj.crossCurricularConnections?.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-stone-800">
                        Cross-Curricular Connections:
                      </span>
                      <div className="mt-1 space-y-1.5">
                        {proj.crossCurricularConnections.map((c) => (
                          <div
                            key={c.id}
                            className="text-xs p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900"
                          >
                            <strong>{c.subject}: </strong>
                            <span>{c.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => setPreviewingJourney(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const jId = previewingJourney.id;
                  setPreviewingJourney(null);
                  navigateToJourneyEditor(jId);
                }}
                className="px-5 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Open in Journey Studio →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
