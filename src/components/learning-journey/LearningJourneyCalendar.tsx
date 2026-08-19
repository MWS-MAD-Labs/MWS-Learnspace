import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { LearningJourney, LearningJourneyProject } from '../../types';
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Clock,
  Edit3,
  Eye,
  Lock,
  Shield,
  GraduationCap,
  X,
} from 'lucide-react';

const SEMESTER_1_MONTHS = [
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const SEMESTER_2_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
];
const ALL_MONTHS = [...SEMESTER_1_MONTHS, ...SEMESTER_2_MONTHS];

const ALL_SCHOOL_GRADES = [
  'K1',
  'K2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
];

export const LearningJourneyCalendar: React.FC = () => {
  const { currentUser, navigateToJourneyEditor } = useApp();
  const [selectedSemester, setSelectedSemester] = useState<
    'Semester 1' | 'Semester 2' | 'Full Year'
  >('Semester 1');
  const [selectedUnit, setSelectedUnit] = useState('All Units');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProjectModal, setSelectedProjectModal] = useState<{
    journey: LearningJourney;
    project: LearningJourneyProject;
  } | null>(null);

  const journeys = storageService.getLearningJourneys();

  const isPrincipal = currentUser.role === 'PRINCIPAL';
  const isDirector = currentUser.role === 'DIRECTOR';
  const isGradeTeacher = currentUser.role === 'GRADE_TEACHER';
  const isSubjectTeacher = currentUser.role === 'SUBJECT_TEACHER';
  const isSpecialEdTeacher = currentUser.role === 'SPECIAL_ED_TEACHER';
  const isLeadership = isPrincipal || isDirector;

  // Determine allowed grades for the current user
  const allowedGrades = useMemo(() => {
    if (isLeadership) {
      return ALL_SCHOOL_GRADES;
    }
    // Teacher: assigned homeroom grades + grades where they teach their subjects
    const teacherGrades = new Set<string>();
    (currentUser.gradeIds || []).forEach((g) => teacherGrades.add(g));

    // Also include any grade in journeys matching their subjects
    journeys.forEach((j) => {
      if (
        currentUser.subjectIds?.includes(j.subject) &&
        currentUser.gradeIds?.includes(j.grade)
      ) {
        teacherGrades.add(j.grade);
      }
    });

    return Array.from(teacherGrades);
  }, [isLeadership, currentUser, journeys]);

  // Adjust selectedGrade if teacher switches or initially loads
  useEffect(() => {
    if (!isLeadership) {
      if (allowedGrades.length === 1) {
        setSelectedGrade(allowedGrades[0]);
      } else if (
        allowedGrades.length > 0 &&
        selectedGrade !== 'All Grades' &&
        !allowedGrades.includes(selectedGrade)
      ) {
        setSelectedGrade(allowedGrades[0]);
      }
    }
  }, [isLeadership, allowedGrades, selectedGrade]);

  const activeMonths = useMemo(() => {
    if (selectedSemester === 'Semester 1') return SEMESTER_1_MONTHS;
    if (selectedSemester === 'Semester 2') return SEMESTER_2_MONTHS;
    return ALL_MONTHS;
  }, [selectedSemester]);

  // Filter journeys based on user role permissions AND user filters
  const filteredJourneys = useMemo(() => {
    return journeys.filter((j) => {
      // 1. Role-Based Access Control:
      if (!isLeadership) {
        const isHomeroom =
          isGradeTeacher && currentUser.gradeIds?.includes(j.grade);
        const isSubjectSpecialist =
          currentUser.subjectIds?.includes(j.subject) &&
          currentUser.gradeIds?.includes(j.grade);
        const isAuthor =
          j.ownerIds?.includes(currentUser.id) ||
          j.createdBy === currentUser.id;
        const isSpecialEd =
          isSpecialEdTeacher && currentUser.gradeIds?.includes(j.grade);

        // Teacher can only view:
        // a) Their homeroom grade
        // b) Other grades if they are the subject teacher for that subject in that grade
        // c) Or journeys they created/own
        if (!isHomeroom && !isSubjectSpecialist && !isAuthor && !isSpecialEd) {
          return false;
        }
      }

      // 2. User Selected Filters:
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = j.title.toLowerCase().includes(q);
        const matchSubject = j.subject.toLowerCase().includes(q);
        const matchAuthor = j.authorName.toLowerCase().includes(q);
        const matchGrade = j.grade.toLowerCase().includes(q);
        const matchProjects = j.projects?.some(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.learningGoals?.some((g) =>
              g.description.toLowerCase().includes(q),
            ),
        );
        if (
          !matchTitle &&
          !matchSubject &&
          !matchAuthor &&
          !matchGrade &&
          !matchProjects
        ) {
          return false;
        }
      }

      if (selectedUnit !== 'All Units' && j.unit !== selectedUnit) return false;
      if (selectedGrade !== 'All Grades' && j.grade !== selectedGrade)
        return false;
      if (selectedSubject !== 'All Subjects' && j.subject !== selectedSubject)
        return false;
      if (selectedSemester !== 'Full Year' && j.semester !== selectedSemester)
        return false;

      return true;
    });
  }, [
    journeys,
    isLeadership,
    isGradeTeacher,
    isSpecialEdTeacher,
    currentUser,
    searchQuery,
    selectedUnit,
    selectedGrade,
    selectedSubject,
    selectedSemester,
  ]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedUnit('All Units');
    setSelectedGrade(
      isLeadership ? 'All Grades' : allowedGrades[0] || 'All Grades',
    );
    setSelectedSubject('All Subjects');
    setSelectedSemester('Semester 1');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedUnit !== 'All Units' ||
    (isLeadership && selectedGrade !== 'All Grades') ||
    (!isLeadership &&
      allowedGrades.length > 1 &&
      selectedGrade !== 'All Grades') ||
    selectedSubject !== 'All Subjects' ||
    selectedSemester !== 'Semester 1';

  // Helper function to find column index of month
  const getMonthIndex = (monthStr: string): number => {
    const cleanMonth = monthStr.split(' ')[0];
    return activeMonths.findIndex(
      (m) => m.toLowerCase() === cleanMonth.toLowerCase(),
    );
  };

  return (
    <div
      id="learning-journey-calendar-view"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header Bar */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              Curriculum Roadmap
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Academic Year 2026–2027
            </span>
            {isPrincipal && (
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Principal Full Grade Access
              </span>
            )}
            {!isLeadership && (
              <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {isGradeTeacher
                  ? `Homeroom: ${currentUser.gradeIds?.join(', ')}`
                  : `Subject Specialist (${currentUser.subjectIds?.join(', ')})`}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-heading text-stone-900 tracking-tight">
            Learning Journey Calendar
          </h1>
          <p className="text-xs md:text-sm text-stone-600 max-w-2xl leading-relaxed">
            {isLeadership
              ? 'Comprehensive curriculum roadmaps per grade. Switch between grade levels below to inspect project scopes and timelines.'
              : `Grade & Subject curriculum roadmap. You have access to your assigned homeroom (${currentUser.gradeIds?.join(', ')}) and subjects (${currentUser.subjectIds?.join(', ')}).`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-create-journey"
            onClick={() => navigateToJourneyEditor()}
            className="px-5 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />+ Create Learning Journey
          </button>
        </div>
      </div>

      {/* Grade Selector Strip (Especially for Principal to choose calendar view per grade, or teacher for assigned grades) */}
      <div className="bg-white border border-[#EFE7DC] rounded-2xl p-3 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-[#6E161E]" />
            Grade View:
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* If Principal/Director or multi-grade teacher, allow "All Grades" */}
          {(isLeadership || allowedGrades.length > 1) && (
            <button
              id="grade-btn-all"
              onClick={() => setSelectedGrade('All Grades')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedGrade === 'All Grades'
                  ? 'bg-[#6E161E] text-white shadow-xs'
                  : 'bg-[#FAF5EF] text-stone-700 hover:bg-[#F2EAE0]'
              }`}
            >
              {isLeadership ? 'All School Grades' : 'All My Grades'}
            </button>
          )}

          {/* Render allowed grades */}
          {(isLeadership ? ALL_SCHOOL_GRADES : allowedGrades).map((grade) => {
            const isHomeroomGrade =
              isGradeTeacher && currentUser.gradeIds?.includes(grade);
            const isSelected = selectedGrade === grade;

            return (
              <button
                key={grade}
                id={`grade-btn-${grade.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#6E161E] text-white shadow-xs'
                    : 'bg-[#FAF5EF] text-stone-700 hover:bg-[#F2EAE0]'
                }`}
              >
                <span>{grade}</span>
                {isHomeroomGrade && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-[#6E161E]/10 text-[#6E161E]'}`}
                  >
                    Homeroom
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DC] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="flex items-center relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
          <input
            id="calendar-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search journeys, units, goals, educators..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#E8DFC8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20 text-stone-800 placeholder-stone-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-0.5 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Semester Selector */}
          <div className="flex items-center bg-white border border-[#E8DFC8] rounded-xl p-0.5 shadow-2xs">
            {(['Semester 1', 'Semester 2', 'Full Year'] as const).map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedSemester === sem
                    ? 'bg-[#6E161E] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {sem}
              </button>
            ))}
          </div>

          <select
            id="calendar-filter-unit"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#E8DFC8] rounded-xl focus:outline-hidden text-stone-800 shadow-2xs"
          >
            <option value="All Units">All Units</option>
            <option value="Early Years">Early Years</option>
            <option value="Elementary">Elementary</option>
            <option value="Junior High">Junior High</option>
          </select>

          <select
            id="calendar-filter-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#E8DFC8] rounded-xl focus:outline-hidden text-stone-800 shadow-2xs"
          >
            <option value="All Subjects">All Subjects</option>
            <option value="Physical Education">Physical Education</option>
            <option value="Science">Science</option>
            <option value="Math">Math</option>
            <option value="English">English</option>
          </select>

          {hasActiveFilters && (
            <button
              id="btn-clear-calendar-filters"
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-700 hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Calendar Timeline Grid */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Months Header */}
            <div className="grid grid-cols-12 border-b border-[#EFE7DC] bg-[#FAF5EF]">
              <div className="col-span-3 p-4 border-r border-[#EFE7DC] flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Journey & Subject
                </span>
                <span className="text-[10px] font-bold text-stone-400 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                  {filteredJourneys.length} Active
                </span>
              </div>
              <div
                className="col-span-9 grid"
                style={{
                  gridTemplateColumns: `repeat(${activeMonths.length}, minmax(0, 1fr))`,
                }}
              >
                {activeMonths.map((m, idx) => (
                  <div
                    key={m}
                    className={`p-3 text-center text-xs font-bold text-stone-800 border-r border-[#EFE7DC] last:border-r-0 ${
                      idx % 2 === 0 ? 'bg-[#FAF5EF]' : 'bg-[#F5EFE6]/60'
                    }`}
                  >
                    <span className="block text-stone-900 font-bold">{m}</span>
                    <span className="text-[10px] text-stone-500 font-normal">
                      2026–2027
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Rows */}
            {filteredJourneys.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-stone-800">
                  No Learning Journeys Visible
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {!isLeadership
                    ? `No curriculum entries match your assigned teaching permissions (${currentUser.gradeIds?.join(', ')} / ${currentUser.subjectIds?.join(', ')}).`
                    : 'Try adjusting your search query, grade selection, or semester filters.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-xs font-bold text-[#6E161E] bg-[#6E161E]/10 hover:bg-[#6E161E]/20 rounded-xl transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              filteredJourneys.map((journey) => {
                const isUnderReview =
                  journey.draftStatus === 'Done' &&
                  (journey.principalReviewStatus === 'On Progress' ||
                    journey.directorApprovalStatus === 'On Progress');
                const isApproved = journey.directorApprovalStatus === 'Done';
                const isLocked = isUnderReview || isApproved;

                return (
                  <div
                    key={journey.id}
                    id={`calendar-row-${journey.id}`}
                    className="grid grid-cols-12 border-b border-[#EFE7DC] hover:bg-[#FFFDF9] transition-colors"
                  >
                    {/* Left Column: Journey Info */}
                    <div className="col-span-3 p-4 border-r border-[#EFE7DC] space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6E161E]/10 text-[#6E161E]">
                            {journey.grade}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            {journey.subject}
                          </span>
                          {isLocked && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              {isApproved ? 'Approved' : 'In Review'}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-stone-900 leading-snug line-clamp-2">
                          {journey.title}
                        </h4>
                        {journey.unitName && (
                          <p className="text-[11px] text-[#8F5900] font-medium mt-0.5">
                            {journey.unitName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                        <span className="text-stone-500 truncate max-w-[120px]">
                          {journey.authorName}
                        </span>
                        <button
                          onClick={() => navigateToJourneyEditor(journey.id)}
                          className="text-[#6E161E] hover:underline font-bold flex items-center gap-1 shrink-0"
                        >
                          {isLocked ? (
                            <>
                              <Eye className="w-3 h-3" /> View
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-3 h-3" /> Edit
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Month Timeline Bars */}
                    <div
                      className="col-span-9 grid relative min-h-[100px] p-2"
                      style={{
                        gridTemplateColumns: `repeat(${activeMonths.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {/* Vertical month guide lines */}
                      {activeMonths.map((_, idx) => (
                        <div
                          key={idx}
                          className="border-r border-stone-100 h-full pointer-events-none last:border-r-0"
                        />
                      ))}

                      {/* Timeline Project Bars */}
                      <div className="absolute inset-0 p-3 flex flex-col justify-center gap-2">
                        {journey.projects?.map((proj) => {
                          const startIdx = getMonthIndex(proj.startMonth);
                          const endIdx = getMonthIndex(proj.endMonth);

                          const effectiveStart = startIdx === -1 ? 0 : startIdx;
                          const effectiveEnd =
                            endIdx === -1 ? activeMonths.length - 1 : endIdx;

                          const isVisible =
                            startIdx !== -1 ||
                            endIdx !== -1 ||
                            (selectedSemester === 'Semester 1' &&
                              proj.startMonth.includes('August'));

                          if (!isVisible && startIdx === -1 && endIdx === -1)
                            return null;

                          const colSpan = Math.max(
                            1,
                            effectiveEnd - effectiveStart + 1,
                          );
                          const leftPercent =
                            (effectiveStart / activeMonths.length) * 100;
                          const widthPercent =
                            (colSpan / activeMonths.length) * 100;

                          return (
                            <div
                              key={proj.id}
                              id={`timeline-project-bar-${proj.id}`}
                              onClick={() =>
                                setSelectedProjectModal({
                                  journey,
                                  project: proj,
                                })
                              }
                              className="cursor-pointer group relative rounded-xl p-2.5 text-stone-900 border shadow-xs transition-all hover:scale-[1.01] hover:shadow-md"
                              style={{
                                marginLeft: `${leftPercent}%`,
                                width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                                backgroundColor: `${proj.color || '#F5B842'}20`,
                                borderColor: `${proj.color || '#F5B842'}80`,
                                borderLeftWidth: '5px',
                                borderLeftColor: proj.color || '#6E161E',
                              }}
                            >
                              <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <div className="truncate">
                                  <span className="font-bold text-xs text-stone-900 block truncate group-hover:text-[#6E161E] transition-colors">
                                    {proj.title}
                                  </span>
                                  <span className="text-[10px] text-stone-600 block truncate">
                                    {proj.startMonth} – {proj.endMonth}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {proj.learningGoals?.length > 0 && (
                                    <span className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-md border border-stone-200 text-stone-700">
                                      {proj.learningGoals.length} Goals
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Project Details Modal */}
      {selectedProjectModal && (
        <div
          id="calendar-project-modal-backdrop"
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProjectModal(null)}
        >
          <div
            id="calendar-project-modal"
            className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-bold text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                  {selectedProjectModal.journey.grade} ·{' '}
                  {selectedProjectModal.journey.subject}
                </span>
                <h2 className="text-xl font-bold text-stone-900 mt-2">
                  {selectedProjectModal.project.title}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  Timeline: {selectedProjectModal.project.startMonth} –{' '}
                  {selectedProjectModal.project.endMonth}
                </p>
              </div>
              <button
                id="btn-close-cal-modal"
                onClick={() => setSelectedProjectModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  Curriculum Project Scope
                </span>
                <p className="mt-1 leading-relaxed text-stone-600 bg-[#FAF5EF] p-3.5 rounded-xl border border-[#E8DFC8]">
                  {selectedProjectModal.project.description}
                </p>
              </div>

              {selectedProjectModal.project.learningGoals?.length > 0 && (
                <div>
                  <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                    Targeted Learning Goals (
                    {selectedProjectModal.project.learningGoals.length})
                  </span>
                  <ul className="mt-2 space-y-2">
                    {selectedProjectModal.project.learningGoals.map(
                      (goal, idx) => (
                        <li
                          key={goal.id || idx}
                          className="flex items-start gap-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200"
                        >
                          <span className="font-bold text-[#6E161E] shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="leading-snug">
                            {goal.description}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {selectedProjectModal.project.crossCurricularConnections?.length >
                0 && (
                <div>
                  <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                    Cross-Curricular Connections
                  </span>
                  <div className="mt-2 space-y-2">
                    {selectedProjectModal.project.crossCurricularConnections.map(
                      (conn) => (
                        <div
                          key={conn.id}
                          className="p-3 rounded-xl bg-amber-50/70 border border-amber-200"
                        >
                          <span className="font-bold text-amber-900">
                            {conn.subject}:{' '}
                          </span>
                          <span className="text-amber-800 leading-snug">
                            {conn.description}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedProjectModal(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                id="modal-cal-edit-journey-btn"
                onClick={() => {
                  const jId = selectedProjectModal.journey.id;
                  setSelectedProjectModal(null);
                  navigateToJourneyEditor(jId);
                }}
                className="px-5 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                Inspect in Journey Studio →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
