import {
  gradesResponseSchema,
  organizationAccountMutationResponseSchema,
  organizationAccountsResponseSchema,
  organizationSettingsResponseSchema,
  subjectsResponseSchema,
  unitsResponseSchema,
} from '@learnspace/contracts';
import type {
  GradesResponse,
  OrganizationAccountCreateCommand,
  OrganizationAccountMutationResponse,
  OrganizationAccountsResponse,
  OrganizationAccountUpdateCommand,
  OrganizationSettingsResponse,
  OrganizationSettingsUpdateCommand,
  SubjectsResponse,
  UnitsResponse,
} from '@learnspace/contracts';
import { apiClient } from './apiClient';

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export const organizationAdministrationService = {
  getSettings(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<OrganizationSettingsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/settings`, {
      schema: organizationSettingsResponseSchema,
      signal,
    });
  },

  updateSettings(
    organizationId: string,
    command: OrganizationSettingsUpdateCommand,
    signal?: AbortSignal,
  ): Promise<OrganizationSettingsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/settings`, {
      method: 'PATCH',
      body: command,
      schema: organizationSettingsResponseSchema,
      signal,
    });
  },
  getAccounts(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<OrganizationAccountsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/accounts`, {
      schema: organizationAccountsResponseSchema,
      signal,
    });
  },

  createAccount(
    organizationId: string,
    command: OrganizationAccountCreateCommand,
    signal?: AbortSignal,
  ): Promise<OrganizationAccountMutationResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/accounts`, {
      method: 'POST',
      body: command,
      schema: organizationAccountMutationResponseSchema,
      signal,
    });
  },

  updateAccount(
    organizationId: string,
    membershipId: string,
    command: OrganizationAccountUpdateCommand,
    signal?: AbortSignal,
  ): Promise<OrganizationAccountMutationResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/accounts/${encodeURIComponent(membershipId)}`,
      {
        method: 'PATCH',
        body: command,
        schema: organizationAccountMutationResponseSchema,
        signal,
      },
    );
  },

  getUnits(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<UnitsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/units`, {
      schema: unitsResponseSchema,
      signal,
    });
  },

  getGrades(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<GradesResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/grades`, {
      schema: gradesResponseSchema,
      signal,
    });
  },

  getSubjects(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<SubjectsResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/subjects`, {
      schema: subjectsResponseSchema,
      signal,
    });
  },
};
