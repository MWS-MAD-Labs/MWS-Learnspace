import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboardSummary } from '../../hooks/useAggregates';
import { StatusBadge } from '../common/StatusBadge';

function stateBadge(state: string) {
  if (state === 'APPROVED' || state === 'ACTIVE') return 'Approved';
  if (state === 'DRAFT') return 'On Progress';
  return 'Pending';
}

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    organizationId,
    setActiveTab,
    navigateToJourneyEditor,
    navigateToWeeklyReportTracker,
  } = useApp();
  const { data, status, error, retry } = useDashboardSummary(organizationId);
  const canWriteJourneys = currentUser.permissions.includes('journey:write');

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-80 items-center justify-center gap-3 text-sm font-semibold text-stone-700"
        aria-live="polite"
      >
        <RefreshCw className="h-5 w-5 animate-spin text-[#6E161E]" />
        Loading your authorized dashboard…
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <TriangleAlert className="mx-auto h-9 w-9 text-rose-700" />
        <h1 className="mt-3 text-lg font-black text-stone-900">
          Dashboard could not be loaded
        </h1>
        <p className="mt-2 text-sm text-stone-600">{error}</p>
        <button
          onClick={retry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" /> Retry dashboard
        </button>
      </div>
    );
  }

  const attendance = data.attendance;
  const journeys = data.journeys;
  const specialEducation = data.specialEducation;
  const remainingGoals = specialEducation
    ? Math.max(0, specialEducation.activeGoals - specialEducation.achievedGoals)
    : 0;

  return (
    <div id="dashboard-view-container" className="mx-auto max-w-7xl space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-[#EFE7DC] bg-[#FFFDF9] p-6 shadow-xs md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-80 bg-gradient-to-l from-[#F5B842]/10 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#6E161E]/10 px-3 py-1 text-xs font-bold text-[#6E161E]">
              <Sparkles className="h-3.5 w-3.5" /> Authorized organization
              summary
            </div>
            <h1 className="font-heading text-2xl font-black tracking-tight text-stone-900 md:text-3xl">
              Good morning, {currentUser.name}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
              This dashboard is calculated by the server from records available
              to your current organization membership and assignments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {attendance && (
              <button
                onClick={() => setActiveTab('ATTENDANCE')}
                className="flex items-center gap-2 rounded-xl bg-[#6E161E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#581117]"
              >
                <CalendarCheck className="h-4 w-4" /> Take Attendance
              </button>
            )}
            {canWriteJourneys && (
              <button
                onClick={() => navigateToJourneyEditor()}
                className="flex items-center gap-2 rounded-xl bg-[#F5B842] px-4 py-2.5 text-xs font-bold text-stone-900 shadow-xs hover:bg-[#EEAA2B]"
              >
                <BookOpen className="h-4 w-4" /> + New Journey
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => attendance && setActiveTab('ATTENDANCE')}
          disabled={!attendance}
          className="group rounded-2xl border border-[#EFE7DC] bg-white p-5 text-left shadow-xs transition-all hover:border-[#6E161E]/30 disabled:cursor-default disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Attendance Today
            </span>
            <CalendarCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-3 text-3xl font-black text-stone-900">
            {attendance
              ? `${attendance.recorded}/${attendance.totalStudents}`
              : '—'}
          </div>
          <p className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>
              {attendance
                ? `${attendance.present} present · ${attendance.late} late`
                : 'Not available for this role'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </button>

        <button
          onClick={() => journeys && setActiveTab('LEARNING_JOURNEY_TRACKER')}
          disabled={!journeys}
          className="group rounded-2xl border border-[#EFE7DC] bg-white p-5 text-left shadow-xs transition-all hover:border-[#6E161E]/30 disabled:cursor-default disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Curriculum Status
            </span>
            <BookOpen className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-3 text-3xl font-black text-stone-900">
            {journeys?.total ?? '—'}
          </div>
          <p className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>
              {journeys
                ? `${journeys.inReview} in review · ${journeys.approved} approved`
                : 'Not available for this role'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </button>

        <button
          onClick={() => specialEducation && navigateToWeeklyReportTracker()}
          disabled={!specialEducation}
          className="group rounded-2xl border border-[#EFE7DC] bg-white p-5 text-left shadow-xs transition-all hover:border-[#6E161E]/30 disabled:cursor-default disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              IEP Milestones
            </span>
            <GraduationCap className="h-4 w-4 text-purple-700" />
          </div>
          <div className="mt-3 text-3xl font-black text-stone-900">
            {specialEducation ? remainingGoals : '—'}
          </div>
          <p className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>
              {specialEducation
                ? `${specialEducation.weeklyReportsDue} weekly report drafts`
                : 'Not available for this role'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </button>

        <button
          onClick={() => attendance && setActiveTab('ATTENDANCE')}
          disabled={!attendance}
          className="group rounded-2xl border border-[#EFE7DC] bg-white p-5 text-left shadow-xs transition-all hover:border-[#6E161E]/30 disabled:cursor-default disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Authorized Students
            </span>
            <Users className="h-4 w-4 text-blue-700" />
          </div>
          <div className="mt-3 text-3xl font-black text-stone-900">
            {data.students.total}
          </div>
          <p className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>{data.students.specialSupport} with special support</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </button>
      </div>

      <section className="rounded-3xl border border-[#EFE7DC] bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#6E161E]" />
            <h2 className="text-base font-bold text-stone-900">
              Recently Updated Learning Journeys
            </h2>
          </div>
          {journeys && (
            <button
              onClick={() => setActiveTab('LEARNING_JOURNEY_TRACKER')}
              className="flex items-center gap-1 text-xs font-bold text-[#6E161E] hover:underline"
            >
              View tracker <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {data.recentJourneys.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">
            No learning journeys are available in your current scope.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.recentJourneys.map((journey) => (
              <button
                key={journey.id}
                onClick={() => navigateToJourneyEditor(journey.id)}
                className="rounded-2xl border border-[#E8DFC8] bg-[#FAF5EF] p-4 text-left hover:border-[#6E161E]/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-stone-600">
                    {journey.grade} · {journey.subject}
                  </span>
                  <StatusBadge status={stateBadge(journey.state)} size="sm" />
                </div>
                <h3 className="mt-2 text-sm font-bold text-stone-900">
                  {journey.title}
                </h3>
                <p className="mt-3 text-xs font-bold text-[#6E161E]">
                  Open unit →
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
