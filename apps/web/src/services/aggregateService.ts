import {
  aggregateNotificationsResponseSchema,
  aggregateSearchResponseSchema,
  dashboardSummaryResponseSchema,
  reportingAggregateResponseSchema,
  type AggregateNotificationsResponse,
  type AggregateSearchResponse,
  type DashboardSummaryResponse,
  type ReportingAggregateResponse,
} from '@learnspace/contracts';
import { apiClient } from './apiClient';

function organizationPath(organizationId: string, suffix: string) {
  return `/api/v1/organizations/${organizationId}/${suffix}`;
}

export const aggregateService = {
  getDashboard(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<DashboardSummaryResponse> {
    return apiClient.request(
      organizationPath(organizationId, 'dashboard-summary'),
      {
        schema: dashboardSummaryResponseSchema,
        signal,
      },
    );
  },
  search(
    organizationId: string,
    query: string,
    signal?: AbortSignal,
  ): Promise<AggregateSearchResponse> {
    const search = new URLSearchParams({ q: query, limit: '10', offset: '0' });
    return apiClient.request(
      `${organizationPath(organizationId, 'search')}?${search.toString()}`,
      { schema: aggregateSearchResponseSchema, signal },
    );
  },
  getNotifications(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<AggregateNotificationsResponse> {
    return apiClient.request(
      organizationPath(organizationId, 'notifications'),
      {
        schema: aggregateNotificationsResponseSchema,
        signal,
      },
    );
  },
  getReportingAggregate(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<ReportingAggregateResponse> {
    return apiClient.request(
      organizationPath(organizationId, 'reporting-aggregate'),
      {
        schema: reportingAggregateResponseSchema,
        signal,
      },
    );
  },
};
