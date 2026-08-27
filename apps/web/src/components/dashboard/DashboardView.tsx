import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useIEPs } from '../../hooks/useIEPs';
import { useLearningJourneys } from '../../hooks/useLearningJourneys';
import { SEED_ANNOUNCEMENTS, SEED_SCHEDULE_ITEMS } from '../../data/seedData';
import { StatusBadge } from '../common/StatusBadge';
import {
  Clock,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Users,
  MapPin,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    organizationId,
    students,
    setActiveTab,
    navigateToJourneyEditor,
    navigateToWeeklyReport,
    navigateToIEP,
    showToast,
  } = useApp();

  const [announcements, setAnnouncements] = useState(SEED_ANNOUNCEMENTS);
  const canReadJourneys = currentUser.permissions.includes('journey:read');
  const canWriteJourneys = currentUser.permissions.includes('journey:write');
  const canReadIEPs =
    currentUser.role === 'DIRECTOR' ||
    currentUser.role === 'PRINCIPAL' ||
    currentUser.role === 'SPECIAL_ED_COORDINATOR' ||
    currentUser.role === 'SPECIAL_ED_TEACHER' ||
    currentUser.isGPK === true;
  const { journeys } = useLearningJourneys(
    organizationId,
    {},
    { enabled: canReadJourneys },
  );
  const { ieps: iepRecords } = useIEPs(
    organizationId,
    {},
    { enabled: canReadIEPs },
  );

  // Active IEP goal stats
  const activeIep = iepRecords[0];
  const totalGoals = activeIep?.goals?.length || 0;
  const achievedGoals = activeIep?.goals?.filter((g) => g.achieved).length || 0;

  const toggleRsvp = (annId: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => {
        if (a.id === annId) {
          const nextStatus =
            a.rsvpStatus === 'Attending' ? 'Pending' : 'Attending';
          showToast(
            'success',
            'RSVP Updated',
            `You are marked as "${nextStatus}" for ${a.title}`,
          );
          return { ...a, rsvpStatus: nextStatus as 'Attending' | 'Pending' };
        }
        return a;
      }),
    );
  };

  return (
    <div id="dashboard-view-container" className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DC] rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-[#F5B842]/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#6E161E]/10 text-[#6E161E]">
              <Sparkles className="w-3.5 h-3.5" />
              Academic Term 1 · Active Session
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-heading text-stone-900 tracking-tight">
              Good morning, {currentUser.name}
            </h1>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Here is a summary of your classroom's progress, upcoming
              curriculum deadlines, and special education milestones for today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="dashboard-take-attendance-btn"
              onClick={() => setActiveTab('ATTENDANCE')}
              className="px-4 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4" />
              Take Attendance
            </button>
            {canWriteJourneys && (
              <button
                id="dashboard-create-journey-btn"
                onClick={() => navigateToJourneyEditor()}
                className="px-4 py-2.5 bg-[#F5B842] hover:bg-[#EEAA2B] text-stone-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />+ New Journey
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance KPI */}
        <div
          onClick={() => setActiveTab('ATTENDANCE')}
          className="p-5 bg-white border border-[#EFE7DC] rounded-2xl shadow-xs hover:border-[#6E161E]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Attendance workspace
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-black text-stone-900">
              Open roster
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>Choose an authorized class and school date</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Learning Journeys KPI */}
        <div
          onClick={() => setActiveTab('LEARNING_JOURNEY_TRACKER')}
          className="p-5 bg-white border border-[#EFE7DC] rounded-2xl shadow-xs hover:border-[#6E161E]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Curriculum Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-stone-900">
              {journeys.length}
            </span>
            <span className="text-xs font-semibold text-stone-600">
              Active Units
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>2 Ready for Review</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Special Ed IEP Goals */}
        <div
          onClick={() => navigateToWeeklyReport('stu-001')}
          className="p-5 bg-white border border-[#EFE7DC] rounded-2xl shadow-xs hover:border-[#6E161E]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              IEP Milestones
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-stone-900">
              {totalGoals - achievedGoals}
            </span>
            <span className="text-xs font-semibold text-purple-800">
              In Progress
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>Leo M. Tanaka (Week 14)</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Assigned Students */}
        <div
          onClick={() => setActiveTab('ATTENDANCE')}
          className="p-5 bg-white border border-[#EFE7DC] rounded-2xl shadow-xs hover:border-[#6E161E]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-stone-900">
              {students.length}
            </span>
            <span className="text-xs font-semibold text-blue-800">
              Students
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>3 Special Support (GPK)</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      {/* Two Column Layout: Today's Schedule & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Schedule & Quick IEP Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Timeline */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#6E161E]" />
                <h2 className="text-base font-bold text-stone-900">
                  Today's Academic Schedule
                </h2>
              </div>
              <span className="text-xs text-stone-500 font-medium">
                Friday, October 24, 2026
              </span>
            </div>

            <div className="divide-y divide-stone-100 mt-2">
              {SEED_SCHEDULE_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex items-start gap-4 hover:bg-stone-50/60 p-2 rounded-xl transition-colors"
                >
                  <div className="w-20 shrink-0 text-xs font-bold text-stone-700 pt-0.5">
                    {item.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {item.room}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.type === 'academic'
                        ? 'bg-blue-50 text-blue-800'
                        : item.type === 'pe'
                          ? 'bg-amber-50 text-amber-900'
                          : item.type === 'meeting'
                            ? 'bg-purple-50 text-purple-800'
                            : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {item.type.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Learning Journey Spotlights */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#6E161E]" />
                <h2 className="text-base font-bold text-stone-900">
                  Current Learning Journeys
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('LEARNING_JOURNEY_TRACKER')}
                className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1"
              >
                View Tracker <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {journeys.slice(0, 2).map((j) => (
                <div
                  key={j.id}
                  className="p-4 rounded-2xl bg-[#FAF5EF] border border-[#E8DFC8] flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-600">
                        {j.grade} · {j.subject}
                      </span>
                      <StatusBadge
                        status={
                          j.principalReviewStatus === 'Done'
                            ? 'Approved'
                            : j.principalReviewStatus
                        }
                        size="sm"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-stone-900 mt-1">
                      {j.title}
                    </h3>
                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                      {j.projects[0]?.description ||
                        'Comprehensive unit curriculum with cross-curricular connections.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E8DFC8]/60 flex items-center justify-between text-xs">
                    <span className="text-stone-500">
                      Author: {j.authorName}
                    </span>
                    <button
                      onClick={() => navigateToJourneyEditor(j.id)}
                      className="font-bold text-[#6E161E] hover:underline"
                    >
                      Open Unit →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Announcements & Quick Special Ed Link */}
        <div className="space-y-6">
          {/* Announcements Card with interactive RSVP */}
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                Faculty Announcements
              </h2>
              <span className="text-[10px] font-bold bg-[#F5B842]/20 text-[#8F5900] px-2 py-0.5 rounded-full">
                Important
              </span>
            </div>

            <div className="space-y-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 rounded-2xl bg-[#FAF5EF] border border-[#E8DFC8] space-y-2"
                >
                  <h3 className="text-xs font-bold text-stone-900 leading-snug">
                    {ann.title}
                  </h3>
                  <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {ann.date}
                  </p>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {ann.summary}
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">
                      {ann.location}
                    </span>
                    <button
                      id={`rsvp-toggle-${ann.id}`}
                      onClick={() => toggleRsvp(ann.id)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                        ann.rsvpStatus === 'Attending'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {ann.rsvpStatus === 'Attending'
                        ? '✓ Attending'
                        : 'RSVP Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Special Education Action Card */}
          <div className="bg-gradient-to-br from-[#6E161E] to-[#470B10] rounded-3xl p-6 text-white shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-[#F5B842]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#F5B842]">
                Special Education Portal
              </span>
            </div>
            <h3 className="text-lg font-black font-heading leading-tight">
              Individualized Education Program (IEP)
            </h3>
            <p className="text-xs text-stone-200 leading-relaxed">
              Track student sensory profiles, functional emotional developmental
              capacities (FEDC), and log weekly milestone progress.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigateToWeeklyReport('stu-001')}
                className="w-full py-2.5 px-4 bg-[#F5B842] hover:bg-[#EEAA2B] text-stone-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                Log Weekly Progress (Leo M.)
              </button>
              <button
                onClick={() => navigateToIEP('stu-001')}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors border border-white/20"
              >
                View Annual IEP Master Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
