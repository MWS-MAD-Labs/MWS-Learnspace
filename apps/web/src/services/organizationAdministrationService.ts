import {
  gradesResponseSchema,
  organizationAccountMutationResponseSchema,
  organizationAccountsResponseSchema,
  subjectsResponseSchema,
  unitsResponseSchema,
} from '@learnspace/contracts';
import type {
  GradesResponse,
  OrganizationAccountCreateCommand,
  OrganizationAccountMutationResponse,
  OrganizationAccountsResponse,
  OrganizationAccountUpdateCommand,
  SubjectsResponse,
  UnitsResponse,
} from '@learnspace/contracts';
import { apiClient } from './apiClient';

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export const organizationAdministrationService = {
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
