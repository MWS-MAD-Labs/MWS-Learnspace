import { useCallback, useEffect, useState } from 'react';
import { isRequestCancelled } from '../services/apiClient';
import {
  observationService,
  type SensoryObservationReference,
} from '../services/observationService';
import type { SensoryProfileRecord } from '../types';

type LoadStatus = 'loading' | 'ready' | 'error';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSensoryProfileObservations(
  organizationId: string,
  studentId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) && Boolean(organizationId && studentId);
  const [observations, setObservations] = useState<SensoryProfileRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setObservations([]);
      setError(undefined);
      setStatus('ready');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    void observationService
      .getStudentSensoryObservations(
        organizationId,
        studentId,
        controller.signal,
      )
      .then((records) => {
        setObservations(records);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (isRequestCancelled(caught)) return;
        setObservations([]);
        setError(
          errorMessage(
            caught,
            'Sensory Profile observation history could not be loaded.',
          ),
        );
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, studentId, reloadToken]);

  return { observations, status, error, retry };
}

export function useSensoryProfileObservationReference(
  organizationId: string,
  studentId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) && Boolean(organizationId && studentId);
  const [reference, setReference] =
    useState<SensoryObservationReference | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setReference(null);
      setError(undefined);
      setStatus('ready');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    void observationService
      .getStudentSensoryReference(organizationId, studentId, controller.signal)
      .then((loaded) => {
        setReference(loaded);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (isRequestCancelled(caught)) return;
        setReference(null);
        setError(
          errorMessage(
            caught,
            'Sensory Profile reference could not be loaded.',
          ),
        );
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, studentId, reloadToken]);

  return { reference, status, error, retry };
}
