import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AcademicYearsResponse,
  GradesResponse,
  LearningJourneyListQuery,
  SemestersResponse,
  SubjectsResponse,
  UnitsResponse,
} from '@learnspace/contracts';
import type { LearningJourney } from '../types';
import { isRequestCancelled } from '../services/apiClient';
import {
  learningJourneyService,
  mapJourneyToLegacy,
} from '../services/learningJourneyService';

export type LearningJourneyMetadata = {
  academicYears: AcademicYearsResponse['data'];
  semesters: SemestersResponse['data'];
  units: UnitsResponse['data'];
  grades: GradesResponse['data'];
  subjects: SubjectsResponse['data'];
};

const metadataCache = new Map<string, LearningJourneyMetadata>();

const emptyMetadata: LearningJourneyMetadata = {
  academicYears: [],
  semesters: [],
  units: [],
  grades: [],
  subjects: [],
};

type LearningJourneyFilterInput = LearningJourneyListQuery & {
  semesterName?: string;
  unitName?: string;
  gradeName?: string;
  subjectName?: string;
};

export function useLearningJourneys(
  organizationId: string,
  filters: LearningJourneyFilterInput,
  options: { enabled?: boolean } = {},
) {
  const [journeys, setJourneys] = useState<LearningJourney[]>([]);
  const [metadata, setMetadata] =
    useState<LearningJourneyMetadata>(emptyMetadata);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const filterKey = JSON.stringify(filters);
  const enabled = options.enabled ?? true;

  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedFilters(filtersRef.current),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [filterKey]);

  useEffect(() => {
    if (!enabled) {
      setJourneys([]);
      setMetadata(emptyMetadata);
      setError(undefined);
      setStatus('ready');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    const loadMetadata = async () => {
      const cached = metadataCache.get(organizationId);
      if (cached) return cached;
      const [academicYears, semesters, units, grades, subjects] =
        await Promise.all([
          learningJourneyService.getAcademicYears(
            organizationId,
            controller.signal,
          ),
          learningJourneyService.getSemesters(
            organizationId,
            controller.signal,
          ),
          learningJourneyService.getUnits(organizationId, controller.signal),
          learningJourneyService.getGrades(organizationId, controller.signal),
          learningJourneyService.getSubjects(organizationId, controller.signal),
        ]);
      const loaded = {
        academicYears: academicYears.data,
        semesters: semesters.data,
        units: units.data,
        grades: grades.data,
        subjects: subjects.data,
      };
      metadataCache.set(organizationId, loaded);
      return loaded;
    };
    void loadMetadata()
      .then(async (loadedMetadata) => {
        const {
          semesterName,
          unitName,
          gradeName,
          subjectName,
          ...directFilters
        } = debouncedFilters;
        const resolvedFilters: LearningJourneyListQuery = {
          ...directFilters,
          ...(semesterName
            ? {
                semesterId: loadedMetadata.semesters.find(
                  (item) => item.name === semesterName,
                )?.id,
              }
            : {}),
          ...(unitName
            ? {
                unitId: loadedMetadata.units.find(
                  (item) => item.name === unitName,
                )?.id,
              }
            : {}),
          ...(gradeName
            ? {
                gradeId: loadedMetadata.grades.find(
                  (item) => item.name === gradeName,
                )?.id,
              }
            : {}),
          ...(subjectName
            ? {
                subjectId: loadedMetadata.subjects.find(
                  (item) => item.name === subjectName,
                )?.id,
              }
            : {}),
        };
        const journeyResponse = await learningJourneyService.getJourneys(
          organizationId,
          resolvedFilters,
          controller.signal,
        );
        setJourneys(journeyResponse.data.map(mapJourneyToLegacy));
        setMetadata(loadedMetadata);
        setStatus('ready');
      })
      .catch((caught) => {
        if (isRequestCancelled(caught)) return;
        setJourneys([]);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Learning journeys could not be loaded.',
        );
        setStatus('error');
      });
    return () => controller.abort();
  }, [organizationId, debouncedFilters, reloadToken, enabled]);

  return { journeys, metadata, status, error, retry };
}
