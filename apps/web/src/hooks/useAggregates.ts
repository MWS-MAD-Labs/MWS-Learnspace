import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type {
  AggregateNotification,
  AggregateSearchItem,
  DashboardSummaryResponse,
  ReportingAggregateResponse,
} from '@learnspace/contracts';
import { isRequestCancelled } from '../services/apiClient';
import { aggregateService } from '../services/aggregateService';

type LoadStatus = 'loading' | 'ready' | 'error';

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useDashboardSummary(organizationId: string) {
  const [data, setData] = useState<DashboardSummaryResponse['data']>();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    void aggregateService
      .getDashboard(organizationId, controller.signal)
      .then((response) => {
        setData(response.data);
        setStatus('ready');
      })
      .catch((caught) => {
        if (isRequestCancelled(caught)) return;
        setData(undefined);
        setError(message(caught, 'Dashboard summary could not be loaded.'));
        setStatus('error');
      });
    return () => controller.abort();
  }, [organizationId, reloadToken]);

  return { data, status, error, retry };
}

export function useReportingAggregate(organizationId: string) {
  const [data, setData] = useState<ReportingAggregateResponse['data']>();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    void aggregateService
      .getReportingAggregate(organizationId, controller.signal)
      .then((response) => {
        setData(response.data);
        setStatus('ready');
      })
      .catch((caught) => {
        if (isRequestCancelled(caught)) return;
        setData(undefined);
        setError(message(caught, 'Reports could not be loaded.'));
        setStatus('error');
      });
    return () => controller.abort();
  }, [organizationId, reloadToken]);

  return { data, status, error, retry };
}

export function useNotifications(organizationId: string, enabled = true) {
  const [data, setData] = useState<AggregateNotification[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    void aggregateService
      .getNotifications(organizationId, controller.signal)
      .then((response) => {
        setData(response.data);
        setStatus('ready');
      })
      .catch((caught) => {
        if (isRequestCancelled(caught)) return;
        setData([]);
        setError(message(caught, 'Notifications could not be loaded.'));
        setStatus('error');
      });
    return () => controller.abort();
  }, [enabled, organizationId, reloadToken]);

  return { data, status, error, retry };
}

export function useGlobalSearch(organizationId: string, query: string) {
  const normalized = query.trim();
  const [data, setData] = useState<AggregateSearchItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>('ready');
  const [error, setError] = useState<string>();

  useLayoutEffect(() => {
    setData([]);
    setStatus(normalized.length >= 2 ? 'loading' : 'ready');
    setError(undefined);
  }, [normalized, organizationId]);

  useEffect(() => {
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void aggregateService
        .search(organizationId, normalized, controller.signal)
        .then((response) => {
          setData(response.data);
          setStatus('ready');
        })
        .catch((caught) => {
          if (isRequestCancelled(caught)) return;
          setData([]);
          setError(message(caught, 'Search could not be completed.'));
          setStatus('error');
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalized, organizationId]);

  return { data, status, error };
}
