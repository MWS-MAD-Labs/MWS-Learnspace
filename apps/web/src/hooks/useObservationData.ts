import { useCallback, useEffect, useState } from 'react';
import { isRequestCancelled } from '../services/apiClient';
import {
  mapObservationAssignment,
  mapObservationDefinition,
  observationService,
} from '../services/observationService';
import type { ObservationAssignment, ObservationDefinition } from '../types';

export type ObservationDataStatus = 'loading' | 'ready' | 'error';

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Observation data could not be loaded.';
}

export function useObservationData(
  organizationId: string,
  options: { includeDefinitions?: boolean; enabled?: boolean } = {},
) {
  const includeDefinitions = options.includeDefinitions ?? true;
  const enabled = options.enabled ?? true;
  const [definitions, setDefinitions] = useState<ObservationDefinition[]>([]);
  const [assignments, setAssignments] = useState<ObservationAssignment[]>([]);
  const [status, setStatus] = useState<ObservationDataStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setDefinitions([]);
      setAssignments([]);
      setError(undefined);
      setStatus('ready');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    Promise.all([
      includeDefinitions
        ? observationService.getDefinitions(organizationId, controller.signal)
        : Promise.resolve(undefined),
      observationService.getAssignments(organizationId, controller.signal),
    ])
      .then(([definitionsResponse, assignmentsResponse]) => {
        setDefinitions(
          definitionsResponse?.data.map(mapObservationDefinition) ?? [],
        );
        setAssignments(assignmentsResponse.data.map(mapObservationAssignment));
        setStatus('ready');
      })
      .catch((loadError: unknown) => {
        if (isRequestCancelled(loadError)) return;
        setError(errorMessage(loadError));
        setStatus('error');
      });

    return () => controller.abort();
  }, [enabled, includeDefinitions, organizationId, reloadToken]);

  return { definitions, assignments, status, error, retry };
}
