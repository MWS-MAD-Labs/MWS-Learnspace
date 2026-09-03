import React, { useEffect, useMemo, useState } from 'react';
import {
  sfaDefinitionBodySchema,
  type SfaDefinitionBody,
} from '@learnspace/contracts';
import { useApp } from '../../context/AppContext';
import { useSFAObservations } from '../../hooks/useSFAObservations';
import { Avatar } from '../common/Avatar';
import {
  observationService,
  type SFAObservationCommand,
} from '../../services/observationService';
import type {
  ObservationAssignment,
  SFAObservationRecord,
  SFARespondent,
} from '../../types';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';

type Props = { assignment: ObservationAssignment };
type SfaTab =
  | 'Metadata'
  | 'Participation'
  | 'Task Supports'
  | 'Activity Performance'
  | 'Adaptations'
  | 'Notes & Summary';

const TABS: SfaTab[] = [
  'Metadata',
  'Participation',
  'Task Supports',
  'Activity Performance',
  'Adaptations',
  'Notes & Summary',
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function cleanRespondents(respondents: SFARespondent[]) {
  return respondents
    .map(({ name, role, initials }) => ({
      name: name.trim(),
      role: role.trim(),
      initials: initials.trim(),
    }))
    .filter(
      (respondent) => respondent.name || respondent.role || respondent.initials,
    );
}

function provisionalParticipation(scores: Record<string, number>) {
  const values = Object.values(scores);
  const total = values.reduce((sum, score) => sum + score, 0);
  return { total, average: values.length ? total / values.length : 0 };
}

export const SFAObservationView: React.FC<Props> = ({ assignment }) => {
  const { organizationId, students, currentUser, showToast, navigateToIEP } =
    useApp();
  const student =
    students.find((candidate) => candidate.id === assignment.studentId) ??
    students[0];
  const history = useSFAObservations(organizationId, assignment.studentId);
  const definition = useMemo<SfaDefinitionBody | null>(() => {
    const parsed = sfaDefinitionBodySchema.safeParse(assignment.definitionBody);
    return parsed.success ? parsed.data : null;
  }, [assignment.definitionBody]);

  const [record, setRecord] = useState<SFAObservationRecord | null>(null);
  const [activeTab, setActiveTab] = useState<SfaTab>('Participation');
  const [assessmentDate, setAssessmentDate] = useState(today());
  const [observationDate, setObservationDate] = useState('');
  const [programRecommendation, setProgramRecommendation] = useState('Regular');
  const [respondents, setRespondents] = useState<SFARespondent[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState('');
  const [writingMethod, setWritingMethod] = useState('');
  const [mobilityMethod, setMobilityMethod] = useState('');
  const [conditionsAffectingPerformance, setConditionsAffectingPerformance] =
    useState('');
  const [participationScores, setParticipationScores] = useState<
    Record<string, number>
  >({});
  const [taskSupports, setTaskSupports] = useState<Record<string, number>>({});
  const [activityPerformance, setActivityPerformance] = useState<
    Record<string, number>
  >({});
  const [adaptations, setAdaptations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [mutationError, setMutationError] = useState<string>();

  useEffect(() => {
    if (history.status !== 'ready') return;
    const existing =
      history.observations.find(
        (candidate) => candidate.assignmentId === assignment.id,
      ) ??
      (assignment.recordId
        ? history.observations.find(
            (candidate) => candidate.id === assignment.recordId,
          )
        : undefined);
    setRecord(existing ?? null);
    setAssessmentDate(existing?.assessmentDate || today());
    setObservationDate(existing?.observationDate || '');
    setProgramRecommendation(existing?.programRecommendation || 'Regular');
    setRespondents(existing?.respondents ?? []);
    setPrimaryLanguage(existing?.primaryLanguage || '');
    setWritingMethod(existing?.writingMethod || '');
    setMobilityMethod(existing?.mobilityMethod || '');
    setConditionsAffectingPerformance(
      existing?.conditionsAffectingPerformance || '',
    );
    setParticipationScores(existing?.participationScores ?? {});
    setTaskSupports(existing?.taskSupports ?? {});
    setActivityPerformance(existing?.activityPerformance ?? {});
    setAdaptations(existing?.adaptations ?? []);
    setNotes(existing?.notes || '');
    setIsDirty(false);
    setMutationError(undefined);
  }, [
    assignment.id,
    assignment.recordId,
    history.observations,
    history.status,
  ]);

  const preview = useMemo(
    () => provisionalParticipation(participationScores),
    [participationScores],
  );
  const isCompleted = record?.status.toUpperCase() === 'COMPLETED';
  const displayedTotal =
    record && !isDirty
      ? (record.totalParticipationRawScore ?? 0)
      : preview.total;
  const displayedAverage =
    record && !isDirty ? record.participationAverage : preview.average;
  const displayedMax = (definition?.participationItems.length ?? 0) * 6;
  const locked = isCompleted || isSaving;

  const markDirty = () => {
    setIsDirty(true);
    setMutationError(undefined);
  };

  const command = (): SFAObservationCommand => {
    const trimmedPrimaryLanguage = primaryLanguage.trim();
    const trimmedWritingMethod = writingMethod.trim();
    const trimmedMobilityMethod = mobilityMethod.trim();
    const trimmedConditions = conditionsAffectingPerformance.trim();
    return {
      assessmentDate,
      ...(observationDate ? { observationDate } : {}),
      programRecommendation: programRecommendation.trim() || 'Regular',
      respondents: cleanRespondents(respondents),
      ...(trimmedPrimaryLanguage
        ? { primaryLanguage: trimmedPrimaryLanguage }
        : {}),
      ...(trimmedWritingMethod ? { writingMethod: trimmedWritingMethod } : {}),
      ...(trimmedMobilityMethod
        ? { mobilityMethod: trimmedMobilityMethod }
        : {}),
      ...(trimmedConditions
        ? { conditionsAffectingPerformance: trimmedConditions }
        : {}),
      participationScores,
      taskSupports,
      activityPerformance,
      adaptations,
      notes: notes.trim() || null,
    };
  };

  const applySaved = (saved: SFAObservationRecord) => {
    setRecord(saved);
    setAssessmentDate(saved.assessmentDate);
    setObservationDate(saved.observationDate || '');
    setProgramRecommendation(saved.programRecommendation);
    setRespondents(saved.respondents);
    setPrimaryLanguage(saved.primaryLanguage || '');
    setWritingMethod(saved.writingMethod || '');
    setMobilityMethod(saved.mobilityMethod || '');
    setConditionsAffectingPerformance(
      saved.conditionsAffectingPerformance || '',
    );
    setParticipationScores(saved.participationScores);
    setTaskSupports(saved.taskSupports);
    setActivityPerformance(saved.activityPerformance);
    setAdaptations(saved.adaptations);
    setNotes(saved.notes || '');
    setIsDirty(false);
  };

  const save = async (complete: boolean) => {
    setIsSaving(true);
    setMutationError(undefined);
    try {
      let saved: SFAObservationRecord;
      if (!record) {
        saved = await observationService.createSFAObservation(
          organizationId,
          assignment.id,
          command(),
        );
        applySaved(saved);
        if (complete) {
          saved = await observationService.completeSFAObservation(
            organizationId,
            assignment.id,
            command(),
          );
        }
      } else if (complete) {
        saved = await observationService.completeSFAObservation(
          organizationId,
          assignment.id,
          command(),
        );
      } else {
        saved = await observationService.saveSFAObservationDraft(
          organizationId,
          assignment.id,
          command(),
        );
      }
      applySaved(saved);
      showToast(
        'success',
        complete ? 'SFA Assessment Completed' : 'SFA Draft Saved',
        `The server saved the assignment-bound SFA for ${student?.fullName || assignment.studentName}.`,
      );
      history.retry();
    } catch (caught) {
      setMutationError(
        errorMessage(caught, 'The SFA observation could not be saved.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!definition) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        The assigned SFA definition does not contain a valid scoring model.
      </div>
    );
  }
  if (history.status === 'loading') {
    return (
      <div className="rounded-2xl border border-[#EFE7DC] bg-white p-8 text-center text-sm text-stone-500">
        Loading assignment-bound SFA observation…
      </div>
    );
  }
  if (history.status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 flex items-center justify-between gap-3">
        <span>{history.error}</span>
        <button
          type="button"
          onClick={history.retry}
          className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  const textField = (
    label: string,
    value: string,
    setter: (value: string) => void,
    multiline = false,
  ) => (
    <label className="space-y-1 text-xs font-bold text-stone-600">
      <span>{label}</span>
      {multiline ? (
        <textarea
          disabled={locked}
          value={value}
          onChange={(event) => {
            setter(event.target.value);
            markDirty();
          }}
          className="w-full min-h-24 rounded-xl border border-[#E8DFC8] bg-white px-3 py-2 font-normal text-stone-900"
        />
      ) : (
        <input
          disabled={locked}
          value={value}
          onChange={(event) => {
            setter(event.target.value);
            markDirty();
          }}
          className="w-full rounded-xl border border-[#E8DFC8] bg-white px-3 py-2 font-normal text-stone-900"
        />
      )}
    </label>
  );

  const ratingRows = (
    items: SfaDefinitionBody['participationItems'],
    values: Record<string, number>,
    setValues: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    max: number,
  ) => (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-[#E8DFC8] bg-[#FAF5EF] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-xs font-bold text-stone-900">{item.label}</p>
            {item.description && (
              <p className="mt-1 text-[11px] text-stone-500">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {Array.from({ length: max }, (_, index) => index + 1).map(
              (rating) => (
                <button
                  key={rating}
                  type="button"
                  aria-label={`Rate ${item.label} as ${rating}`}
                  disabled={locked}
                  onClick={() => {
                    setValues((current) => ({ ...current, [item.id]: rating }));
                    markDirty();
                  }}
                  className={`h-9 w-9 rounded-lg border text-xs font-bold ${values[item.id] === rating ? 'border-[#6E161E] bg-[#6E161E] text-white' : 'border-stone-300 bg-white text-stone-700'}`}
                >
                  {rating}
                </button>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      id="sfa-observation-view"
      className="space-y-6 max-w-6xl mx-auto pb-24"
    >
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar
            name={student?.fullName || assignment.studentName}
            src={student?.avatarUrl}
            className="w-14 h-14 rounded-2xl border-2 border-[#EFE7DC] text-base"
          />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
              SFA · Assignment v{assignment.definitionVersion}
            </span>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {student?.fullName || assignment.studentName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {assignment.instrumentTitle || 'School Function Assessment'} · Due{' '}
              {assignment.dueDate}
            </p>
          </div>
        </div>
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-center min-w-44">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
            {record && !isDirty
              ? 'Server Participation Total'
              : 'Provisional Preview'}
          </span>
          <span className="text-xl font-black text-blue-800">
            {displayedTotal}{' '}
            <span className="text-xs text-stone-400 font-normal">
              / {displayedMax}
            </span>
          </span>
          <span className="block text-[10px] text-stone-600">
            Average {displayedAverage.toFixed(2)} / 6
          </span>
          {(!record || isDirty) && (
            <span className="block text-[10px] text-amber-700">
              Not submitted as a score
            </span>
          )}
        </div>
      </div>

      {(mutationError || isCompleted || isDirty || isSaving) && (
        <div
          className={`rounded-2xl border p-4 text-xs flex items-center gap-2 ${mutationError ? 'border-rose-200 bg-rose-50 text-rose-800' : isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
        >
          {mutationError ? (
            <AlertCircle className="h-4 w-4" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mutationError ||
            (isCompleted
              ? 'This SFA is completed and locked. Totals shown are server-derived.'
              : isSaving
                ? 'Saving SFA observation…'
                : 'You have unsaved SFA changes.')}
        </div>
      )}

      <div className="flex border-b border-stone-200 bg-white rounded-2xl p-1 shadow-xs gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-32 py-2.5 px-3 rounded-xl text-xs font-bold ${activeTab === tab ? 'bg-[#6E161E] text-white' : 'text-stone-600 hover:bg-[#FAF5EF]'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-5">
        {activeTab === 'Metadata' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1 text-xs font-bold text-stone-600">
                Assessment date
                <input
                  type="date"
                  disabled={locked}
                  value={assessmentDate}
                  onChange={(event) => {
                    setAssessmentDate(event.target.value);
                    markDirty();
                  }}
                  className="w-full rounded-xl border border-[#E8DFC8] bg-white px-3 py-2 font-normal text-stone-900"
                />
              </label>
              <label className="space-y-1 text-xs font-bold text-stone-600">
                Observation date
                <input
                  type="date"
                  disabled={locked}
                  value={observationDate}
                  onChange={(event) => {
                    setObservationDate(event.target.value);
                    markDirty();
                  }}
                  className="w-full rounded-xl border border-[#E8DFC8] bg-white px-3 py-2 font-normal text-stone-900"
                />
              </label>
              <label className="space-y-1 text-xs font-bold text-stone-600">
                Program recommendation
                <select
                  disabled={locked}
                  value={programRecommendation}
                  onChange={(event) => {
                    setProgramRecommendation(event.target.value);
                    markDirty();
                  }}
                  className="w-full rounded-xl border border-[#E8DFC8] bg-white px-3 py-2 font-normal text-stone-900"
                >
                  <option>Regular</option>
                  <option>Special Education</option>
                </select>
              </label>
              {textField(
                'Primary language',
                primaryLanguage,
                setPrimaryLanguage,
              )}
              {textField('Writing method', writingMethod, setWritingMethod)}
              {textField('Mobility method', mobilityMethod, setMobilityMethod)}
            </div>
            {textField(
              'Conditions affecting performance',
              conditionsAffectingPerformance,
              setConditionsAffectingPerformance,
              true,
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-900">
                  Respondents
                </h2>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setRespondents((current) => [
                      ...current,
                      { name: '', role: '', initials: '' },
                    ]);
                    markDirty();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-[#E8DFC8] px-3 py-1.5 text-xs font-bold"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add respondent
                </button>
              </div>
              {respondents.length === 0 && (
                <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500">
                  No respondents added yet. Drafts may be saved with partial
                  metadata.
                </p>
              )}
              {respondents.map((respondent, index) => (
                <div
                  key={`${index}-${respondent.id || 'new'}`}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr_8rem_auto] gap-2 items-end"
                >
                  {(['name', 'role', 'initials'] as const).map((field) => (
                    <label
                      key={field}
                      className="space-y-1 text-[10px] font-bold uppercase text-stone-500"
                    >
                      {field}
                      <input
                        disabled={locked}
                        value={respondent[field]}
                        onChange={(event) => {
                          setRespondents((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, [field]: event.target.value }
                                : item,
                            ),
                          );
                          markDirty();
                        }}
                        className="w-full rounded-lg border border-[#E8DFC8] px-2.5 py-2 text-xs font-normal normal-case text-stone-900"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    aria-label={`Remove respondent ${index + 1}`}
                    disabled={locked}
                    onClick={() => {
                      setRespondents((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      );
                      markDirty();
                    }}
                    className="rounded-lg border border-rose-200 p-2 text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Participation' && (
          <>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Participation ratings
              </h2>
              <p className="text-xs text-stone-500">
                Use the pinned assignment wording. Rate each item from 1
                (extremely limited) to 6 (full participation).
              </p>
            </div>
            {ratingRows(
              definition.participationItems,
              participationScores,
              setParticipationScores,
              6,
            )}
          </>
        )}
        {activeTab === 'Task Supports' && (
          <>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Task support requirements
              </h2>
              <p className="text-xs text-stone-500">
                Rate 1 (extensive support) through 4 (no support needed).
              </p>
            </div>
            {ratingRows(
              definition.taskSupportItems,
              taskSupports,
              setTaskSupports,
              4,
            )}
          </>
        )}
        {activeTab === 'Activity Performance' && (
          <>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Activity performance
              </h2>
              <p className="text-xs text-stone-500">
                Rate each pinned activity from 1 through 4.
              </p>
            </div>
            {ratingRows(
              definition.activityPerformanceItems,
              activityPerformance,
              setActivityPerformance,
              4,
            )}
          </>
        )}
        {activeTab === 'Adaptations' && (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Adaptations checklist
              </h2>
              <p className="text-xs text-stone-500">
                Select all adaptations currently used.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {definition.adaptationOptions.map((option) => {
                const checked = adaptations.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`rounded-2xl border p-4 flex items-start gap-3 ${checked ? 'border-emerald-300 bg-emerald-50' : 'border-[#E8DFC8] bg-[#FAF5EF]'}`}
                  >
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={checked}
                      onChange={() => {
                        setAdaptations((current) =>
                          checked
                            ? current.filter((id) => id !== option.id)
                            : [...current, option.id],
                        );
                        markDirty();
                      }}
                    />
                    <span>
                      <strong className="block text-xs text-stone-900">
                        {option.label}
                      </strong>
                      {option.description && (
                        <span className="mt-1 block text-[11px] text-stone-500">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === 'Notes & Summary' && (
          <div className="space-y-5">
            {textField('Assessment notes', notes, setNotes, true)}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-[#FAF5EF] p-3">
                <strong className="block text-lg">
                  {Object.keys(participationScores).length}/
                  {definition.participationItems.length}
                </strong>
                <span className="text-[10px] text-stone-500">
                  Participation rated
                </span>
              </div>
              <div className="rounded-xl bg-[#FAF5EF] p-3">
                <strong className="block text-lg">
                  {Object.keys(taskSupports).length}/
                  {definition.taskSupportItems.length}
                </strong>
                <span className="text-[10px] text-stone-500">
                  Supports rated
                </span>
              </div>
              <div className="rounded-xl bg-[#FAF5EF] p-3">
                <strong className="block text-lg">
                  {Object.keys(activityPerformance).length}/
                  {definition.activityPerformanceItems.length}
                </strong>
                <span className="text-[10px] text-stone-500">
                  Activities rated
                </span>
              </div>
              <div className="rounded-xl bg-[#FAF5EF] p-3">
                <strong className="block text-lg">{adaptations.length}</strong>
                <span className="text-[10px] text-stone-500">
                  Adaptations selected
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        id="sfa-sticky-bar"
        className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#EFE7DC] px-6 py-4 shadow-lg flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => navigateToIEP(assignment.studentId)}
          className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1.5"
        >
          View Annual IEP Plan <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="sfa-save-draft-btn"
            disabled={locked || (!isDirty && Boolean(record))}
            onClick={() => void save(false)}
            className="px-5 py-2.5 bg-[#FAF5EF] disabled:opacity-50 text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            id="sfa-complete-btn"
            disabled={locked}
            onClick={() => void save(true)}
            className="px-6 py-2.5 bg-[#6E161E] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete SFA Assessment
          </button>
        </div>
      </div>
    </div>
  );
};
