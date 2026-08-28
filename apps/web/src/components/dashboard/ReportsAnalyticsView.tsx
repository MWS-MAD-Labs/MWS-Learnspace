import React from 'react';
import {
  BookOpen,
  Brain,
  ClipboardCheck,
  RefreshCw,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReportingAggregate } from '../../hooks/useAggregates';

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export const ReportsAnalyticsView: React.FC = () => {
  const { organizationId } = useApp();
  const { data, status, error, retry } = useReportingAggregate(organizationId);

  if (status === 'loading') {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-sm font-semibold text-stone-700">
        <RefreshCw className="h-5 w-5 animate-spin text-[#6E161E]" />
        Loading authorized reporting aggregates…
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <TriangleAlert className="mx-auto h-9 w-9 text-rose-700" />
        <h1 className="mt-3 text-lg font-black text-stone-900">
          Reports could not be loaded
        </h1>
        <p className="mt-2 text-sm text-stone-600">{error}</p>
        <button
          onClick={retry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Retry reports
        </button>
      </div>
    );
  }

  const attendance = data.attendance;
  const journeys = data.journeys;
  const specialEducation = data.specialEducation;
  const observations = data.observations;

  return (
    <div
      id="reports-analytics-view"
      className="mx-auto max-w-7xl space-y-6 pb-24"
    >
      <div className="rounded-3xl border border-[#EFE7DC] bg-white p-6 shadow-xs">
        <span className="rounded-full bg-[#6E161E]/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#6E161E]">
          Authorized Analytics
        </span>
        <h1 className="mt-2 font-heading text-2xl font-black text-stone-900">
          Reports & Analytics
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Cross-domain counts are calculated by the server after organization
          and record-scope authorization.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <section className="space-y-4 rounded-3xl border border-[#EFE7DC] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Users className="h-4 w-4 text-[#6E161E]" />
              Students
            </h2>
            <strong className="text-xl">{data.students.total}</strong>
          </div>
          <p className="text-xs text-stone-600">
            {data.students.specialSupport} students with special support in your
            current scope.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-[#EFE7DC] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <BookOpen className="h-4 w-4 text-[#6E161E]" />
              Curriculum
            </h2>
            <strong className="text-xl">{journeys?.total ?? '—'}</strong>
          </div>
          {journeys ? (
            <div className="space-y-2 text-xs text-stone-600">
              <p>
                {journeys.approved} approved (
                {percent(journeys.approved, journeys.total)}%)
              </p>
              <p>{journeys.inReview} in review</p>
              <p>{journeys.draft} drafts</p>
            </div>
          ) : (
            <p className="text-xs text-stone-500">
              Not available for this role.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-[#EFE7DC] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Brain className="h-4 w-4 text-[#6E161E]" />
              Special Education
            </h2>
            <strong className="text-xl">
              {specialEducation?.activeIeps ?? '—'}
            </strong>
          </div>
          {specialEducation ? (
            <div className="space-y-2 text-xs text-stone-600">
              <p>{specialEducation.activeGoals} active IEP goals</p>
              <p>{specialEducation.achievedGoals} achieved goals</p>
              <p>{specialEducation.weeklyReportsDue} weekly report drafts</p>
            </div>
          ) : (
            <p className="text-xs text-stone-500">
              Not available for this role.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-[#EFE7DC] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <ClipboardCheck className="h-4 w-4 text-[#6E161E]" />
              Observations
            </h2>
            <strong className="text-xl">
              {observations?.completed ?? '—'}
            </strong>
          </div>
          {observations ? (
            <div className="space-y-2 text-xs text-stone-600">
              <p>
                {observations.pending} pending · {observations.inProgress} in
                progress
              </p>
              <p>
                {observations.completedByType.FEDC} FEDC ·{' '}
                {observations.completedByType.SENSORY_PROFILE} Sensory ·{' '}
                {observations.completedByType.SFA} SFA
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-500">
              Not available for this role.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-[#EFE7DC] bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900">
          Attendance for {attendance?.schoolDate ?? 'today'}
        </h2>
        {attendance ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ['Authorized students', attendance.totalStudents],
              ['Recorded', attendance.recorded],
              ['Present', attendance.present],
              ['Late', attendance.late],
              ['Absent', attendance.absent],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-[#FAF5EF] p-4">
                <p className="text-[11px] font-bold uppercase text-stone-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-black text-stone-900">
                  {value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-stone-500">
            Attendance reporting is not available for this role.
          </p>
        )}
      </section>
    </div>
  );
};
