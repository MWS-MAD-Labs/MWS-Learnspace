import React from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { useLearningJourneys } from '../../hooks/useLearningJourneys';
import { useFEDCObservations } from '../../hooks/useFEDCObservations';
import { Users, BookOpen, Brain } from 'lucide-react';

export const ReportsAnalyticsView: React.FC = () => {
  const { students, currentUser, organizationId, navigateToIEP } = useApp();

  const canReadJourneys = currentUser.permissions.includes('journey:read');
  const { journeys } = useLearningJourneys(
    organizationId,
    {},
    { enabled: canReadJourneys },
  );
  const iepRecords = storageService.getIEPRecords();
  const featuredStudent = students.find((student) => student.specialNeedsFlag);
  const fedcHistory = useFEDCObservations(
    organizationId,
    featuredStudent?.id || '',
    { enabled: Boolean(featuredStudent) },
  );
  const latestFedc = fedcHistory.observations[0];

  const approvedJourneys = journeys.filter(
    (j) => j.directorApprovalStatus === 'Done',
  );
  const inReviewJourneys = journeys.filter(
    (j) =>
      j.principalReviewStatus === 'On Progress' ||
      j.directorApprovalStatus === 'On Progress',
  );
  const draftJourneys = journeys.filter((j) => j.draftStatus === 'On Progress');

  return (
    <div
      id="reports-analytics-view"
      className="space-y-6 max-w-7xl mx-auto pb-24"
    >
      {/* Header */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
              Academic Intelligence
            </span>
            <span className="text-xs font-semibold text-stone-500">
              Term 1 Progress & Compliance Analytics
            </span>
          </div>
          <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
            Reports & Schoolwide Analytics
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time compliance monitoring across curriculum design, special
            education milestones, and attendance.
          </p>
        </div>
      </div>

      {/* Analytics Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Curriculum Progress */}
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <BookOpen className="w-4 h-4 text-[#6E161E]" />
              <h3>Curriculum Journey Status</h3>
            </div>
            <span className="text-xs font-bold text-[#6E161E] bg-[#6E161E]/10 px-2 py-0.5 rounded-full">
              {journeys.length} Units
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-600 font-medium">
                Approved by Director
              </span>
              <span className="font-bold text-emerald-700">
                {approvedJourneys.length}
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{
                  width: `${(approvedJourneys.length / Math.max(1, journeys.length)) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-600 font-medium">
                In Review Pipeline
              </span>
              <span className="font-bold text-amber-700">
                {inReviewJourneys.length}
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{
                  width: `${(inReviewJourneys.length / Math.max(1, journeys.length)) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-600 font-medium">
                Drafting In Progress
              </span>
              <span className="font-bold text-stone-700">
                {draftJourneys.length}
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-stone-400 h-full rounded-full"
                style={{
                  width: `${(draftJourneys.length / Math.max(1, journeys.length)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Special Ed IEP Tracking */}
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Brain className="w-4 h-4 text-[#6E161E]" />
              <h3>Special Education & IEPs</h3>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
              {iepRecords.length} Active Plans
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-stone-900">
                  {featuredStudent?.fullName || 'GPK Support Student'}
                </p>
                <p className="text-[11px] text-stone-500">
                  {fedcHistory.status === 'loading'
                    ? 'Loading FEDC baseline…'
                    : latestFedc
                      ? `FEDC Baseline: ${latestFedc.totalScore} / ${latestFedc.maxPossibleScore || 72} Pts`
                      : 'No FEDC baseline available'}
                </p>
              </div>
              <button
                onClick={() =>
                  featuredStudent && navigateToIEP(featuredStudent.id)
                }
                disabled={!featuredStudent}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-[11px] font-bold rounded-lg transition-colors"
              >
                Inspect
              </button>
            </div>

            <div className="p-3 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-stone-900">
                  Maya S. (Speech & Motor)
                </p>
                <p className="text-[11px] text-stone-500">
                  SFA Score: Regular Classroom with Assist
                </p>
              </div>
              <button
                onClick={() => navigateToIEP('stu-003')}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-[11px] font-bold rounded-lg transition-colors"
              >
                Inspect
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Trends */}
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Users className="w-4 h-4 text-[#6E161E]" />
              <h3>Student Attendance Index</h3>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              96.4% Average
            </span>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">
                  Present On-Time
                </span>
                <span className="font-black text-emerald-900">92%</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">
                  Excused & Tardy
                </span>
                <span className="font-black text-amber-900">5.5%</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-900">
                  Unexcused Absences
                </span>
                <span className="font-black text-rose-900">2.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
