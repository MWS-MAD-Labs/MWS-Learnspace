import React, { useEffect, useMemo, useState } from 'react';
import { fedcDefinitionBodySchema } from '@learnspace/contracts';
import { useApp } from '../../context/AppContext';
import { useFEDCObservations } from '../../hooks/useFEDCObservations';
import {
  observationService,
  type FEDCObservationCommand,
} from '../../services/observationService';
import type {
  FEDCItemResponse,
  FEDCObservationRecord,
  FEDCRating,
  ObservationAssignment,
} from '../../types';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Save,
} from 'lucide-react';

const RATING_WEIGHTS: Record<FEDCRating, number> = { S: 3, K: 2, T: 1, H: 0 };

type Props = { assignment: ObservationAssignment };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function provisionalScores(
  milestones: Array<{
    id: number;
    maxScore: number;
    items: Array<{ id: string }>;
  }>,
  responses: Record<string, FEDCItemResponse>,
) {
  const milestoneScores: Record<number, number> = {};
  let totalScore = 0;
  milestones.forEach((milestone) => {
    const score = milestone.items.reduce(
      (sum, item) =>
        sum +
        (responses[item.id]?.rating
          ? RATING_WEIGHTS[responses[item.id].rating!]
          : 0),
      0,
    );
    milestoneScores[milestone.id] = score;
    totalScore += score;
  });
  return { milestoneScores, totalScore };
}

export const FEDCObservationView: React.FC<Props> = ({ assignment }) => {
  const { organizationId, students, currentUser, showToast, navigateToIEP } =
    useApp();
  const student =
    students.find((candidate) => candidate.id === assignment.studentId) ??
    students[0];
  const history = useFEDCObservations(organizationId, assignment.studentId);
  const definitionResult = useMemo(
    () => fedcDefinitionBodySchema.safeParse(assignment.definitionBody),
    [assignment.definitionBody],
  );
  const milestones = definitionResult.success
    ? definitionResult.data.milestones
    : [];
  const [record, setRecord] = useState<FEDCObservationRecord | null>(null);
  const [responses, setResponses] = useState<Record<string, FEDCItemResponse>>(
    {},
  );
  const [observationDate, setObservationDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [activeMilestoneId, setActiveMilestoneId] = useState(1);
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
    setResponses(existing?.responses ?? {});
    setObservationDate(existing?.observationDate || today());
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
    () => provisionalScores(milestones, responses),
    [milestones, responses],
  );
  const activeMilestone =
    milestones.find((milestone) => milestone.id === activeMilestoneId) ??
    milestones[0];
  const isCompleted = record?.status.toUpperCase() === 'COMPLETED';
  const displayedTotal =
    record && !isDirty ? record.totalScore : preview.totalScore;
  const displayedMax =
    record?.maxPossibleScore ||
    milestones.reduce((total, milestone) => total + milestone.maxScore, 0);

  const command = (): FEDCObservationCommand => ({
    observationDate,
    responses: Object.fromEntries(
      (Object.values(responses) as FEDCItemResponse[])
        .filter(
          (response): response is FEDCItemResponse & { rating: FEDCRating } =>
            Boolean(response.rating),
        )
        .map((response) => [
          response.itemId,
          {
            itemId: response.itemId,
            rating: response.rating,
            ...(response.masteredAge
              ? { masteredAge: response.masteredAge }
              : {}),
          },
        ]),
    ),
    notes: notes.trim() || null,
  });

  const save = async (complete: boolean) => {
    setIsSaving(true);
    setMutationError(undefined);
    try {
      let saved: FEDCObservationRecord;
      if (!record) {
        saved = await observationService.createFEDCObservation(
          organizationId,
          assignment.id,
          command(),
        );
        setRecord(saved);
        if (complete) {
          saved = await observationService.completeFEDCObservation(
            organizationId,
            assignment.id,
            command(),
          );
        }
      } else if (complete) {
        saved = await observationService.completeFEDCObservation(
          organizationId,
          assignment.id,
          command(),
        );
      } else {
        saved = await observationService.saveFEDCObservationDraft(
          organizationId,
          assignment.id,
          command(),
        );
      }
      setRecord(saved);
      setResponses(saved.responses);
      setObservationDate(saved.observationDate);
      setNotes(saved.notes || '');
      setIsDirty(false);
      showToast(
        'success',
        complete ? 'FEDC Observation Completed' : 'FEDC Draft Saved',
        `The server saved the assignment-bound FEDC observation for ${student?.fullName || assignment.studentName}.`,
      );
      history.retry();
    } catch (caught) {
      setMutationError(
        caught instanceof Error
          ? caught.message
          : 'The FEDC observation could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!definitionResult.success || !activeMilestone) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        The assigned FEDC definition does not contain a valid scoring rubric.
      </div>
    );
  }

  if (history.status === 'loading') {
    return (
      <div className="rounded-2xl border border-[#EFE7DC] bg-white p-8 text-center text-sm text-stone-500">
        Loading assignment-bound FEDC observation…
      </div>
    );
  }
  if (history.status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 flex items-center justify-between gap-3">
        <span>{history.error}</span>
        <button
          onClick={history.retry}
          className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div
      id="fedc-observation-view"
      className="space-y-6 max-w-6xl mx-auto pb-24"
    >
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={
              student?.avatarUrl ||
              'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120'
            }
            alt={student?.fullName || assignment.studentName}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#EFE7DC]"
          />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
              FEDC · Assignment v{assignment.definitionVersion}
            </span>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {student?.fullName || assignment.studentName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {assignment.instrumentTitle ||
                'Functional Emotional Developmental Capacities'}{' '}
              · Due {assignment.dueDate}
            </p>
          </div>
        </div>
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-center min-w-35">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
            {record && !isDirty ? 'Server Score' : 'Provisional Preview'}
          </span>
          <span className="text-xl font-black text-[#6E161E]">
            {displayedTotal}{' '}
            <span className="text-xs text-stone-400 font-normal">
              / {displayedMax}
            </span>
          </span>
          {(!record || isDirty) && (
            <span className="block text-[10px] text-amber-700">
              Not submitted as a score
            </span>
          )}
        </div>
      </div>

      {(mutationError || isCompleted) && (
        <div
          className={`rounded-2xl border p-4 text-xs flex items-center gap-2 ${mutationError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {mutationError ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {mutationError ||
            'This observation is completed. Scores and totals shown are server-derived.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-[#FFFDF9] border border-[#EFE7DC] rounded-2xl p-4">
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-2">
            Scoring rubric
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {(
              [
                ['S', 3, 'Always'],
                ['K', 2, 'Sometimes'],
                ['T', 1, 'Never'],
                ['H', 0, 'With assistance'],
              ] as const
            ).map(([rating, score, label]) => (
              <div
                key={rating}
                className="p-2 rounded-xl bg-white border border-[#E8DFC8]"
              >
                <strong className="block">
                  {rating} ({score})
                </strong>
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 space-y-3">
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase block">
              Observer
            </span>
            <p className="text-xs font-bold">
              {record?.observerName || currentUser.name}
            </p>
          </div>
          <div>
            <label className="text-[11px] font-bold text-stone-400 uppercase block">
              Observation date
            </label>
            <input
              type="date"
              value={observationDate}
              disabled={isCompleted}
              onChange={(event) => {
                setObservationDate(event.target.value);
                setIsDirty(true);
              }}
              className="text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-lg px-2 py-1 mt-0.5 w-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          {milestones.map((milestone) => {
            const score =
              record && !isDirty
                ? record.milestoneScores[milestone.id] || 0
                : preview.milestoneScores[milestone.id] || 0;
            return (
              <button
                key={milestone.id}
                id={`milestone-tab-${milestone.id}`}
                onClick={() => setActiveMilestoneId(milestone.id)}
                className={`w-full p-4 text-left rounded-2xl border flex items-center justify-between ${activeMilestoneId === milestone.id ? 'bg-[#6E161E] text-white border-[#6E161E]' : 'bg-white border-[#EFE7DC]'}`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase">
                    Milestone {milestone.id}
                  </span>
                  <h3 className="text-xs font-bold">{milestone.title}</h3>
                </div>
                <span className="text-xs font-black">
                  {score} / {milestone.maxScore}
                </span>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-2 bg-white border border-[#EFE7DC] rounded-3xl p-6 space-y-5">
          <div>
            <span className="text-xs font-bold text-[#6E161E] uppercase">
              Milestone {activeMilestone.id}
            </span>
            <h2 className="text-lg font-black">{activeMilestone.title}</h2>
            <p className="text-xs text-stone-600">
              {activeMilestone.description}
            </p>
          </div>
          {activeMilestone.items.map((item) => {
            const response = responses[item.id] || { itemId: item.id };
            return (
              <div
                key={item.id}
                id={`fedc-item-${item.id}`}
                className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3"
              >
                <p className="text-xs font-semibold text-stone-900">
                  {item.number}. {item.text}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex gap-1.5">
                    {(['S', 'K', 'T', 'H'] as FEDCRating[]).map((rating) => (
                      <button
                        key={rating}
                        id={`fedc-btn-${item.id}-${rating}`}
                        type="button"
                        disabled={isCompleted}
                        onClick={() => {
                          setResponses((current) => ({
                            ...current,
                            [item.id]: { ...response, itemId: item.id, rating },
                          }));
                          setIsDirty(true);
                        }}
                        className={`w-10 h-8 text-xs font-bold rounded-lg border ${response.rating === rating ? 'bg-[#6E161E] text-white border-[#6E161E]' : 'bg-white border-stone-300'}`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="Mastered age"
                    value={response.masteredAge || ''}
                    onChange={(event) => {
                      setResponses((current) => ({
                        ...current,
                        [item.id]: {
                          ...response,
                          itemId: item.id,
                          masteredAge: event.target.value,
                        },
                      }));
                      setIsDirty(true);
                    }}
                    className="px-2.5 py-1 text-xs bg-white border border-[#E8DFC8] rounded-lg w-40"
                  />
                </div>
              </div>
            );
          })}
          <textarea
            rows={3}
            disabled={isCompleted}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setIsDirty(true);
            }}
            placeholder="Observation notes…"
            className="w-full p-3 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 border-t border-[#EFE7DC] px-6 py-4 shadow-lg flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateToIEP(assignment.studentId)}
          className="text-xs font-bold text-[#6E161E] flex items-center gap-1.5"
        >
          View Annual IEP Plan <ArrowRight className="w-3.5 h-3.5" />
        </button>
        {!isCompleted && (
          <div className="flex gap-3">
            <button
              type="button"
              id="fedc-save-draft-btn"
              disabled={isSaving}
              onClick={() => void save(false)}
              className="px-5 py-2.5 bg-[#FAF5EF] text-xs font-bold rounded-xl border border-[#E8DFC8] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              id="fedc-complete-btn"
              disabled={isSaving}
              onClick={() => void save(true)}
              className="px-6 py-2.5 bg-[#6E161E] text-white text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Observation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
