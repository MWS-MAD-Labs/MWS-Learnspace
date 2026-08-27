import { useCallback, useEffect, useState } from 'react';
import type { IEPRecord } from '../types';
import { isRequestCancelled } from '../services/apiClient';
import { iepService } from '../services/iepService';

type LoadStatus = 'loading' | 'ready' | 'error';

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'IEP plans could not be loaded.';
}

export function useIEPs(
  organizationId: string,
  filters: { studentId?: string } = {},
  options: { enabled?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(organizationId);
  const studentId = filters.studentId;
  const [ieps, setIEPs] = useState<IEPRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setIEPs([]);
      setError(undefined);
      setStatus('ready');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    void iepService
      .getIEPs(organizationId, { studentId }, controller.signal)
      .then((records) => {
        setIEPs(records);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (isRequestCancelled(caught)) return;
        setIEPs([]);
        setError(errorMessage(caught));
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, studentId, reloadToken]);

  return { ieps, status, error, retry };
}
