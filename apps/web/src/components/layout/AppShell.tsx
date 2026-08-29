import React, { useEffect, useState } from 'react';
import type {
  AggregateNotification,
  AggregateSearchItem,
} from '@learnspace/contracts';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  GraduationCap,
  BarChart3,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Calendar,
  ListOrdered,
  PlusCircle,
  Brain,
  FileSignature,
  ClipboardList,
  LogOut,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSearch, useNotifications } from '../../hooks/useAggregates';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    currentUser,
    organizationId,
    activeTab,
    setActiveTab,
    specialEdSubTab,
    setSpecialEdSubTab,
    searchQuery,
    setSearchQuery,
    navigateToJourneyEditor,
    navigateToIEP,
    navigateToWeeklyReport,
    navigateToObservation,
    navigateToAttendanceStudent,
  } = useApp();

  const { logout, session } = useAuth();
  const canAdminOrganization =
    session?.memberships[0]?.permissions.includes('organization:admin') ??
    false;
  const [learningJourneyMenuOpen, setLearningJourneyMenuOpen] = useState(true);
  const [specialEdMenuOpen, setSpecialEdMenuOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const search = useGlobalSearch(organizationId, searchQuery);
  const notifications = useNotifications(organizationId);

  useEffect(() => {
    setActiveSearchIndex(search.data.length ? 0 : -1);
  }, [search.data]);

  const canOpenAttendanceRoster =
    currentUser.role === 'DIRECTOR' ||
    currentUser.role === 'PRINCIPAL' ||
    (currentUser.role === 'GRADE_TEACHER' &&
      Boolean(currentUser.unitIds?.length || currentUser.gradeIds?.length));

  const openSearchResult = (item: AggregateSearchItem) => {
    setSearchQuery('');
    if (item.kind === 'LEARNING_JOURNEY') {
      navigateToJourneyEditor(item.id);
    } else if (item.kind === 'IEP' || item.kind === 'IEP_GOAL') {
      if (item.studentId)
        navigateToIEP(
          item.studentId,
          item.kind === 'IEP' ? item.id : item.parentId,
        );
    } else if (item.kind === 'WEEKLY_REPORT') {
      if (item.studentId) navigateToWeeklyReport(item.studentId, item.id);
    } else if (item.studentId) {
      if (canOpenAttendanceRoster && item.classId) {
        navigateToAttendanceStudent(item.studentId, item.classId);
      } else if (currentUser.permissions.includes('special-ed:read')) {
        if (currentUser.role === 'SPECIAL_ED_COORDINATOR') {
          navigateToObservation(
            item.studentId,
            'FEDC',
            undefined,
            'ALL_RESULTS',
          );
        } else {
          navigateToObservation(item.studentId);
        }
      }
    }
  };

  const openNotification = (item: AggregateNotification) => {
    setNotificationsOpen(false);
    if (item.target.tab === 'LEARNING_JOURNEY_EDITOR') {
      navigateToJourneyEditor(item.target.recordId);
    } else if (item.target.tab === 'SPECIAL_ED_IEP' && item.target.studentId) {
      navigateToIEP(item.target.studentId, item.target.recordId);
    } else if (
      item.target.tab === 'SPECIAL_ED_WEEKLY_REPORT' &&
      item.target.studentId
    ) {
      navigateToWeeklyReport(item.target.studentId, item.target.recordId);
    } else if (
      item.target.tab === 'SPECIAL_ED_OBSERVATION' &&
      item.target.studentId
    ) {
      navigateToObservation(
        item.target.studentId,
        item.target.observationType,
        item.target.recordId,
      );
    }
  };

  const isLearningJourneyActive =
    activeTab === 'LEARNING_JOURNEY_CALENDAR' ||
    activeTab === 'LEARNING_JOURNEY_TRACKER' ||
    activeTab === 'LEARNING_JOURNEY_EDITOR';

  const isSpecialEdActive =
    activeTab === 'SPECIAL_ED_OBSERVATION' ||
    activeTab === 'SPECIAL_ED_IEP' ||
    activeTab === 'SPECIAL_ED_WEEKLY_REPORT';

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col font-sans text-stone-900">
      {/* Top Bar */}
      <header
        id="app-header"
        className="sticky top-0 z-30 bg-[#FFFDF9] border-b border-[#EFE7DC] px-4 lg:px-8 py-3 flex items-center justify-between shadow-2xs"
      >
        <div className="flex items-center gap-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6E161E] to-[#470B10] flex items-center justify-center text-white font-serif font-black text-xl shadow-md border border-[#8C1F28]/30">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-base text-[#1E1B18] tracking-tight">
                  Learnspace
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F5B842]/20 text-[#8F5900] border border-[#F5B842]/40">
                  PORTAL
                </span>
              </div>
              <p className="text-[11px] font-medium text-stone-500">
                Educator Portal · Academic 2026–2027 (Sem 1)
              </p>
            </div>
          </div>

          {/* Global Search */}
          <div className="relative hidden w-72 md:block lg:w-96">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-stone-400" />
              <input
                id="global-search-input"
                type="search"
                role="combobox"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setSearchQuery('');
                    setActiveSearchIndex(-1);
                    return;
                  }
                  if (!search.data.length) return;
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveSearchIndex((index) =>
                      index >= search.data.length - 1 ? 0 : index + 1,
                    );
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveSearchIndex((index) =>
                      index <= 0 ? search.data.length - 1 : index - 1,
                    );
                  } else if (event.key === 'Enter' && activeSearchIndex >= 0) {
                    event.preventDefault();
                    openSearchResult(search.data[activeSearchIndex]);
                  }
                }}
                placeholder="Search authorized students, plans, goals…"
                aria-label="Global search"
                aria-autocomplete="list"
                aria-controls="global-search-results"
                aria-expanded={searchQuery.trim().length >= 2}
                aria-activedescendant={
                  activeSearchIndex >= 0
                    ? `global-search-option-${activeSearchIndex}`
                    : undefined
                }
                className="w-full rounded-xl border border-[#E8DFC8] bg-[#FAF5EF] py-2 pl-9 pr-4 text-xs placeholder-stone-400 transition-all focus:border-[#6E161E] focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20"
              />
            </div>
            {searchQuery.trim().length >= 2 && (
              <div
                id="global-search-results"
                role="listbox"
                aria-label="Global search results"
                className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"
              >
                {search.status === 'loading' ? (
                  <p className="p-3 text-xs text-stone-500">
                    Searching authorized records…
                  </p>
                ) : search.status === 'error' ? (
                  <p className="p-3 text-xs text-rose-700">{search.error}</p>
                ) : search.data.length === 0 ? (
                  <p className="p-3 text-xs text-stone-500">
                    No authorized results found.
                  </p>
                ) : (
                  search.data.map((item, index) => (
                    <button
                      key={`${item.kind}:${item.id}`}
                      id={`global-search-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeSearchIndex === index}
                      onMouseEnter={() => setActiveSearchIndex(index)}
                      onClick={() => openSearchResult(item)}
                      className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#FAF5EF]"
                    >
                      <p className="truncate text-xs font-bold text-stone-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-stone-500">
                        {item.subtitle}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              id="notifications-bell-button"
              aria-label="Notifications"
              onClick={() => {
                const opening = !notificationsOpen;
                setNotificationsOpen(opening);
                if (opening) notifications.retry();
              }}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF] rounded-xl border border-transparent hover:border-[#E8DEC7] transition-all relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.data.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#6E161E]" />
              )}
            </button>

            {notificationsOpen && (
              <div
                id="notifications-dropdown-menu"
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-50"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-900">
                    Notifications & Action Items
                  </span>
                  <span className="rounded-full bg-[#6E161E]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#6E161E]">
                    {notifications.data.length} Open
                  </span>
                </div>
                <div className="space-y-2 py-2">
                  {notifications.status === 'loading' ? (
                    <p className="p-2 text-xs text-stone-500">
                      Loading action items…
                    </p>
                  ) : notifications.status === 'error' ? (
                    <div className="p-2 text-xs text-rose-700">
                      <p>{notifications.error}</p>
                      <button
                        type="button"
                        onClick={notifications.retry}
                        className="mt-2 font-bold underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : notifications.data.length === 0 ? (
                    <p className="p-2 text-xs text-stone-500">
                      No open action items in your current scope.
                    </p>
                  ) : (
                    notifications.data.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openNotification(item)}
                        className="w-full rounded-xl border border-[#E8DFC8] bg-[#FAF5EF] p-2.5 text-left hover:border-[#6E161E]/30"
                      >
                        <p className="text-xs font-bold text-stone-900">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-600">
                          {item.message}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-full">
        {/* Left Sidebar */}
        <aside
          id="app-sidebar"
          className="w-64 shrink-0 bg-[#FFFDF9] border-r border-[#EFE7DC] flex flex-col justify-between py-6 px-3 min-h-[calc(100vh-65px)] select-none"
        >
          <div className="space-y-6">
            {/* Primary Nav Links */}
            <nav className="space-y-1">
              {/* Dashboard */}
              <button
                id="nav-dashboard"
                onClick={() => setActiveTab('DASHBOARD')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-[#6E161E] text-white shadow-sm'
                    : 'text-stone-700 hover:bg-[#FAF5EF] hover:text-stone-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              {/* Attendance */}
              <button
                id="nav-attendance"
                onClick={() => setActiveTab('ATTENDANCE')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'ATTENDANCE'
                    ? 'bg-[#6E161E] text-white shadow-sm'
                    : 'text-stone-700 hover:bg-[#FAF5EF] hover:text-stone-900'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Attendance</span>
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    activeTab === 'ATTENDANCE'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Today
                </span>
              </button>

              {canAdminOrganization && (
                <button
                  id="nav-people-access"
                  onClick={() => setActiveTab('PEOPLE_ACCESS')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'PEOPLE_ACCESS'
                      ? 'bg-[#6E161E] text-white shadow-sm'
                      : 'text-stone-700 hover:bg-[#FAF5EF] hover:text-stone-900'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span>People & access</span>
                </button>
              )}

              {/* Learning Journey Accordion */}
              {currentUser.permissions.includes('journey:read') && (
                <div className="pt-2">
                  <button
                    id="nav-learning-journey-toggle"
                    onClick={() =>
                      setLearningJourneyMenuOpen(!learningJourneyMenuOpen)
                    }
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isLearningJourneyActive && !learningJourneyMenuOpen
                        ? 'bg-[#6E161E]/10 text-[#6E161E]'
                        : 'text-stone-700 hover:bg-[#FAF5EF] hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-[#6E161E]" />
                      <span>Learning Journey</span>
                    </div>
                    {learningJourneyMenuOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                    )}
                  </button>

                  {learningJourneyMenuOpen && (
                    <div className="ml-5 pl-3 border-l-2 border-[#EFE7DC] mt-1 space-y-1 py-1">
                      <button
                        id="nav-lj-calendar"
                        onClick={() =>
                          setActiveTab('LEARNING_JOURNEY_CALENDAR')
                        }
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === 'LEARNING_JOURNEY_CALENDAR'
                            ? 'bg-[#6E161E] text-white font-bold'
                            : 'text-stone-600 hover:bg-[#FAF5EF] hover:text-stone-900'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Calendar View</span>
                      </button>

                      <button
                        id="nav-lj-tracker"
                        onClick={() => setActiveTab('LEARNING_JOURNEY_TRACKER')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === 'LEARNING_JOURNEY_TRACKER'
                            ? 'bg-[#6E161E] text-white font-bold'
                            : 'text-stone-600 hover:bg-[#FAF5EF] hover:text-stone-900'
                        }`}
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>Status Tracker</span>
                      </button>

                      {currentUser.permissions.includes('journey:write') && (
                        <button
                          id="nav-lj-create"
                          onClick={() => navigateToJourneyEditor()}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            activeTab === 'LEARNING_JOURNEY_EDITOR'
                              ? 'bg-[#6E161E] text-white font-bold'
                              : 'text-[#6E161E] hover:bg-[#6E161E]/5 font-semibold'
                          }`}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Create Journey</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Special Education Accordion - Only accessible to GPK teachers, Coordinator, and Leadership */}
              {(currentUser.isGPK ||
                currentUser.isSpecialEdCoordinator ||
                currentUser.role === 'SPECIAL_ED_TEACHER' ||
                currentUser.role === 'SPECIALIST' ||
                currentUser.role === 'PRINCIPAL' ||
                currentUser.role === 'DIRECTOR') && (
                <div className="pt-2">
                  <button
                    id="nav-special-ed-toggle"
                    onClick={() => setSpecialEdMenuOpen(!specialEdMenuOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isSpecialEdActive && !specialEdMenuOpen
                        ? 'bg-[#6E161E]/10 text-[#6E161E]'
                        : 'text-stone-700 hover:bg-[#FAF5EF] hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-4 h-4 text-[#F5B842]" />
                      <span>Special Education</span>
                    </div>
                    {specialEdMenuOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                    )}
                  </button>

                  {specialEdMenuOpen && (
                    <div className="ml-5 pl-3 border-l-2 border-[#EFE7DC] mt-1 space-y-1 py-1">
                      <button
                        id="nav-sp-observation"
                        onClick={() => setActiveTab('SPECIAL_ED_OBSERVATION')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === 'SPECIAL_ED_OBSERVATION'
                            ? 'bg-[#6E161E] text-white font-bold'
                            : 'text-stone-600 hover:bg-[#FAF5EF] hover:text-stone-900'
                        }`}
                      >
                        <Brain className="w-3.5 h-3.5" />
                        <span>Observation</span>
                      </button>

                      <button
                        id="nav-sp-iep"
                        onClick={() => setActiveTab('SPECIAL_ED_IEP')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === 'SPECIAL_ED_IEP'
                            ? 'bg-[#6E161E] text-white font-bold'
                            : 'text-stone-600 hover:bg-[#FAF5EF] hover:text-stone-900'
                        }`}
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>Annual IEP Plan</span>
                      </button>

                      <button
                        id="nav-sp-report"
                        onClick={() => setActiveTab('SPECIAL_ED_WEEKLY_REPORT')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          activeTab === 'SPECIAL_ED_WEEKLY_REPORT'
                            ? 'bg-[#6E161E] text-white font-bold'
                            : 'text-stone-600 hover:bg-[#FAF5EF] hover:text-stone-900'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Weekly IEP Report</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reports */}
              <button
                id="nav-reports"
                onClick={() => setActiveTab('REPORTS')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'REPORTS'
                    ? 'bg-[#6E161E] text-white shadow-sm'
                    : 'text-stone-700 hover:bg-[#FAF5EF] hover:text-stone-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Reports & Analytics</span>
              </button>
            </nav>
          </div>

          {/* Current User Card at bottom of Sidebar */}
          <div className="pt-4 border-t border-[#EFE7DC] space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-[#FAF5EF] border border-[#E8DFC8]">
              <img
                src={
                  currentUser.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'
                }
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border border-stone-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-[#6E161E] font-bold uppercase truncate">
                  {currentUser.roleTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E8DFC8] px-3 py-2 text-xs font-bold text-[#6E161E] hover:bg-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>

            <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
              <span>
                Status:{' '}
                <strong className="text-emerald-700 font-semibold">
                  Online
                </strong>
              </span>
              <span className="font-mono text-[10px]">v1.0.4</span>
            </div>
          </div>
        </aside>

        {/* Primary Page Canvas */}
        <main
          id="main-page-canvas"
          className="flex-1 p-4 md:p-8 overflow-y-auto max-h-[calc(100vh-65px)]"
        >
          {children}
        </main>
      </div>
    </div>
  );
};
