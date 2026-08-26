import { useCallback, useEffect, useState } from 'react';
import { isRequestCancelled } from '../services/apiClient';
import {
  observationService,
  type FEDCObservationReference,
} from '../services/observationService';
import type { FEDCObservationRecord } from '../types';

type LoadStatus = 'loading' | 'ready' | 'error';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useFEDCObservations(
  organizationId: string,
  studentId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) && Boolean(organizationId && studentId);
  const [observations, setObservations] = useState<FEDCObservationRecord[]>([]);
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
      .getStudentFEDCObservations(organizationId, studentId, controller.signal)
      .then((records) => {
        setObservations(records);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (isRequestCancelled(caught)) return;
        setObservations([]);
        setError(
          errorMessage(caught, 'FEDC observation history could not be loaded.'),
        );
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, studentId, reloadToken]);

  return { observations, status, error, retry };
}

export function useFEDCObservationReference(
  organizationId: string,
  studentId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) && Boolean(organizationId && studentId);
  const [reference, setReference] = useState<FEDCObservationReference | null>(
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
      .getStudentFEDCReference(organizationId, studentId, controller.signal)
      .then((loaded) => {
        setReference(loaded);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (isRequestCancelled(caught)) return;
        setReference(null);
        setError(errorMessage(caught, 'FEDC reference could not be loaded.'));
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, studentId, reloadToken]);

  return { reference, status, error, retry };
}
