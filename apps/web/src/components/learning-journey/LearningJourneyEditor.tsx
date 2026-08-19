import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import {
  LearningJourney,
  LearningJourneyProject,
  CrossCurricularConnection,
  LearningGoal,
} from '../../types';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Layers,
  Lock,
  RotateCcw,
  X,
} from 'lucide-react';

const SUBJECT_OPTIONS = [
  'Physical Education',
  'Science',
  'Math',
  'English',
  'Art',
  'Music',
  'Drama',
  'Social Studies',
  'Bahasa Indonesia',
];
const UNIT_OPTIONS = ['Early Years', 'Elementary', 'Junior High'];
const GRADE_OPTIONS = [
  'K1',
  'K2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
];
const MONTH_OPTIONS = [
  'August 2026',
  'September 2026',
  'October 2026',
  'November 2026',
  'December 2026',
  'January 2027',
  'February 2027',
  'March 2027',
  'April 2027',
  'May 2027',
  'June 2027',
];

export const LearningJourneyEditor: React.FC = () => {
  const {
    selectedJourneyId,
    currentUser,
    setActiveTab,
    showToast,
    refreshData,
  } = useApp();

  const [journey, setJourney] = useState<LearningJourney>(() => {
    if (selectedJourneyId) {
      const existing = storageService.getLearningJourney(selectedJourneyId);
      if (existing) return existing;
    }

    // Default new journey template
    return {
      id: `lj-${Date.now()}`,
      title: 'New Interdisciplinary Unit',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      unit: 'Elementary',
      grade: currentUser.gradeIds?.[0] || 'Grade 1',
      subject: currentUser.subjectIds?.[0] || 'Physical Education',
      unitName: 'Unit 1: Exploration & Inquiry',
      ownerIds: [currentUser.id],
      authorName: currentUser.name,
      draftStatus: 'On Progress',
      principalReviewStatus: 'Not Started',
      directorApprovalStatus: 'Not Started',
      workflowHistory: [],
      projects: [
        {
          id: `p-${Date.now()}-1`,
          title: 'Unit Kickoff & Inquiry Exploration',
          description:
            'Students investigate foundational questions, build initial understanding, and collaborate on hands-on inquiry projects.',
          startMonth: 'August 2026',
          endMonth: 'September 2026',
          startDate: '2026-08-03',
          endDate: '2026-09-18',
          color: '#F5B842',
          order: 1,
          crossCurricularConnections: [
            {
              id: `c-${Date.now()}-1`,
              subject: 'Science',
              description:
                'Investigating observational patterns and scientific methods.',
            },
          ],
          learningGoals: [
            {
              id: `g-${Date.now()}-1`,
              description:
                'Demonstrate essential understanding and apply inquiry strategies.',
              order: 1,
            },
          ],
        },
      ],
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedAt: new Date().toISOString(),
    };
  });

  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({
    [journey.projects[0]?.id || 'p1']: true,
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Locking Logic:
  // If submitted for review or approved, it is locked against edits
  const isUnderReview =
    journey.draftStatus === 'Done' &&
    (journey.principalReviewStatus === 'On Progress' ||
      journey.directorApprovalStatus === 'On Progress');
  const isApproved = journey.directorApprovalStatus === 'Done';
  const isReturned =
    journey.principalReviewStatus === 'Returned' ||
    journey.directorApprovalStatus === 'Returned';
  const isLocked = (isUnderReview || isApproved) && !isReturned;

  const toggleProjectExpand = (pId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [pId]: !prev[pId],
    }));
  };

  // Add Project
  const handleAddProject = () => {
    if (isLocked) return;
    const newProj: LearningJourneyProject = {
      id: `p-${Date.now()}`,
      title: `Unit Project ${journey.projects.length + 1}`,
      description: 'Describe project scope and inquiry questions...',
      startMonth: 'September 2026',
      endMonth: 'October 2026',
      color: '#81B29A',
      order: journey.projects.length + 1,
      crossCurricularConnections: [],
      learningGoals: [
        {
          id: `g-${Date.now()}`,
          description: 'Define primary learning outcome...',
          order: 1,
        },
      ],
    };

    setJourney((prev) => ({
      ...prev,
      projects: [...prev.projects, newProj],
    }));
    setExpandedProjects((prev) => ({ ...prev, [newProj.id]: true }));
    showToast(
      'info',
      'Project Added',
      'New project module added to learning journey.',
    );
  };

  // Delete Project
  const handleDeleteProject = (pId: string) => {
    if (isLocked) return;
    if (journey.projects.length <= 1) {
      showToast(
        'warning',
        'Minimum 1 Project Required',
        'A learning journey must contain at least one project.',
      );
      return;
    }
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== pId),
    }));
  };

  // Update Project Field
  const handleUpdateProjectField = (
    pId: string,
    field: keyof LearningJourneyProject,
    val: any,
  ) => {
    if (isLocked) return;
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === pId ? { ...p, [field]: val } : p,
      ),
    }));
  };

  // Add Goal to Project
  const handleAddGoal = (pId: string) => {
    if (isLocked) return;
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id === pId) {
          const newGoal: LearningGoal = {
            id: `g-${Date.now()}`,
            description: '',
            order: (p.learningGoals?.length || 0) + 1,
          };
          return { ...p, learningGoals: [...(p.learningGoals || []), newGoal] };
        }
        return p;
      }),
    }));
  };

  // Update Goal
  const handleUpdateGoal = (pId: string, gId: string, description: string) => {
    if (isLocked) return;
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id === pId) {
          return {
            ...p,
            learningGoals: p.learningGoals.map((g) =>
              g.id === gId ? { ...g, description } : g,
            ),
          };
        }
        return p;
      }),
    }));
  };

  // Remove Goal
  const handleRemoveGoal = (pId: string, gId: string) => {
    if (isLocked) return;
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id === pId) {
          return {
            ...p,
            learningGoals: p.learningGoals.filter((g) => g.id !== gId),
          };
        }
        return p;
      }),
    }));
  };

  // Add Connection
  const handleAddConnection = (pId: string) => {
    if (isLocked) return;
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id === pId) {
          const newConn: CrossCurricularConnection = {
            id: `c-${Date.now()}`,
            subject: 'Science',
            description: '',
          };
          return {
            ...p,
            crossCurricularConnections: [
              ...(p.crossCurricularConnections || []),
              newConn,
            ],
          };
        }
        return p;
      }),
    }));
  };

  // Update Connection
  const handleUpdateConnection = (
    pId: string,
    cId: string,
    field: 'subject' | 'description',
    val: string,
  ) => {
    if (isLocked) return;
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id === pId) {
          return {
            ...p,
            crossCurricularConnections: p.crossCurricularConnections.map((c) =>
              c.id === cId ? { ...c, [field]: val } : c,
            ),
          };
        }
        return p;
      }),
    }));
  };

  // Remove Connection
  const handleRemoveConnection = (pId: string, cId: string) => {
    if (isLocked) return;
    setJourney((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id === pId) {
          return {
            ...p,
            crossCurricularConnections: p.crossCurricularConnections.filter(
              (c) => c.id !== cId,
            ),
          };
        }
        return p;
      }),
    }));
  };

  // Save Draft
  const handleSaveDraft = () => {
    if (isLocked) {
      showToast(
        'error',
        'Action Locked',
        'This journey is locked and cannot be saved.',
      );
      return;
    }
    storageService.saveLearningJourney({
      ...journey,
      draftStatus: 'On Progress',
      updatedBy: currentUser.id,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      'success',
      'Draft Saved',
      'Your learning journey draft has been persisted.',
    );
    refreshData();
  };

  // Submit for Review
  const handleSubmitForReview = () => {
    if (isLocked) {
      showToast(
        'error',
        'Action Locked',
        'This journey is already submitted or approved.',
      );
      return;
    }
    const saved = storageService.saveLearningJourney({
      ...journey,
      draftStatus: 'Done',
      principalReviewStatus: 'On Progress',
      updatedBy: currentUser.id,
      updatedAt: new Date().toISOString(),
    });

    storageService.updateWorkflowStage(
      saved.id,
      'Draft',
      'Submitted',
      'Curriculum ready for Principal review.',
      currentUser,
    );

    showToast(
      'success',
      'Submitted for Review',
      'Learning journey successfully forwarded to Principal review queue.',
    );
    refreshData();
    setActiveTab('LEARNING_JOURNEY_TRACKER');
  };

  const returnedHistory = journey.workflowHistory?.find(
    (w) => w.action === 'Returned',
  );

  return (
    <div
      id="learning-journey-editor-view"
      className="space-y-8 max-w-5xl mx-auto pb-28"
    >
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('LEARNING_JOURNEY_TRACKER')}
            className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-[#E8DFC8] rounded-xl hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                Curriculum Authoring Studio
              </span>
              {isLocked ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-stone-600" />
                  Locked (Read-Only Mode)
                </span>
              ) : isReturned ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 text-amber-700" />
                  Revision In Progress
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 flex items-center gap-1">
                  Draft Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {journey.title || 'Untitled Learning Journey'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2 bg-white hover:bg-stone-50 border border-[#E8DFC8] text-stone-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          {!isLocked && (
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-[#FAF5EF] hover:bg-[#F2EAE0] border border-[#E8DFC8] text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
          )}
        </div>
      </div>

      {/* Lock Notification Banner if Under Review or Approved */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300 shadow-xs flex items-start gap-3">
          <Lock className="w-5 h-5 text-stone-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              {isApproved
                ? 'Approved Curriculum — Locked Against Editing'
                : 'Submitted for Review — Locked Against Editing'}
            </h3>
            <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">
              {isApproved
                ? 'This learning journey has received final approval from the Director of Academics. It is active in the school roadmap and cannot be edited.'
                : 'This learning journey has been submitted and is currently in the review pipeline (Principal or Director). Editing is disabled until returned by a reviewer.'}
            </p>
          </div>
        </div>
      )}

      {/* Revision Notice Banner if Returned */}
      {returnedHistory && isReturned && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Revision Requested by {returnedHistory.userName} (
              {returnedHistory.userRole})
            </h3>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              "{returnedHistory.comment}"
            </p>
            <p className="text-[11px] text-rose-600">
              Please make the required changes below and click "Resubmit for
              Review" at the bottom of the page.
            </p>
          </div>
        </div>
      )}

      {/* General Information Card */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <BookOpen className="w-5 h-5 text-[#6E161E]" />
          <h2 className="text-base font-bold text-stone-900">
            General Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Academic Year
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={journey.academicYear}
              onChange={(e) =>
                setJourney({ ...journey, academicYear: e.target.value })
              }
              className={`w-full px-3.5 py-2 text-xs border rounded-xl font-semibold ${
                isLocked
                  ? 'bg-stone-100 border-stone-200 text-stone-600 cursor-not-allowed'
                  : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Semester
            </label>
            <select
              disabled={isLocked}
              value={journey.semester}
              onChange={(e) =>
                setJourney({ ...journey, semester: e.target.value as any })
              }
              className={`w-full px-3.5 py-2 text-xs border rounded-xl font-semibold ${
                isLocked
                  ? 'bg-stone-100 border-stone-200 text-stone-600 cursor-not-allowed'
                  : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
              }`}
            >
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Unit
            </label>
            <select
              disabled={isLocked}
              value={journey.unit}
              onChange={(e) => setJourney({ ...journey, unit: e.target.value })}
              className={`w-full px-3.5 py-2 text-xs border rounded-xl font-semibold ${
                isLocked
                  ? 'bg-stone-100 border-stone-200 text-stone-600 cursor-not-allowed'
                  : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
              }`}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Grade
            </label>
            <select
              disabled={isLocked}
              value={journey.grade}
              onChange={(e) =>
                setJourney({ ...journey, grade: e.target.value })
              }
              className={`w-full px-3.5 py-2 text-xs border rounded-xl font-semibold ${
                isLocked
                  ? 'bg-stone-100 border-stone-200 text-stone-600 cursor-not-allowed'
                  : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
              }`}
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Subject
            </label>
            <select
              disabled={isLocked}
              value={journey.subject}
              onChange={(e) =>
                setJourney({ ...journey, subject: e.target.value })
              }
              className={`w-full px-3.5 py-2 text-xs border rounded-xl font-semibold ${
                isLocked
                  ? 'bg-stone-100 border-stone-200 text-stone-600 cursor-not-allowed'
                  : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
              }`}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Author
            </label>
            <input
              type="text"
              disabled
              value={journey.authorName}
              className="w-full px-3.5 py-2 text-xs bg-stone-100 border border-stone-200 rounded-xl text-stone-600 font-semibold cursor-not-allowed"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Learning Journey Title
          </label>
          <input
            type="text"
            disabled={isLocked}
            value={journey.title}
            onChange={(e) => setJourney({ ...journey, title: e.target.value })}
            placeholder="e.g. Moving My Body & Spatial Exploration"
            className={`w-full px-3.5 py-2.5 text-sm font-bold border rounded-xl ${
              isLocked
                ? 'bg-stone-100 border-stone-200 text-stone-600 cursor-not-allowed'
                : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900 focus:ring-2 focus:ring-[#6E161E]/20'
            }`}
          />
        </div>
      </div>

      {/* Unit Projects Container */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#6E161E]" />
            <h2 className="text-base font-bold text-stone-900">
              Unit Projects ({journey.projects.length})
            </h2>
          </div>

          {!isLocked && (
            <button
              type="button"
              id="btn-add-unit-project"
              onClick={handleAddProject}
              className="px-4 py-2 bg-[#F5B842] hover:bg-[#EEAA2B] text-stone-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />+ Add Project
            </button>
          )}
        </div>

        {/* Project Cards List */}
        {journey.projects.map((project, pIndex) => {
          const isExpanded = expandedProjects[project.id] !== false;

          return (
            <div
              key={project.id}
              id={`project-card-${project.id}`}
              className="bg-white border border-[#EFE7DC] rounded-3xl shadow-xs overflow-hidden transition-all"
            >
              {/* Project Header */}
              <div
                onClick={() => toggleProjectExpand(project.id)}
                className="p-5 bg-[#FAF5EF] border-b border-[#EFE7DC] flex items-center justify-between cursor-pointer hover:bg-[#F4ECE2] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[#6E161E] text-white flex items-center justify-center font-bold text-xs">
                    {pIndex + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      {project.title || `Project ${pIndex + 1}`}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      {project.startMonth} – {project.endMonth} ·{' '}
                      {project.learningGoals.length} Learning Goals
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!isLocked && journey.projects.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100/50 rounded-lg transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-stone-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-500" />
                  )}
                </div>
              </div>

              {/* Project Body */}
              {isExpanded && (
                <div className="p-6 space-y-6">
                  {/* Title and Timeframe */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Project Title
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={project.title}
                        onChange={(e) =>
                          handleUpdateProjectField(
                            project.id,
                            'title',
                            e.target.value,
                          )
                        }
                        placeholder="e.g. Moving My Body"
                        className={`w-full px-3.5 py-2 text-xs border rounded-xl font-bold ${
                          isLocked
                            ? 'bg-stone-100 border-stone-200 text-stone-600'
                            : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Start Month
                      </label>
                      <select
                        disabled={isLocked}
                        value={project.startMonth}
                        onChange={(e) =>
                          handleUpdateProjectField(
                            project.id,
                            'startMonth',
                            e.target.value,
                          )
                        }
                        className={`w-full px-3.5 py-2 text-xs border rounded-xl font-semibold ${
                          isLocked
                            ? 'bg-stone-100 border-stone-200 text-stone-600'
                            : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
                        }`}
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        End Month
                      </label>
                      <select
                        disabled={isLocked}
                        value={project.endMonth}
                        onChange={(e) =>
                          handleUpdateProjectField(
                            project.id,
                            'endMonth',
                            e.target.value,
                          )
                        }
                        className={`w-full px-3.5 py-2 text-xs border rounded-xl font-semibold ${
                          isLocked
                            ? 'bg-stone-100 border-stone-200 text-stone-600'
                            : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
                        }`}
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Project Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Project Description & Inquiry
                    </label>
                    <textarea
                      rows={3}
                      disabled={isLocked}
                      value={project.description}
                      onChange={(e) =>
                        handleUpdateProjectField(
                          project.id,
                          'description',
                          e.target.value,
                        )
                      }
                      placeholder="Describe the unit themes, essential questions, and classroom inquiries..."
                      className={`w-full p-3 text-xs border rounded-xl leading-relaxed ${
                        isLocked
                          ? 'bg-stone-100 border-stone-200 text-stone-600'
                          : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-900'
                      }`}
                    />
                  </div>

                  {/* Cross Curricular Connections */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Cross-Curricular Connections
                      </label>
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleAddConnection(project.id)}
                          className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Add Connection
                        </button>
                      )}
                    </div>

                    {project.crossCurricularConnections?.length === 0 ? (
                      <div className="p-3 bg-[#FAF5EF] rounded-xl text-center text-xs text-stone-500 border border-dashed border-[#E8DFC8]">
                        No cross-curricular connections yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {project.crossCurricularConnections.map((conn) => (
                          <div
                            key={conn.id}
                            className="flex flex-col sm:flex-row items-start gap-2 bg-[#FAF5EF] p-2.5 rounded-xl border border-[#E8DFC8]"
                          >
                            <select
                              disabled={isLocked}
                              value={conn.subject}
                              onChange={(e) =>
                                handleUpdateConnection(
                                  project.id,
                                  conn.id,
                                  'subject',
                                  e.target.value,
                                )
                              }
                              className="w-full sm:w-40 px-3 py-1.5 text-xs bg-white border border-[#E8DFC8] rounded-lg font-bold text-stone-800"
                            >
                              {SUBJECT_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              disabled={isLocked}
                              value={conn.description}
                              onChange={(e) =>
                                handleUpdateConnection(
                                  project.id,
                                  conn.id,
                                  'description',
                                  e.target.value,
                                )
                              }
                              placeholder="Describe connection (e.g. Exploring anatomy and heart rates during exercise)..."
                              className="flex-1 w-full px-3 py-1.5 text-xs bg-white border border-[#E8DFC8] rounded-lg text-stone-900"
                            />
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveConnection(project.id, conn.id)
                                }
                                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Learning Goals */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Learning Goals & Outcomes
                      </label>
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleAddGoal(project.id)}
                          className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Add Goal
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {project.learningGoals?.map((goal, gIndex) => (
                        <div
                          key={goal.id || gIndex}
                          className="flex items-center gap-2"
                        >
                          <span className="w-6 h-6 rounded-lg bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {gIndex + 1}
                          </span>
                          <input
                            type="text"
                            disabled={isLocked}
                            value={goal.description}
                            onChange={(e) =>
                              handleUpdateGoal(
                                project.id,
                                goal.id,
                                e.target.value,
                              )
                            }
                            placeholder="e.g. Students will be able to perform balanced landings..."
                            className="flex-1 px-3 py-2 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900"
                          />
                          {!isLocked && project.learningGoals.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveGoal(project.id, goal.id)
                              }
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div
        id="editor-sticky-action-bar"
        className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#EFE7DC] px-6 py-4 shadow-lg flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => setActiveTab('LEARNING_JOURNEY_TRACKER')}
          className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
        >
          ← Return to Status Tracker
        </button>

        <div className="flex items-center gap-3">
          {isLocked ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">
                Locked for editing
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('LEARNING_JOURNEY_TRACKER')}
                className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl transition-colors"
              >
                Close View
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                id="editor-save-draft-btn"
                onClick={handleSaveDraft}
                className="px-5 py-2.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] shadow-2xs transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>

              <button
                type="button"
                id="editor-submit-review-btn"
                onClick={handleSubmitForReview}
                className="px-6 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isReturned
                  ? 'Resubmit for Principal Review'
                  : 'Submit for Principal Review'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-bold text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                  {journey.unit} · {journey.grade} · {journey.subject}
                </span>
                <h2 className="text-xl font-bold text-stone-900 mt-2">
                  {journey.title}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Academic Year: {journey.academicYear} · {journey.semester} ·
                  Author: {journey.authorName}
                </p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {journey.projects.map((proj, idx) => (
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
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {proj.description}
                  </p>

                  {proj.learningGoals.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-stone-900">
                        Learning Goals:
                      </span>
                      <ul className="mt-1 space-y-1">
                        {proj.learningGoals.map((g, gi) => (
                          <li
                            key={g.id}
                            className="text-xs text-stone-600 flex items-start gap-1.5"
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
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2 bg-[#6E161E] text-white text-xs font-bold rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
