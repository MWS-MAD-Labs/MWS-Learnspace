import {
  attendanceBulkSaveResponseSchema,
  attendanceRosterResponseSchema,
  classesResponseSchema,
  organizationSchoolDateResponseSchema,
} from '@learnspace/contracts';
import type {
  AttendanceBulkSaveCommand,
  AttendanceBulkSaveResponse,
  AttendanceRosterResponse,
  ClassesResponse,
  OrganizationSchoolDateResponse,
} from '@learnspace/contracts';
import { apiClient } from './apiClient';

function organizationPath(organizationId: string): string {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}`;
}

export const attendanceService = {
  getSchoolDate(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<OrganizationSchoolDateResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/school-date`,
      {
        schema: organizationSchoolDateResponseSchema,
        signal,
      },
    );
  },
  getClasses(
    organizationId: string,
    signal?: AbortSignal,
  ): Promise<ClassesResponse> {
    return apiClient.request(`${organizationPath(organizationId)}/classes`, {
      schema: classesResponseSchema,
      signal,
    });
  },

  getRoster(
    organizationId: string,
    classId: string,
    schoolDate: string,
    signal?: AbortSignal,
  ): Promise<AttendanceRosterResponse> {
    const query = new URLSearchParams({ schoolDate });
    return apiClient.request(
      `${organizationPath(organizationId)}/classes/${encodeURIComponent(classId)}/attendance?${query}`,
      { schema: attendanceRosterResponseSchema, signal },
    );
  },

  saveRoster(
    organizationId: string,
    classId: string,
    command: AttendanceBulkSaveCommand,
    signal?: AbortSignal,
  ): Promise<AttendanceBulkSaveResponse> {
    return apiClient.request(
      `${organizationPath(organizationId)}/classes/${encodeURIComponent(classId)}/attendance`,
      {
        method: 'PUT',
        body: command,
        schema: attendanceBulkSaveResponseSchema,
        signal,
      },
    );
  },
};
