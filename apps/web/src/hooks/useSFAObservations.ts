import { useCallback, useEffect, useState } from 'react';
import { isRequestCancelled } from '../services/apiClient';
import {
  observationService,
  type SFAObservationReference,
} from '../services/observationService';
import type { SFAObservationRecord } from '../types';

type LoadStatus = 'loading' | 'ready' | 'error';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSFAObservations(
  organizationId: string,
  studentId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) && Boolean(organizationId && studentId);
  const [observations, setObservations] = useState<SFAObservationRecord[]>([]);
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
      .getStudentSFAObservations(organizationId, studentId, controller.signal)
      .then((records) => {
        setObservations(records);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (isRequestCancelled(caught)) return;
        setObservations([]);
        setError(
          errorMessage(caught, 'SFA observation history could not be loaded.'),
        );
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, studentId, reloadToken]);

  return { observations, status, error, retry };
}

export function useSFAObservationReference(
  organizationId: string,
  studentId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) && Boolean(organizationId && studentId);
  const [reference, setReference] = useState<SFAObservationReference | null>(
    null,
  );
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
      .getStudentSFAReference(organizationId, studentId, controller.signal)
      .then((loaded) => {
        setReference(loaded);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (isRequestCancelled(caught)) return;
        setReference(null);
        setError(errorMessage(caught, 'SFA reference could not be loaded.'));
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, studentId, reloadToken]);

  return { reference, status, error, retry };
}
