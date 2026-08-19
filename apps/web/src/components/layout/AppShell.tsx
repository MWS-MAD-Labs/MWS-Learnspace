import React, { useState } from 'react';
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
  RefreshCw,
} from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    currentUser,
    allUsers,
    switchRole,
    activeTab,
    setActiveTab,
    specialEdSubTab,
    setSpecialEdSubTab,
    searchQuery,
    setSearchQuery,
    resetAllDataToDefault,
    navigateToJourneyEditor,
  } = useApp();

  const [learningJourneyMenuOpen, setLearningJourneyMenuOpen] = useState(true);
  const [specialEdMenuOpen, setSpecialEdMenuOpen] = useState(true);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
          <div className="hidden md:flex items-center relative w-72 lg:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students, plans, goals, or subjects..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20 focus:border-[#6E161E] placeholder-stone-400 transition-all"
            />
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher (Crucial for Reviewer vs Author testing) */}
          <div className="relative">
            <button
              id="role-switcher-dropdown-button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] border border-[#E8DEC7] rounded-xl text-xs font-semibold text-stone-800 transition-colors shadow-2xs"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline text-stone-500 font-medium">
                Role:
              </span>
              <span className="font-bold text-[#6E161E]">
                {currentUser.roleTitle}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
            </button>

            {roleDropdownOpen && (
              <div
                id="role-switcher-menu"
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-4 py-2 border-b border-stone-100">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Simulate Role (Testing)
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Switch user to test authoring, reviews & approvals
                  </p>
                </div>
                <div className="py-1">
                  {allUsers.map((user) => (
                    <button
                      key={user.id}
                      id={`switch-user-btn-${user.id}`}
                      onClick={() => {
                        switchRole(user.id);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-[#FAF5EF] transition-colors ${
                        currentUser.id === user.id
                          ? 'bg-[#FAF5EF] border-l-3 border-[#6E161E]'
                          : ''
                      }`}
                    >
                      <img
                        src={
                          user.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'
                        }
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {user.name}
                          </p>
                          {currentUser.id === user.id && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 truncate">
                          {user.roleTitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-3 pt-2 pb-1 border-t border-stone-100">
                  <button
                    id="reset-demo-data-button"
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      resetAllDataToDefault();
                    }}
                    className="w-full py-1.5 px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Learnspace Data to Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              id="notifications-bell-button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-[#FAF5EF] rounded-xl border border-transparent hover:border-[#E8DEC7] transition-all relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6E161E]" />
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
                  <span className="text-[10px] bg-[#6E161E]/10 text-[#6E161E] font-bold px-1.5 py-0.5 rounded-full">
                    2 New
                  </span>
                </div>
                <div className="py-2 space-y-2">
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-left">
                    <p className="text-xs font-bold text-amber-900">
                      Learning Journey Review Required
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      "Moving My Body" by Coach Marcus Vance is awaiting
                      Principal review.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/60 text-left">
                    <p className="text-xs font-bold text-purple-900">
                      Weekly IEP Report Due
                    </p>
                    <p className="text-[11px] text-purple-700 mt-0.5">
                      Week 14 IEP progress logging for Leo M. is ready for
                      completion.
                    </p>
                  </div>
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

              {/* Learning Journey Accordion */}
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
                      onClick={() => setActiveTab('LEARNING_JOURNEY_CALENDAR')}
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
                  </div>
                )}
              </div>

              {/* Special Education Accordion - Only accessible to GPK teachers, Coordinator, and Leadership */}
              {(currentUser.isGPK ||
                currentUser.isSpecialEdCoordinator ||
                currentUser.role === 'SPECIAL_ED_TEACHER' ||
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
