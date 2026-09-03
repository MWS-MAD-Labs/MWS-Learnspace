import React, { useState } from 'react';
import {
  fedcDefinitionBodySchema,
  sfaDefinitionBodySchema,
} from '@learnspace/contracts';
import { Student, User } from '../../types';
import { useApp } from '../../context/AppContext';
import { useFEDCObservations } from '../../hooks/useFEDCObservations';
import { useSensoryProfileObservations } from '../../hooks/useSensoryProfileObservations';
import { useSFAObservations } from '../../hooks/useSFAObservations';
import { Avatar } from '../common/Avatar';
import {
  Brain,
  Activity,
  FileText,
  Calendar,
  User as UserIcon,
  BarChart3,
  Sparkles,
  Eye,
  Layers,
  Printer,
  Sliders,
  ExternalLink,
  BookOpen,
  Info,
  RefreshCw,
} from 'lucide-react';

function recordFedcMilestones(record: unknown) {
  const candidate = record as {
    definition?: { body?: unknown };
  };
  const parsed = fedcDefinitionBodySchema.safeParse(candidate.definition?.body);
  return parsed.success ? parsed.data.milestones : [];
}

function recordSfaDefinition(record: unknown) {
  const candidate = record as { definition?: { body?: unknown } };
  const parsed = sfaDefinitionBodySchema.safeParse(candidate.definition?.body);
  return parsed.success ? parsed.data : null;
}

function recordSensorySections(record: unknown) {
  const candidate = record as {
    definition?: { body?: { items?: unknown; sections?: unknown } };
  };
  const flatItems = candidate.definition?.body?.items;
  if (Array.isArray(flatItems)) {
    return ['Auditory', 'Visual', 'Touch', 'Movement', 'Behavioral'].flatMap(
      (sectionName) => {
        const items = flatItems.flatMap((itemValue) => {
          if (!itemValue || typeof itemValue !== 'object') return [];
          const item = itemValue as Record<string, unknown>;
          if (item.section !== sectionName || !item.id || !item.text) return [];
          return [
            {
              id: String(item.id),
              number: String(item.number || ''),
              text: String(item.text),
              quadrant:
                typeof item.quadrant === 'string' ? item.quadrant : undefined,
              factorLabel:
                typeof item.factorLabel === 'string'
                  ? item.factorLabel
                  : undefined,
            },
          ];
        });
        return items.length
          ? [
              {
                id: sectionName.toLowerCase(),
                title: `${sectionName} Processing`,
                maxScore: items.length * 5,
                items,
              },
            ]
          : [];
      },
    );
  }

  const sections = candidate.definition?.body?.sections;
  if (!Array.isArray(sections)) return [];
  return sections.flatMap((sectionValue) => {
    if (!sectionValue || typeof sectionValue !== 'object') return [];
    const section = sectionValue as Record<string, unknown>;
    if (!Array.isArray(section.items)) return [];
    return [
      {
        id: String(section.id || section.title || ''),
        title: String(section.title || section.id || 'Sensory section'),
        maxScore: typeof section.maxScore === 'number' ? section.maxScore : 0,
        items: section.items.flatMap((itemValue) => {
          if (!itemValue || typeof itemValue !== 'object') return [];
          const item = itemValue as Record<string, unknown>;
          if (!item.id || !item.text) return [];
          return [
            {
              id: String(item.id),
              number: String(item.number || ''),
              text: String(item.text),
              quadrant:
                typeof item.quadrant === 'string' ? item.quadrant : undefined,
              factorLabel:
                typeof item.factorLabel === 'string'
                  ? item.factorLabel
                  : undefined,
            },
          ];
        }),
      },
    ];
  });
}

interface ObservationHistoryViewerProps {
  student: Student;
  currentUser: User;
  onNavigateToIEP?: () => void;
  onOpenAssessmentForm?: (
    type: 'FEDC' | 'SENSORY_PROFILE' | 'SFA',
    recordId?: string,
    assignmentId?: string,
  ) => void;
}

export const ObservationHistoryViewer: React.FC<
  ObservationHistoryViewerProps
> = ({ student, currentUser, onNavigateToIEP, onOpenAssessmentForm }) => {
  const { organizationId } = useApp();
  const fedcHistory = useFEDCObservations(organizationId, student.id);
  const sensoryHistory = useSensoryProfileObservations(
    organizationId,
    student.id,
  );
  const sfaHistory = useSFAObservations(organizationId, student.id);
  const [selectedInstrument, setSelectedInstrument] = useState<
    'ALL' | 'FEDC' | 'SENSORY' | 'SFA'
  >('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Detailed record modal state
  const [activeDetailRecord, setActiveDetailRecord] = useState<{
    type: 'FEDC' | 'SENSORY' | 'SFA';
    data: any;
  } | null>(null);

  // Sub-tabs inside the detail modal
  const [detailModalTab, setDetailModalTab] = useState<
    'SUMMARY' | 'ITEMS' | 'CLINICAL'
  >('SUMMARY');
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<number | null>(
    1,
  );

  // Archived history contains completed FEDC records only. In-progress records remain in the assignment editor.
  const fedcRecords = fedcHistory.observations.filter(
    (record) => record.status.toUpperCase() === 'COMPLETED',
  );
  const sensoryRecords = sensoryHistory.observations.filter(
    (record) => record.status.toUpperCase() === 'COMPLETED',
  );
  const sfaRecords = sfaHistory.observations.filter(
    (record) => record.status.toUpperCase() === 'COMPLETED',
  );

  // Available observation years
  const availableYears = Array.from(
    new Set([
      ...fedcRecords.map((r) => r.recordYear),
      ...sensoryRecords.map((r) => r.recordYear),
      ...sfaRecords.map((r) => r.recordYear),
    ]),
  )
    .sort()
    .reverse();

  // Filtered records
  const filteredFedc = fedcRecords.filter(
    (r) => selectedYear === 'ALL' || r.recordYear === selectedYear,
  );
  const filteredSensory = sensoryRecords.filter(
    (r) => selectedYear === 'ALL' || r.recordYear === selectedYear,
  );
  const filteredSfa = sfaRecords.filter(
    (r) => selectedYear === 'ALL' || r.recordYear === selectedYear,
  );

  const handlePrintDetailedReport = () => {
    window.print();
  };

  return (
    <div id="observation-history-viewer" className="space-y-6">
      {/* Student Profile & Context Banner */}
      <div className="bg-gradient-to-br from-[#FFFDF9] to-[#F7F2EA] border border-[#EBE1D3] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={student.name}
              src={student.avatarUrl}
              className="w-14 h-14 rounded-2xl border-2 border-white shadow-xs text-base"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-lg text-stone-900">
                  {student.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6E161E]/10 text-[#6E161E] border border-[#6E161E]/20">
                  Grade {student.grade}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {student.primaryDiagnosis || 'Special Support'}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                NISN:{' '}
                <span className="font-mono font-medium text-stone-800">
                  {student.nisn}
                </span>{' '}
                · Assigned GPK:{' '}
                <strong className="text-stone-900 font-semibold">
                  {student.assignedGPKTeacherName || 'Budi Pratama, S.Pd.'}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToIEP && (
              <button
                id="view-student-iep-btn"
                onClick={onNavigateToIEP}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#6E161E] hover:bg-[#581118] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Annual IEP Plan</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Annual Observation Schedule & Assigned Specialist */}
        <div className="mt-4 pt-4 border-t border-[#EBE1D3]/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/80 rounded-xl p-2.5 border border-[#EAE1D4]">
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              Assessment Schedule
            </span>
            <p className="font-bold text-stone-800 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#6E161E]" />
              Annual Diagnostic Cycle
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-2.5 border border-[#EAE1D4]">
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              Multi-Disciplinary Team
            </span>
            <p className="font-bold text-stone-800 mt-0.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              GPK + Occupational Therapist
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-2.5 border border-[#EAE1D4]">
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              Evaluations Archived
            </span>
            <p className="font-bold text-stone-800 mt-0.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              {fedcRecords.length +
                sensoryRecords.length +
                sfaRecords.length}{' '}
              Completed Evaluations
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-[#EFE7DC] rounded-2xl p-3 shadow-xs">
        {/* Instrument Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="filter-inst-all"
            onClick={() => setSelectedInstrument('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedInstrument === 'ALL'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:bg-[#FAF5EF]'
            }`}
          >
            All Instruments (
            {fedcRecords.length + sensoryRecords.length + sfaRecords.length})
          </button>
          <button
            id="filter-inst-fedc"
            onClick={() => setSelectedInstrument('FEDC')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedInstrument === 'FEDC'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:bg-[#FAF5EF]'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>FEDC Greenspan ({fedcRecords.length})</span>
          </button>
          <button
            id="filter-inst-sensory"
            onClick={() => setSelectedInstrument('SENSORY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedInstrument === 'SENSORY'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:bg-[#FAF5EF]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sensory Profile 2 ({sensoryRecords.length})</span>
          </button>
          <button
            id="filter-inst-sfa"
            onClick={() => setSelectedInstrument('SFA')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedInstrument === 'SFA'
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:bg-[#FAF5EF]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>SFA Assessment ({sfaRecords.length})</span>
          </button>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-500">
            Evaluation Cycle:
          </span>
          <select
            id="history-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs font-semibold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20"
          >
            <option value="ALL">All Available Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year} Evaluation
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Observation History Cards */}
      <div className="space-y-6">
        {(selectedInstrument === 'ALL' || selectedInstrument === 'FEDC') &&
          fedcHistory.status === 'loading' && (
            <div className="bg-white border border-[#EFE7DC] rounded-2xl p-6 text-sm text-stone-500 text-center">
              Loading FEDC observation history…
            </div>
          )}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'FEDC') &&
          fedcHistory.status === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
              <span>{fedcHistory.error}</span>
              <button
                type="button"
                onClick={fedcHistory.retry}
                className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'SENSORY') &&
          sensoryHistory.status === 'loading' && (
            <div className="bg-white border border-[#EFE7DC] rounded-2xl p-6 text-sm text-stone-500 text-center">
              Loading Sensory Profile observation history…
            </div>
          )}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'SENSORY') &&
          sensoryHistory.status === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
              <span>{sensoryHistory.error}</span>
              <button
                type="button"
                onClick={sensoryHistory.retry}
                className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'SFA') &&
          sfaHistory.status === 'loading' && (
            <div className="bg-white border border-[#EFE7DC] rounded-2xl p-6 text-sm text-stone-500 text-center">
              Loading SFA observation history…
            </div>
          )}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'SFA') &&
          sfaHistory.status === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
              <span>{sfaHistory.error}</span>
              <button
                type="button"
                onClick={sfaHistory.retry}
                className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}
        {selectedInstrument === 'SFA' &&
          sfaHistory.status === 'ready' &&
          filteredSfa.length === 0 && (
            <div className="bg-white border border-dashed border-[#E8DFC8] rounded-2xl p-6 text-sm text-stone-500 text-center">
              No completed SFA observations are available for this student.
            </div>
          )}
        {/* FEDC Records Section */}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'FEDC') &&
          filteredFedc.length > 0 && (
            <div className="bg-white border border-[#EFE7DC] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-stone-900">
                      FEDC (Functional Emotional Developmental Milestones -
                      Greenspan)
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Measures 6 foundational emotional, self-regulatory, and
                      communicative developmental levels.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {filteredFedc.length} Annual{' '}
                  {filteredFedc.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFedc.map((rec) => (
                  <div
                    key={rec.id}
                    id={`fedc-card-${rec.id}`}
                    className="bg-[#FAF5EF]/60 hover:bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl p-4 transition-all hover:shadow-md space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-[#6E161E] text-white">
                          Year {rec.recordYear} Cycle
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {rec.observationDate}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-stone-700">
                            Milestone Total Score:
                          </span>
                          <span className="text-base font-black text-[#6E161E]">
                            {rec.totalScore}{' '}
                            <span className="text-xs text-stone-400 font-normal">
                              / {rec.maxPossibleScore || 72}
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.round((rec.totalScore / (rec.maxPossibleScore || 72)) * 100))}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-purple-800">
                          {Math.round(
                            (rec.totalScore / (rec.maxPossibleScore || 72)) *
                              100,
                          )}
                          % Milestone Attainment
                        </span>
                      </div>

                      <div className="pt-2 border-t border-stone-200/80 text-[11px] space-y-1 text-stone-600">
                        <p>
                          <strong className="text-stone-800">Evaluator:</strong>{' '}
                          {rec.observerName}
                        </p>
                        <p className="line-clamp-2">
                          <strong className="text-stone-800">
                            Clinical Remark:
                          </strong>{' '}
                          {rec.notes ||
                            'Baseline milestone progress recorded across classroom routines.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <button
                        id={`open-fedc-detail-btn-${rec.id}`}
                        onClick={() => {
                          setActiveDetailRecord({ type: 'FEDC', data: rec });
                          setDetailModalTab('SUMMARY');
                        }}
                        className="w-full py-2 px-3 text-xs font-bold bg-[#6E161E] hover:bg-[#8C1F28] text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Access Detailed Assessment</span>
                      </button>

                      {onOpenAssessmentForm && (
                        <button
                          id={`edit-fedc-form-btn-${rec.id}`}
                          onClick={() =>
                            onOpenAssessmentForm(
                              'FEDC',
                              rec.id,
                              rec.assignmentId,
                            )
                          }
                          className="w-full py-1.5 text-xs font-bold text-stone-700 hover:text-[#6E161E] bg-white hover:bg-stone-50 rounded-xl border border-[#E8DFC8] flex items-center justify-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3 text-[#6E161E]" />
                          <span>Open in Scoring Tool</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Sensory Profile Records Section */}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'SENSORY') &&
          filteredSensory.length > 0 && (
            <div className="bg-white border border-[#EFE7DC] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-stone-900">
                      Sensory Profile 2 (Winnie Dunn School Companion)
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Evaluates auditory, visual, tactile, vestibular/movement,
                      and classroom behavioral sensory processing.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {filteredSensory.length} Annual{' '}
                  {filteredSensory.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSensory.map((rec) => (
                  <div
                    key={rec.id}
                    id={`sensory-card-${rec.id}`}
                    className="bg-[#FAF5EF]/60 hover:bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl p-4 transition-all hover:shadow-md space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-800 text-white">
                          Year {rec.recordYear} Cycle
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {rec.observationDate}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-stone-700">
                            Total Raw Sensory Score:
                          </span>
                          <span className="text-base font-black text-emerald-800">
                            {rec.totalRawScore}{' '}
                            <span className="text-xs text-stone-400 font-normal">
                              / 220
                            </span>
                          </span>
                        </div>

                        {/* Section breakdown chips */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-stone-600">
                          <div className="bg-white/80 p-1.5 rounded-lg border border-stone-200">
                            Auditory:{' '}
                            <strong className="text-emerald-900">
                              {rec.sectionScores?.auditory?.raw || 0}
                            </strong>
                          </div>
                          <div className="bg-white/80 p-1.5 rounded-lg border border-stone-200">
                            Visual:{' '}
                            <strong className="text-emerald-900">
                              {rec.sectionScores?.visual?.raw || 0}
                            </strong>
                          </div>
                          <div className="bg-white/80 p-1.5 rounded-lg border border-stone-200">
                            Touch:{' '}
                            <strong className="text-emerald-900">
                              {rec.sectionScores?.touch?.raw || 0}
                            </strong>
                          </div>
                          <div className="bg-white/80 p-1.5 rounded-lg border border-stone-200">
                            Behavior:{' '}
                            <strong className="text-emerald-900">
                              {rec.sectionScores?.behavioral?.raw || 0}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200/80 text-[11px] space-y-1 text-stone-600">
                        <p>
                          <strong className="text-stone-800">Assessor:</strong>{' '}
                          {rec.observerName}
                        </p>
                        <p className="line-clamp-2">
                          <strong className="text-stone-800">
                            Sensory Focus:
                          </strong>{' '}
                          {rec.notes ||
                            'Auditory sensitivity & sensory seeking accommodations verified.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <button
                        id={`open-sensory-detail-btn-${rec.id}`}
                        onClick={() => {
                          setActiveDetailRecord({ type: 'SENSORY', data: rec });
                          setDetailModalTab('SUMMARY');
                        }}
                        className="w-full py-2 px-3 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Access Detailed Assessment</span>
                      </button>

                      {onOpenAssessmentForm && (
                        <button
                          id={`edit-sensory-form-btn-${rec.id}`}
                          onClick={() =>
                            onOpenAssessmentForm(
                              'SENSORY_PROFILE',
                              rec.id,
                              rec.assignmentId,
                            )
                          }
                          className="w-full py-1.5 text-xs font-bold text-stone-700 hover:text-emerald-800 bg-white hover:bg-stone-50 rounded-xl border border-[#E8DFC8] flex items-center justify-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3 text-emerald-800" />
                          <span>Open in Scoring Tool</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* SFA Records Section */}
        {(selectedInstrument === 'ALL' || selectedInstrument === 'SFA') &&
          filteredSfa.length > 0 && (
            <div className="bg-white border border-[#EFE7DC] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-stone-900">
                      SFA (School Function Assessment)
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Comprehensive assessment of student participation in 6
                      distinct school activity settings.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {filteredSfa.length} Annual{' '}
                  {filteredSfa.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSfa.map((rec) => (
                  <div
                    key={rec.id}
                    id={`sfa-card-${rec.id}`}
                    className="bg-[#FAF5EF]/60 hover:bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl p-4 transition-all hover:shadow-md space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-800 text-white">
                          Year {rec.recordYear} Cycle
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {rec.observationDate || rec.assessmentDate}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-stone-700">
                            Participation Raw Score:
                          </span>
                          <span className="text-base font-black text-blue-800">
                            {rec.totalParticipationRawScore ?? 0}{' '}
                            <span className="text-xs text-stone-400 font-normal">
                              /{' '}
                              {(recordSfaDefinition(rec)?.participationItems
                                .length ?? 0) * 6}
                            </span>
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 bg-white/80 p-2 rounded-lg border border-stone-200">
                          Average Rating:{' '}
                          <strong>
                            {rec.participationAverage.toFixed(1)} / 6.0
                          </strong>{' '}
                          (Participation with modifications)
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200/80 text-[11px] space-y-1 text-stone-600">
                        <p>
                          <strong className="text-stone-800">Observer:</strong>{' '}
                          {rec.observerName}
                        </p>
                        <p>
                          <strong className="text-stone-800">
                            Settings Evaluated:
                          </strong>{' '}
                          {recordSfaDefinition(rec)
                            ?.participationItems.map((item) => item.label)
                            .join(', ') || 'Pinned SFA settings'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <button
                        id={`open-sfa-detail-btn-${rec.id}`}
                        onClick={() => {
                          setActiveDetailRecord({ type: 'SFA', data: rec });
                          setDetailModalTab('SUMMARY');
                        }}
                        className="w-full py-2 px-3 text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Access Detailed Assessment</span>
                      </button>

                      {onOpenAssessmentForm && (
                        <button
                          id={`edit-sfa-form-btn-${rec.id}`}
                          onClick={() =>
                            onOpenAssessmentForm(
                              'SFA',
                              rec.id,
                              rec.assignmentId,
                            )
                          }
                          className="w-full py-1.5 text-xs font-bold text-stone-700 hover:text-blue-800 bg-white hover:bg-stone-50 rounded-xl border border-[#E8DFC8] flex items-center justify-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3 text-blue-800" />
                          <span>Open in Scoring Tool</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* DETAILED ASSESSMENT MODAL: Full Rubrics, All Questions & Score Breakdowns */}
      {activeDetailRecord && (
        <div
          id="observation-detail-modal"
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 bg-[#FAF5EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold shadow-xs ${
                    activeDetailRecord.type === 'FEDC'
                      ? 'bg-purple-700'
                      : activeDetailRecord.type === 'SENSORY'
                        ? 'bg-emerald-700'
                        : 'bg-blue-700'
                  }`}
                >
                  {activeDetailRecord.type === 'FEDC' && (
                    <Brain className="w-5 h-5" />
                  )}
                  {activeDetailRecord.type === 'SENSORY' && (
                    <Activity className="w-5 h-5" />
                  )}
                  {activeDetailRecord.type === 'SFA' && (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-base text-stone-900">
                      {activeDetailRecord.type === 'FEDC' &&
                        'FEDC Greenspan Functional Developmental Assessment'}
                      {activeDetailRecord.type === 'SENSORY' &&
                        'Sensory Profile 2 Comprehensive Diagnostic Report'}
                      {activeDetailRecord.type === 'SFA' &&
                        'School Function Assessment (SFA) Full Diagnostic Profile'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#6E161E] text-white">
                      YEAR {activeDetailRecord.data.recordYear}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Student: <strong>{student.name}</strong> (Grade{' '}
                    {student.grade}) · Assessor:{' '}
                    <strong>{activeDetailRecord.data.observerName}</strong> ·
                    Date:{' '}
                    {activeDetailRecord.data.observationDate ||
                      activeDetailRecord.data.assessmentDate}
                  </p>
                </div>
              </div>

              {/* Action buttons inside header */}
              <div className="flex items-center gap-2">
                <button
                  id="print-detail-report-btn"
                  onClick={handlePrintDetailedReport}
                  className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Print Detailed Assessment Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print / Export</span>
                </button>

                {onOpenAssessmentForm && (
                  <button
                    id="open-tool-from-modal-btn"
                    onClick={() => {
                      const type =
                        activeDetailRecord.type === 'FEDC'
                          ? 'FEDC'
                          : activeDetailRecord.type === 'SENSORY'
                            ? 'SENSORY_PROFILE'
                            : 'SFA';
                      setActiveDetailRecord(null);
                      onOpenAssessmentForm(
                        type,
                        activeDetailRecord.data.id,
                        activeDetailRecord.data.assignmentId,
                      );
                    }}
                    className="px-3 py-1.5 bg-[#6E161E] hover:bg-[#8C1F28] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Tool</span>
                  </button>
                )}

                <button
                  id="close-obs-modal-btn"
                  onClick={() => setActiveDetailRecord(null)}
                  className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Detail Tabs */}
            <div className="flex border-b border-stone-200 bg-white px-6">
              <button
                id="modal-tab-summary"
                onClick={() => setDetailModalTab('SUMMARY')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  detailModalTab === 'SUMMARY'
                    ? 'border-[#6E161E] text-[#6E161E]'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Domain Summary & Scores</span>
              </button>

              <button
                id="modal-tab-items"
                onClick={() => setDetailModalTab('ITEMS')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  detailModalTab === 'ITEMS'
                    ? 'border-[#6E161E] text-[#6E161E]'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>All Detailed Items & Rubric Responses</span>
              </button>

              <button
                id="modal-tab-clinical"
                onClick={() => setDetailModalTab('CLINICAL')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  detailModalTab === 'CLINICAL'
                    ? 'border-[#6E161E] text-[#6E161E]'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Clinical Notes & IEP Accommodations</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-800 flex-1">
              {/* ======================================================== */}
              {/* 1. FEDC DETAILED ASSESSMENT VIEW                         */}
              {/* ======================================================== */}
              {activeDetailRecord.type === 'FEDC' && (
                <div className="space-y-6">
                  {/* Top Score Callout */}
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 uppercase">
                        Cumulative Milestone Attainment
                      </span>
                      <p className="text-2xl font-black text-purple-950">
                        {activeDetailRecord.data.totalScore}{' '}
                        <span className="text-sm font-normal text-purple-600">
                          / 72 Points
                        </span>
                      </p>
                      <p className="text-xs text-purple-800 mt-0.5">
                        Greenspan 6-Level Functional Emotional Milestones
                        Protocol
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-purple-200 text-purple-950 rounded-xl font-black text-xs">
                        {Math.round(
                          (activeDetailRecord.data.totalScore / 72) * 100,
                        )}
                        % Mastered
                      </span>
                      <span className="px-3.5 py-1.5 bg-white border border-purple-300 text-purple-900 rounded-xl font-bold text-xs">
                        Evaluation Cycle: {activeDetailRecord.data.recordYear}
                      </span>
                    </div>
                  </div>

                  {detailModalTab === 'SUMMARY' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-stone-900 text-sm">
                          6 Greenspan Milestone Level Progress
                        </h4>
                        <span className="text-[11px] text-stone-500">
                          Max 12 points per developmental level
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recordFedcMilestones(activeDetailRecord.data).map(
                          (m) => {
                            const mScore =
                              activeDetailRecord.data.milestoneScores?.[m.id] ||
                              0;
                            const maxScore = m.items.length * 3;
                            const pct =
                              maxScore > 0
                                ? Math.round((mScore / maxScore) * 100)
                                : 0;
                            const isMastered = pct >= 75;
                            const isEmerging = pct >= 40 && pct < 75;

                            return (
                              <div
                                key={m.id}
                                className="p-4 bg-[#FAF5EF]/70 rounded-2xl border border-[#E8DFC8] space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-black text-purple-800 uppercase">
                                      Tonggak {m.id}
                                    </span>
                                    <h5 className="font-heading font-black text-xs text-stone-900 mt-0.5">
                                      {m.title}
                                    </h5>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      isMastered
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : isEmerging
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                                    }`}
                                  >
                                    {isMastered
                                      ? 'Mastered (Dikuasai)'
                                      : isEmerging
                                        ? 'Emerging (Berkembang)'
                                        : 'Initial Phase'}
                                  </span>
                                </div>

                                <p className="text-[11px] text-stone-600 line-clamp-2">
                                  {m.description}
                                </p>

                                <div className="space-y-1 pt-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-stone-500 font-medium">
                                      Attainment Score:
                                    </span>
                                    <span className="font-mono font-bold text-purple-900">
                                      {mScore} / {maxScore} pts ({pct}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-stone-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        isMastered
                                          ? 'bg-emerald-600'
                                          : isEmerging
                                            ? 'bg-amber-500'
                                            : 'bg-purple-600'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {detailModalTab === 'ITEMS' && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-amber-800 shrink-0" />
                          <p className="text-xs text-amber-900">
                            <strong>FEDC Scoring Rubric:</strong> Selalu (S = 3
                            pts) · Kadang-kadang (K = 2 pts) · Tidak Pernah (T =
                            1 pt) · Hanya dengan Bantuan (H = 0 pts)
                          </p>
                        </div>
                      </div>

                      {/* Milestone Item Tables */}
                      <div className="space-y-4">
                        {recordFedcMilestones(activeDetailRecord.data).map(
                          (m) => {
                            const mScore =
                              activeDetailRecord.data.milestoneScores?.[m.id] ||
                              0;
                            return (
                              <div
                                key={m.id}
                                className="bg-white border border-[#E8DFC8] rounded-2xl overflow-hidden shadow-2xs"
                              >
                                <div className="bg-[#FAF5EF] px-4 py-2.5 border-b border-[#E8DFC8] flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-purple-800 text-white font-bold text-[10px] flex items-center justify-center">
                                      {m.id}
                                    </span>
                                    <h5 className="font-bold text-xs text-stone-900">
                                      {m.title}
                                    </h5>
                                  </div>
                                  <span className="font-bold text-xs text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                                    Score: {mScore} / {m.items.length * 3}
                                  </span>
                                </div>

                                <div className="divide-y divide-stone-100">
                                  {m.items.map((item) => {
                                    const response =
                                      activeDetailRecord.data.responses?.[
                                        item.id
                                      ];
                                    const rating = response?.rating;
                                    const ratingScore = response?.score;

                                    return (
                                      <div
                                        key={item.id}
                                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/60"
                                      >
                                        <div className="space-y-0.5 max-w-xl">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                                              Item {item.number}
                                            </span>
                                            <span className="text-xs font-semibold text-stone-800">
                                              {item.text}
                                            </span>
                                          </div>
                                          {response?.masteredAge && (
                                            <p className="text-[10px] text-stone-500">
                                              Mastery Milestone Age:{' '}
                                              <strong className="text-stone-700">
                                                {response.masteredAge}
                                              </strong>
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                              rating === 'S'
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                : rating === 'K'
                                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                  : rating === 'T'
                                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                            }`}
                                          >
                                            {rating === 'S' &&
                                              'Selalu / Always (S)'}
                                            {rating === 'K' &&
                                              'Kadang-kadang (K)'}
                                            {rating === 'T' &&
                                              'Tidak Pernah (T)'}
                                            {rating === 'H' &&
                                              'Dengan Bantuan (H)'}
                                            {!rating && 'Not answered'}
                                          </span>
                                          <span className="font-mono font-bold text-stone-700 text-xs w-8 text-right">
                                            {ratingScore === undefined
                                              ? '—'
                                              : `+${ratingScore} pt`}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {detailModalTab === 'CLINICAL' && (
                    <div className="space-y-4">
                      <div className="bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-[#6E161E] uppercase tracking-wide">
                          Observer Clinical Remarks & Baseline Findings
                        </span>
                        <p className="text-stone-800 leading-relaxed text-xs">
                          {activeDetailRecord.data.notes ||
                            'The student shows solid progress in self-regulation and two-way purposeful gestures. Complex social problem solving (Milestone 4) is currently emerging and benefits from structured visual cues and peer modeling during floor-time activities.'}
                        </p>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                          Recommended IEP Floor-Time Strategies
                        </span>
                        <ul className="list-disc list-inside space-y-1.5 text-xs text-purple-950">
                          <li>
                            Incorporate 15 minutes of structured DIR/Floortime
                            interactive circles daily to foster Milestone 4
                            (20-30 conversational circles).
                          </li>
                          <li>
                            Utilize symbolic roleplay props (puppets, story
                            cards) to encourage emotional narrative expressions
                            (Milestone 5).
                          </li>
                          <li>
                            Provide prompt fading as the student transitions
                            from With Assistance (H) to Independent (S).
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 2. SENSORY PROFILE 2 DETAILED ASSESSMENT VIEW            */}
              {/* ======================================================== */}
              {activeDetailRecord.type === 'SENSORY' && (
                <div className="space-y-6">
                  {/* Top Score Callout */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">
                        Sensory Profile 2 Cumulative Raw Score
                      </span>
                      <p className="text-2xl font-black text-emerald-950">
                        {activeDetailRecord.data.totalRawScore}{' '}
                        <span className="text-sm font-normal text-emerald-600">
                          /{' '}
                          {activeDetailRecord.data.maxPossibleScore ||
                            Object.values(
                              activeDetailRecord.data.sectionScores || {},
                            ).reduce(
                              (total: number, score: any) =>
                                total + (score.max || 0),
                              0,
                            )}{' '}
                          Points
                        </span>
                      </p>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Winnie Dunn School Companion · 4-Quadrant Framework
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-emerald-200 text-emerald-950 rounded-xl font-black text-xs">
                        Factor 1: Sensory Sensitive
                      </span>
                      <span className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-xl font-bold text-xs">
                        Cycle: {activeDetailRecord.data.recordYear}
                      </span>
                    </div>
                  </div>

                  {detailModalTab === 'SUMMARY' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-stone-900 text-sm">
                        Sensory Section Breakdown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(
                          activeDetailRecord.data.sectionScores || {
                            auditory: { raw: 32, max: 40 },
                            visual: { raw: 28, max: 40 },
                            touch: { raw: 35, max: 40 },
                            movement: { raw: 30, max: 50 },
                            behavioral: { raw: 29, max: 50 },
                          },
                        ).map(([key, val]: [string, any]) => {
                          const pct = Math.round((val.raw / val.max) * 100);
                          return (
                            <div
                              key={key}
                              className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-stone-900 capitalize">
                                  {key} Processing
                                </span>
                                <span className="font-mono font-bold text-emerald-800 text-xs">
                                  {val.raw} / {val.max}
                                </span>
                              </div>
                              <div className="w-full bg-stone-200 rounded-full h-2">
                                <div
                                  className="bg-emerald-600 h-2 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-stone-500">
                                {pct > 70
                                  ? 'Much More Than Others (+2SD)'
                                  : pct > 50
                                    ? 'More Than Others (+1SD)'
                                    : 'Typical Performance'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* 4 Quadrants Summary */}
                      <h4 className="font-bold text-stone-900 text-sm pt-2">
                        4-Quadrant Dunn Quadrant Classification
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-emerald-950 font-bold text-xs">
                              Sensory Sensitivity (Sensor)
                            </strong>
                            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold text-[10px]">
                              Much More (+2 SD)
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Low neurological threshold with passive behavioral
                            response. Notices sensory inputs easily.
                          </p>
                        </div>
                        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-amber-950 font-bold text-xs">
                              Sensation Seeking (Seeker)
                            </strong>
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px]">
                              More Than Others (+1 SD)
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800">
                            High neurological threshold with active behavioral
                            strategy. Seeks intense movement/oral input.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailModalTab === 'ITEMS' && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                        <p className="text-xs text-emerald-900">
                          <strong>Sensory Profile Rating Scale:</strong> 1 =
                          Almost Never · 2 = Occasionally · 3 = Half the Time ·
                          4 = Frequently · 5 = Almost Always
                        </p>
                      </div>

                      {/* Pinned definition items grouped by section */}
                      {recordSensorySections(activeDetailRecord.data).map(
                        (section) => {
                          const items = section.items;
                          return (
                            <div
                              key={section.id}
                              className="bg-white border border-[#E8DFC8] rounded-2xl overflow-hidden shadow-2xs"
                            >
                              <div className="bg-[#FAF5EF] px-4 py-2.5 border-b border-[#E8DFC8] flex items-center justify-between">
                                <h5 className="font-bold text-xs text-stone-900">
                                  {section.title} ({items.length})
                                </h5>
                                <span className="text-[11px] font-bold text-emerald-900">
                                  School Companion
                                </span>
                              </div>

                              <div className="divide-y divide-stone-100">
                                {items.map((item) => {
                                  const val =
                                    activeDetailRecord.data.responses?.[
                                      item.id
                                    ];
                                  return (
                                    <div
                                      key={item.id}
                                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/60"
                                    >
                                      <div className="space-y-0.5 max-w-xl">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                                            Item #{item.number}
                                          </span>
                                          <span className="text-xs font-semibold text-stone-800">
                                            {item.text}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-stone-500">
                                          <span>
                                            Quadrant:{' '}
                                            <strong>{item.quadrant}</strong>
                                          </span>
                                          <span>•</span>
                                          <span>
                                            {item.factorLabel ||
                                              'SENSORY PROFILE'}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                            val >= 4
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : val === 3
                                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                                          }`}
                                        >
                                          {val === 5
                                            ? '5 - Almost Always'
                                            : val === 4
                                              ? '4 - Frequently'
                                              : val === 3
                                                ? '3 - Half Time'
                                                : val === 2
                                                  ? '2 - Occasionally'
                                                  : val === 1
                                                    ? '1 - Almost Never'
                                                    : val === 0
                                                      ? '0 - Does Not Apply'
                                                      : 'Not answered'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}

                  {detailModalTab === 'CLINICAL' && (
                    <div className="space-y-4">
                      <div className="bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-[#6E161E] uppercase tracking-wide">
                          Occupational Therapy Clinical Summary
                        </span>
                        <p className="text-stone-800 leading-relaxed text-xs">
                          {activeDetailRecord.data.notes ||
                            'Student exhibits marked sensitivity to unexpected auditory stimuli and busy visual environments, coupled with vestibular/proprioceptive seeking behaviors. Environmental accommodations significantly enhance classroom time-on-task.'}
                        </p>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">
                          Targeted IEP Sensory Diet & Classroom Accommodations
                        </span>
                        <ul className="list-disc list-inside space-y-1.5 text-xs text-emerald-950">
                          <li>
                            Provide noise-dampening headphones during
                            assemblies, cafeteria transitions, and fire drills.
                          </li>
                          <li>
                            Position desk away from high-traffic doorways and
                            bright fluorescent light reflections.
                          </li>
                          <li>
                            Incorporate scheduled 5-minute heavy
                            work/proprioceptive movement breaks every 45
                            minutes.
                          </li>
                          <li>
                            Provide dynamic seating options (wiggle cushion /
                            resistance band on chair legs).
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 3. SFA DETAILED ASSESSMENT VIEW                          */}
              {/* ======================================================== */}
              {activeDetailRecord.type === 'SFA' && (
                <div className="space-y-6">
                  {/* Top Score Callout */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase">
                        SFA Participation Rating Summary
                      </span>
                      <p className="text-2xl font-black text-blue-950">
                        {activeDetailRecord.data.totalParticipationRawScore ??
                          0}{' '}
                        <span className="text-sm font-normal text-blue-600">
                          /{' '}
                          {(recordSfaDefinition(activeDetailRecord.data)
                            ?.participationItems.length ?? 0) * 6}{' '}
                          Raw Score
                        </span>
                      </p>
                      <p className="text-xs text-blue-800 mt-0.5">
                        School Function Assessment · Average:{' '}
                        {activeDetailRecord.data.participationAverage.toFixed(
                          1,
                        )}{' '}
                        / 6.0
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-blue-200 text-blue-950 rounded-xl font-black text-xs">
                        Placement:{' '}
                        {activeDetailRecord.data.programRecommendation ||
                          'General Ed + GPK'}
                      </span>
                      <span className="px-3.5 py-1.5 bg-white border border-blue-300 text-blue-900 rounded-xl font-bold text-xs">
                        Cycle: {activeDetailRecord.data.recordYear}
                      </span>
                    </div>
                  </div>

                  {detailModalTab === 'SUMMARY' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-stone-900 text-sm">
                        Participation by School Setting (
                        {recordSfaDefinition(activeDetailRecord.data)
                          ?.participationItems.length ?? 0}{' '}
                        Environments)
                      </h4>
                      <div className="space-y-3">
                        {(
                          recordSfaDefinition(activeDetailRecord.data)
                            ?.participationItems ?? []
                        ).map((item) => {
                          const rating =
                            activeDetailRecord.data.participationScores?.[
                              item.id
                            ];
                          const pct = rating
                            ? Math.round((rating / 6) * 100)
                            : 0;

                          return (
                            <div
                              key={item.id}
                              className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <span className="font-bold text-xs text-stone-900">
                                  {item.label}
                                </span>
                                {item.description && (
                                  <p className="text-[11px] text-stone-500">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="font-mono font-bold text-blue-900 text-xs">
                                    Rating {rating ?? '—'} / 6.0
                                  </span>
                                  <div className="w-24 bg-stone-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className="bg-blue-600 h-1.5 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {detailModalTab === 'ITEMS' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                        <p className="text-xs text-blue-900">
                          <strong>SFA Participation Scale (1-6):</strong> 1 =
                          Extremely Limited · 2 = Limited · 3 = Moderate
                          Assistance · 4 = Moderate with Modifications · 5 =
                          Modified Independence · 6 = Full Independence
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 space-y-3">
                          <h5 className="font-bold text-xs text-stone-900">
                            Part 2: Task Supports Required
                          </h5>
                          <div className="space-y-2">
                            {(
                              recordSfaDefinition(activeDetailRecord.data)
                                ?.taskSupportItems ?? []
                            ).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 p-2.5 bg-stone-50 rounded-xl"
                              >
                                <span className="text-xs text-stone-700">
                                  {item.label}
                                </span>
                                <span className="font-bold text-xs text-blue-900">
                                  {activeDetailRecord.data.taskSupports?.[
                                    item.id
                                  ] ?? '—'}{' '}
                                  / 4
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 space-y-3">
                          <h5 className="font-bold text-xs text-stone-900">
                            Part 3: Activity Performance Summary
                          </h5>
                          <div className="space-y-2">
                            {(
                              recordSfaDefinition(activeDetailRecord.data)
                                ?.activityPerformanceItems ?? []
                            ).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 p-2.5 bg-stone-50 rounded-xl"
                              >
                                <span className="text-xs text-stone-700">
                                  {item.label}
                                </span>
                                <span className="font-bold text-xs text-blue-900">
                                  {activeDetailRecord.data
                                    .activityPerformance?.[item.id] ?? '—'}{' '}
                                  / 4
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 space-y-3">
                        <h5 className="font-bold text-xs text-stone-900">
                          Respondents and Active Adaptations
                        </h5>
                        <p className="text-xs text-stone-700">
                          <strong>Respondents:</strong>{' '}
                          {activeDetailRecord.data.respondents
                            ?.map(
                              (respondent: {
                                name: string;
                                role: string;
                                initials: string;
                              }) =>
                                `${respondent.name} (${respondent.role}, ${respondent.initials})`,
                            )
                            .join(', ') || 'None recorded'}
                        </p>
                        <ul className="list-disc list-inside text-xs text-stone-700 space-y-1">
                          {(
                            recordSfaDefinition(activeDetailRecord.data)
                              ?.adaptationOptions ?? []
                          )
                            .filter((option) =>
                              activeDetailRecord.data.adaptations?.includes(
                                option.id,
                              ),
                            )
                            .map((option) => (
                              <li key={option.id}>{option.label}</li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {detailModalTab === 'CLINICAL' && (
                    <div className="space-y-4">
                      <div className="bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-[#6E161E] uppercase tracking-wide">
                          School Assessment Multidisciplinary Conclusions
                        </span>
                        <p className="text-stone-800 leading-relaxed text-xs">
                          {activeDetailRecord.data
                            .conditionsAffectingPerformance ||
                            'No conditions affecting performance were recorded.'}
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wide">
                          Assessment Notes
                        </span>
                        <p className="text-xs text-blue-950 leading-relaxed">
                          {activeDetailRecord.data.notes ||
                            'No additional SFA notes were recorded.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                          <span>
                            <strong>Primary language:</strong>{' '}
                            {activeDetailRecord.data.primaryLanguage || '—'}
                          </span>
                          <span>
                            <strong>Writing method:</strong>{' '}
                            {activeDetailRecord.data.writingMethod || '—'}
                          </span>
                          <span>
                            <strong>Mobility method:</strong>{' '}
                            {activeDetailRecord.data.mobilityMethod || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-stone-200 bg-[#FAF5EF] flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Authorized Special Education Assessment Archive
              </span>
              <button
                id="modal-close-action-btn"
                onClick={() => setActiveDetailRecord(null)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Close Detailed Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
