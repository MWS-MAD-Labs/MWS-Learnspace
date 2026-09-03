import React, { useEffect, useMemo, useState } from 'react';
import * as contracts from '@learnspace/contracts';
import { z } from 'zod';
import { useApp } from '../../context/AppContext';
import { useSensoryProfileObservations } from '../../hooks/useSensoryProfileObservations';
import { Avatar } from '../common/Avatar';
import {
  observationService,
  type SensoryObservationCommand,
} from '../../services/observationService';
import type {
  ObservationAssignment,
  SensoryProfileItem,
  SensoryProfileRecord,
  SensoryRating,
} from '../../types';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Save,
} from 'lucide-react';

type Props = { assignment: ObservationAssignment };

type SensorySection = {
  id: string;
  title: string;
  maxScore: number;
  items: SensoryProfileItem[];
};

const fallbackSensoryDefinitionBodySchema = z
  .object({
    sections: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            maxScore: z.number().int().nonnegative(),
            items: z.array(
              z
                .object({
                  id: z.string().min(1),
                  number: z.union([z.string(), z.number()]),
                  text: z.string().min(1),
                  section: z.string().optional(),
                  quadrant: z.enum(['SK', 'AV', 'SN', 'RG']).optional(),
                  schoolFactor: z.string().optional(),
                  factorLabel: z.string().optional(),
                })
                .passthrough(),
            ),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

type SensoryContractSchemas = typeof contracts & {
  sensoryProfileDefinitionBodySchema?: z.ZodType<unknown>;
  sensoryDefinitionBodySchema?: z.ZodType<unknown>;
};

function pinnedSections(body: unknown): SensorySection[] | null {
  const available = contracts as SensoryContractSchemas;
  const contractSchema =
    available.sensoryProfileDefinitionBodySchema ??
    available.sensoryDefinitionBodySchema;
  if (contractSchema) {
    const parsed = contractSchema.safeParse(body);
    if (!parsed.success) return null;
    const items = (parsed.data as { items?: SensoryProfileItem[] }).items;
    if (!Array.isArray(items) || items.length === 0) return null;
    const sectionNames: SensoryProfileItem['section'][] = [
      'Auditory',
      'Visual',
      'Touch',
      'Movement',
      'Behavioral',
    ];
    return sectionNames.flatMap((sectionName) => {
      const sectionItems = items.filter((item) => item.section === sectionName);
      if (sectionItems.length === 0) return [];
      return [
        {
          id: sectionName.toLowerCase(),
          title: `${sectionName} Processing`,
          maxScore: sectionItems.length * 5,
          items: sectionItems,
        },
      ];
    });
  }

  const normalized = fallbackSensoryDefinitionBodySchema.safeParse(body);
  if (!normalized.success) return null;
  return normalized.data.sections.map((section) => ({
    id: section.id,
    title: section.title,
    maxScore: section.maxScore,
    items: section.items.map((item) => ({
      id: item.id,
      number:
        typeof item.number === 'number'
          ? item.number
          : Number.parseInt(item.number, 10) || 0,
      section: (item.section || section.title) as SensoryProfileItem['section'],
      text: item.text,
      quadrant: item.quadrant,
      schoolFactor: item.schoolFactor,
      factorLabel: item.factorLabel,
    })),
  }));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function provisionalScores(
  sections: SensorySection[],
  responses: Record<string, SensoryRating>,
) {
  const sectionScores: Record<string, { raw: number; max: number }> = {};
  let totalRawScore = 0;
  sections.forEach((section) => {
    const raw = section.items.reduce((sum, item) => {
      const rating = responses[item.id];
      return sum + (rating === undefined ? 0 : rating);
    }, 0);
    sectionScores[section.id] = { raw, max: section.maxScore };
    totalRawScore += raw;
  });
  return { sectionScores, totalRawScore };
}

export const SensoryProfileView: React.FC<Props> = ({ assignment }) => {
  const { organizationId, students, currentUser, showToast, navigateToIEP } =
    useApp();
  const student =
    students.find((candidate) => candidate.id === assignment.studentId) ??
    students[0];
  const history = useSensoryProfileObservations(
    organizationId,
    assignment.studentId,
  );
  const sections = useMemo(
    () => pinnedSections(assignment.definitionBody),
    [assignment.definitionBody],
  );
  const [record, setRecord] = useState<SensoryProfileRecord | null>(null);
  const [responses, setResponses] = useState<Record<string, SensoryRating>>({});
  const [observationDate, setObservationDate] = useState(today());
  const [teacherContactFrequency, setTeacherContactFrequency] = useState('');
  const [teacherContactLength, setTeacherContactLength] = useState('');
  const [notes, setNotes] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [mutationError, setMutationError] = useState<string>();

  useEffect(() => {
    if (sections?.length && !sections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

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
    setTeacherContactFrequency(existing?.teacherContactFrequency || '');
    setTeacherContactLength(existing?.teacherContactLength || '');
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
    () => provisionalScores(sections ?? [], responses),
    [responses, sections],
  );
  const activeSection =
    sections?.find((section) => section.id === activeSectionId) ??
    sections?.[0];
  const isCompleted = record?.status.toUpperCase() === 'COMPLETED';
  const displayedTotal =
    record && !isDirty ? record.totalRawScore : preview.totalRawScore;
  const displayedMax =
    record?.maxPossibleScore ||
    sections?.reduce((total, section) => total + section.maxScore, 0) ||
    0;

  const command = (): SensoryObservationCommand => ({
    observationDate,
    responses: (Object.entries(responses) as [string, SensoryRating][]).reduce<
      Record<string, SensoryRating>
    >((included, [itemId, rating]) => {
      included[itemId] = rating;
      return included;
    }, {}),
    teacherContactFrequency: teacherContactFrequency.trim() || null,
    teacherContactLength: teacherContactLength.trim() || null,
    notes: notes.trim() || null,
  });

  const save = async (complete: boolean) => {
    setIsSaving(true);
    setMutationError(undefined);
    try {
      let saved: SensoryProfileRecord;
      if (!record) {
        saved = await observationService.createSensoryObservation(
          organizationId,
          assignment.id,
          command(),
        );
        setRecord(saved);
        if (complete) {
          saved = await observationService.completeSensoryObservation(
            organizationId,
            assignment.id,
            command(),
          );
        }
      } else if (complete) {
        saved = await observationService.completeSensoryObservation(
          organizationId,
          assignment.id,
          command(),
        );
      } else {
        saved = await observationService.saveSensoryObservationDraft(
          organizationId,
          assignment.id,
          command(),
        );
      }
      setRecord(saved);
      setResponses(saved.responses);
      setObservationDate(saved.observationDate);
      setTeacherContactFrequency(saved.teacherContactFrequency);
      setTeacherContactLength(saved.teacherContactLength);
      setNotes(saved.notes || '');
      setIsDirty(false);
      showToast(
        'success',
        complete ? 'Sensory Profile Completed' : 'Sensory Profile Draft Saved',
        `The server saved the assignment-bound Sensory Profile for ${student?.fullName || assignment.studentName}.`,
      );
      history.retry();
    } catch (caught) {
      setMutationError(
        caught instanceof Error
          ? caught.message
          : 'The Sensory Profile observation could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!sections || !activeSection) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        The assigned Sensory Profile definition does not contain a valid scoring
        rubric.
      </div>
    );
  }

  if (history.status === 'loading') {
    return (
      <div className="rounded-2xl border border-[#EFE7DC] bg-white p-8 text-center text-sm text-stone-500">
        Loading assignment-bound Sensory Profile observation…
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

  return (
    <div
      id="sensory-profile-view"
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
              Sensory Profile · Assignment v{assignment.definitionVersion}
            </span>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {student?.fullName || assignment.studentName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {assignment.instrumentTitle || 'Sensory Profile'} · Due{' '}
              {assignment.dueDate}
            </p>
          </div>
        </div>
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-center min-w-35">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
            {record && !isDirty ? 'Server Score' : 'Provisional Preview'}
          </span>
          <span className="text-xl font-black text-emerald-800">
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
          className={`rounded-2xl border p-4 text-xs flex items-center gap-2 ${
            mutationError
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
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

      <div className="bg-[#FFFDF9] border border-[#EFE7DC] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">
              Observation date
            </label>
            <input
              type="date"
              disabled={isCompleted}
              value={observationDate}
              onChange={(event) => {
                setObservationDate(event.target.value);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFC8] rounded-lg text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">
              Contact frequency
            </label>
            <input
              disabled={isCompleted}
              value={teacherContactFrequency}
              onChange={(event) => {
                setTeacherContactFrequency(event.target.value);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFC8] rounded-lg text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">
              Contact length
            </label>
            <input
              disabled={isCompleted}
              value={teacherContactLength}
              onChange={(event) => {
                setTeacherContactLength(event.target.value);
                setIsDirty(true);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFC8] rounded-lg text-xs font-semibold"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          {[
            [5, 'Almost Always'],
            [4, 'Frequently'],
            [3, 'Half The Time'],
            [2, 'Occasionally'],
            [1, 'Almost Never'],
            [0, 'Does Not Apply'],
          ].map(([rating, label]) => (
            <div
              key={rating}
              className="p-2 rounded-xl bg-white border border-[#E8DFC8]"
            >
              <strong className="text-sm block">{rating}</strong>
              <span className="text-[11px] text-stone-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b border-stone-200 bg-white rounded-2xl p-1 shadow-xs gap-1 overflow-x-auto">
        {sections.map((section) => {
          const score =
            record && !isDirty
              ? record.sectionScores[section.id]?.raw || 0
              : preview.sectionScores[section.id]?.raw || 0;
          return (
            <button
              key={section.id}
              type="button"
              id={`sensory-tab-${section.id}`}
              onClick={() => setActiveSectionId(section.id)}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                activeSection.id === section.id
                  ? 'bg-[#6E161E] text-white'
                  : 'text-stone-600 hover:bg-[#FAF5EF]'
              }`}
            >
              <span>{section.title}</span>
              <span>
                {score}/{section.maxScore}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h2 className="text-base font-bold text-stone-900">
            {activeSection.title} ({activeSection.items.length} Observations)
          </h2>
          <span className="text-xs font-semibold text-stone-500">
            Select 0 to 5 for each item
          </span>
        </div>
        <div className="space-y-3">
          {activeSection.items.map((item) => {
            const currentValue = responses[item.id];
            return (
              <div
                key={item.id}
                id={`sensory-item-${item.id}`}
                className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-stone-900 leading-relaxed">
                    <span className="font-mono text-stone-500 mr-2">
                      {item.number}
                    </span>
                    {item.text}
                  </p>
                  {item.factorLabel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                      {item.factorLabel}
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-[#E8DFC8]/60 flex items-center justify-end gap-1.5">
                  {[5, 4, 3, 2, 1, 0].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={isCompleted}
                      aria-label={`Rate ${item.number} as ${value}`}
                      id={`btn-sensory-${item.id}-${value}`}
                      onClick={() => {
                        setResponses((current) => ({
                          ...current,
                          [item.id]: value as SensoryRating,
                        }));
                        setIsDirty(true);
                      }}
                      className={`w-9 h-8 text-xs font-bold rounded-lg border ${
                        currentValue === value
                          ? 'bg-[#6E161E] text-white border-[#6E161E]'
                          : 'bg-white text-stone-700 border-stone-300'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <textarea
          rows={3}
          disabled={isCompleted}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setIsDirty(true);
          }}
          placeholder="Sensory integration notes and environment recommendations…"
          className="w-full p-3 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl"
        />
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
              id="sensory-save-draft-btn"
              disabled={isSaving}
              onClick={() => void save(false)}
              className="px-5 py-2.5 bg-[#FAF5EF] text-xs font-bold rounded-xl border border-[#E8DFC8] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              id="sensory-complete-btn"
              disabled={isSaving}
              onClick={() => void save(true)}
              className="px-6 py-2.5 bg-[#6E161E] text-white text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Complete Sensory Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
