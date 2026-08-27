import React, { useState } from 'react';
import {
  fedcDefinitionBodySchema,
  sfaDefinitionBodySchema,
} from '@learnspace/contracts';
import { useApp } from '../../context/AppContext';
import { useSFAObservationReference } from '../../hooks/useSFAObservations';
import { useFEDCObservationReference } from '../../hooks/useFEDCObservations';
import { useSensoryProfileObservationReference } from '../../hooks/useSensoryProfileObservations';

import {
  X,
  FileText,
  Activity,
  Brain,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ObservationReferenceDrawerProps {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToFull: (type: 'FEDC' | 'SENSORY_PROFILE' | 'SFA') => void;
}

export const ObservationReferenceDrawer: React.FC<
  ObservationReferenceDrawerProps
> = ({ studentId, isOpen, onClose, onNavigateToFull }) => {
  const [activeTab, setActiveTab] = useState<
    'FEDC' | 'SENSORY_PROFILE' | 'SFA'
  >('FEDC');
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(1);
  const { students, organizationId } = useApp();
  const fedcReference = useFEDCObservationReference(organizationId, studentId, {
    enabled: isOpen,
  });
  const sensoryReference = useSensoryProfileObservationReference(
    organizationId,
    studentId,
    { enabled: isOpen },
  );
  const sfaReference = useSFAObservationReference(organizationId, studentId, {
    enabled: isOpen,
  });

  const student = students.find((candidate) => candidate.id === studentId);
  const latestFedc = fedcReference.reference?.latestObservation || undefined;
  const fedcDefinition = fedcDefinitionBodySchema.safeParse(
    latestFedc?.definition?.body,
  );
  const fedcMilestones = fedcDefinition.success
    ? fedcDefinition.data.milestones
    : [];

  const latestSensory =
    sensoryReference.reference?.latestObservation || undefined;

  const latestSfa =
    sfaReference.reference?.latestObservation?.status.toUpperCase() ===
    'COMPLETED'
      ? sfaReference.reference.latestObservation
      : undefined;
  const parsedSfaDefinition = sfaDefinitionBodySchema.safeParse(
    latestSfa?.definition?.body,
  );
  const sfaDefinition = parsedSfaDefinition.success
    ? parsedSfaDefinition.data
    : undefined;
  const sfaMax = (sfaDefinition?.participationItems.length ?? 0) * 6;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="observation-drawer-backdrop"
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-[#FFFDF9] h-full shadow-2xl flex flex-col border-l border-stone-200"
          onClick={(e) => e.stopPropagation()}
          id="observation-reference-drawer-panel"
        >
          {/* Header */}
          <div className="p-6 border-b border-stone-200 bg-[#FAF5EF] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#6E161E]/10 text-[#6E161E]">
                  Observation Reference Drawer
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  Quick Reference
                </span>
              </div>
              <h2 className="text-xl font-bold text-stone-900 mt-1">
                {student?.fullName}
              </h2>
              <p className="text-xs text-stone-600">
                {student?.grade} · {student?.className} · DOB:{' '}
                {student?.dateOfBirth}
              </p>
            </div>
            <button
              id="observation-drawer-close-btn"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-Tab Selector */}
          <div className="flex border-b border-stone-200 bg-white px-6">
            <button
              id="drawer-tab-fedc"
              onClick={() => setActiveTab('FEDC')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'FEDC'
                  ? 'border-[#6E161E] text-[#6E161E]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Brain className="w-4 h-4" />
              FEDC Milestones
              {latestFedc && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-700 font-semibold">
                  {latestFedc.totalScore}/{latestFedc.maxPossibleScore}
                </span>
              )}
            </button>

            <button
              id="drawer-tab-sensory"
              onClick={() => setActiveTab('SENSORY_PROFILE')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'SENSORY_PROFILE'
                  ? 'border-[#6E161E] text-[#6E161E]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              Sensory Profile
              {latestSensory && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-700 font-semibold">
                  {latestSensory.totalRawScore} pts
                </span>
              )}
            </button>

            <button
              id="drawer-tab-sfa"
              onClick={() => setActiveTab('SFA')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'SFA'
                  ? 'border-[#6E161E] text-[#6E161E]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              SFA Assessment
              {latestSfa && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-700 font-semibold">
                  {latestSfa.totalParticipationRawScore ?? 0}/{sfaMax}
                </span>
              )}
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'FEDC' && (
              <div className="space-y-4">
                {fedcReference.status === 'loading' && (
                  <div className="p-4 rounded-lg border border-stone-200 bg-white text-xs text-stone-500 text-center">
                    Loading FEDC reference…
                  </div>
                )}
                {fedcReference.status === 'error' && (
                  <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center justify-between gap-3">
                    <span>{fedcReference.error}</span>
                    <button
                      type="button"
                      onClick={fedcReference.retry}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
                {fedcReference.status === 'ready' && !latestFedc && (
                  <div className="p-4 rounded-lg border border-dashed border-stone-300 bg-white text-xs text-stone-500 text-center">
                    No FEDC observation is available for this student.
                  </div>
                )}
                {latestFedc && (
                  <div className="flex items-center justify-between bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                    <div>
                      <span className="text-xs font-bold text-amber-900">
                        FEDC Baseline Completed
                      </span>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Observer:{' '}
                        {latestFedc?.observerName || 'Special Ed Coordinator'} ·
                        Date: {latestFedc?.observationDate || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToFull('FEDC');
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#6E161E] hover:underline"
                    >
                      Open Full Form <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {latestFedc?.notes && (
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Clinical Notes
                    </span>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {latestFedc.notes}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Milestone Breakdown ({fedcMilestones.length} Tonggak)
                  </span>
                  {fedcMilestones.map((milestone) => {
                    const score =
                      latestFedc?.milestoneScores?.[milestone.id] || 0;
                    const isExpanded = expandedMilestone === milestone.id;

                    return (
                      <div
                        key={milestone.id}
                        className="border border-stone-200 rounded-lg bg-white overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedMilestone(
                              isExpanded ? null : milestone.id,
                            )
                          }
                          className="w-full flex items-center justify-between p-3.5 text-left hover:bg-stone-50 transition-colors"
                        >
                          <div>
                            <span className="text-xs font-bold text-stone-900">
                              Tonggak {milestone.id}: {milestone.title}
                            </span>
                            <p className="text-[11px] text-stone-500">
                              {milestone.subtitle}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                              {score} / {milestone.maxScore}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-stone-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-stone-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-3.5 bg-stone-50/50 border-t border-stone-100 space-y-2">
                            {milestone.items.map((item) => {
                              const resp = latestFedc?.responses?.[item.id];
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-start justify-between gap-3 text-xs bg-white p-2 rounded border border-stone-200/60"
                                >
                                  <div className="flex-1">
                                    <span className="font-semibold text-stone-800 mr-1.5">
                                      {item.number}
                                    </span>
                                    <span className="text-stone-700">
                                      {item.text}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                        resp?.rating === 'S'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : resp?.rating === 'K'
                                            ? 'bg-amber-100 text-amber-800'
                                            : resp?.rating === 'T'
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-stone-100 text-stone-700'
                                      }`}
                                    >
                                      {resp?.rating || '—'}
                                    </span>
                                    {resp?.masteredAge && (
                                      <span className="text-[10px] text-stone-500">
                                        {resp.masteredAge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'SENSORY_PROFILE' && (
              <div className="space-y-4">
                {sensoryReference.status === 'loading' && (
                  <div className="p-4 rounded-lg border border-stone-200 bg-white text-xs text-stone-500 text-center">
                    Loading Sensory Profile reference…
                  </div>
                )}
                {sensoryReference.status === 'error' && (
                  <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center justify-between gap-3">
                    <span>{sensoryReference.error}</span>
                    <button
                      type="button"
                      onClick={sensoryReference.retry}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
                {sensoryReference.status === 'ready' && !latestSensory && (
                  <div className="p-4 rounded-lg border border-dashed border-stone-300 bg-white text-xs text-stone-500 text-center">
                    No Sensory Profile observation is available for this
                    student.
                  </div>
                )}
                {latestSensory && (
                  <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                    <div>
                      <span className="text-xs font-bold text-emerald-900">
                        Sensory Profile Completed
                      </span>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Observer:{' '}
                        {latestSensory?.observerName ||
                          'Special Ed Coordinator'}{' '}
                        · Date: {latestSensory?.observationDate || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToFull('SENSORY_PROFILE');
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#6E161E] hover:underline"
                    >
                      Open Full Form <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {latestSensory?.notes && (
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Sensory Assessment Summary
                    </span>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {latestSensory.notes}
                    </p>
                  </div>
                )}

                {latestSensory && (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(latestSensory.sectionScores).map(
                      ([sectionId, score]: [
                        string,
                        { raw: number; max: number },
                      ]) => (
                        <div
                          key={sectionId}
                          className="p-3 bg-white border border-stone-200 rounded-lg"
                        >
                          <span className="text-xs text-stone-500 font-medium capitalize">
                            {sectionId.replaceAll('_', ' ')}
                          </span>
                          <div className="text-lg font-bold text-stone-900 mt-0.5">
                            {score.raw}{' '}
                            <span className="text-xs text-stone-400 font-normal">
                              / {score.max}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'SFA' && (
              <div className="space-y-4">
                {sfaReference.status === 'loading' && (
                  <div className="p-4 rounded-lg border border-stone-200 bg-white text-xs text-stone-500 text-center">
                    Loading SFA reference…
                  </div>
                )}
                {sfaReference.status === 'error' && (
                  <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center justify-between gap-3">
                    <span>{sfaReference.error}</span>
                    <button
                      type="button"
                      onClick={sfaReference.retry}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
                {sfaReference.status === 'ready' && !latestSfa && (
                  <div className="p-4 rounded-lg border border-dashed border-stone-300 bg-white text-xs text-stone-500 text-center">
                    No completed SFA observation is available for this student.
                  </div>
                )}
                {latestSfa && (
                  <div className="flex items-center justify-between bg-purple-50/70 p-3 rounded-lg border border-purple-200">
                    <div>
                      <span className="text-xs font-bold text-purple-900">
                        SFA Assessment Completed
                      </span>
                      <p className="text-xs text-purple-700 mt-0.5">
                        Observer:{' '}
                        {latestSfa?.observerName || 'Special Ed Coordinator'} ·
                        Date: {latestSfa?.assessmentDate || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToFull('SFA');
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#6E161E] hover:underline"
                    >
                      Open Full Form <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* SFA Key Metrics */}
                {latestSfa && (
                  <div className="p-4 bg-white border border-stone-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                      <span className="text-xs text-stone-600 font-medium">
                        Part 1 Participation Average
                      </span>
                      <span className="text-sm font-bold text-stone-900">
                        {latestSfa.participationAverage.toFixed(1)} / 6.0
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                      <span className="text-xs text-stone-600 font-medium">
                        Participation Raw Score
                      </span>
                      <span className="text-xs font-semibold text-stone-800">
                        {latestSfa.totalParticipationRawScore ?? 0} / {sfaMax}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-stone-600 font-medium">
                        Respondents
                      </span>
                      <span className="text-xs font-semibold text-stone-800">
                        {latestSfa.respondents.length}
                      </span>
                    </div>
                  </div>
                )}

                {latestSfa && sfaDefinition && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Participation Settings
                    </span>
                    {sfaDefinition.participationItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 text-xs"
                      >
                        <div>
                          <strong className="text-stone-800">
                            {item.label}
                          </strong>
                          {item.description && (
                            <p className="mt-0.5 text-[11px] text-stone-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-blue-800 shrink-0">
                          {latestSfa.participationScores[item.id] ?? '—'} / 6
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {latestSfa?.adaptations && latestSfa.adaptations.length > 0 && (
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Active Adaptations
                    </span>
                    <ul className="mt-2 space-y-1.5">
                      {latestSfa.adaptations.map((adapt, i) => (
                        <li
                          key={i}
                          className="text-xs text-stone-600 flex items-start gap-2"
                        >
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>
                            {sfaDefinition?.adaptationOptions.find(
                              (option) => option.id === adapt,
                            )?.label || adapt}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end">
            <button
              id="observation-drawer-done-btn"
              onClick={onClose}
              className="px-4 py-2 bg-[#6E161E] text-white text-xs font-semibold rounded-lg hover:bg-[#581117] transition-colors"
            >
              Close Reference
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
