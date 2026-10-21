import { useCallback, useEffect, useRef, useState } from 'react';
import type { Student, User } from '../../types';
import { isRequestCancelled } from '../../services/apiClient';
import {
  mapStaffDirectoryItemToUser,
  mapStudentListItemToStudent,
  studentAdministrationService,
} from '../../features/administration/api/studentAdministrationService';

export type AdministrationDataStatus = 'loading' | 'ready' | 'error';

function administrationErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Student administration data could not be loaded.';
}

export function useAuthorizedDirectory(
  authenticatedUser: User,
  organizationId: string,
) {
  const [currentUser, setCurrentUser] = useState<User>(authenticatedUser);
  const [allUsers, setAllUsers] = useState<User[]>([authenticatedUser]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [administrationDataStatus, setAdministrationDataStatus] =
    useState<AdministrationDataStatus>('loading');
  const [administrationDataError, setAdministrationDataError] = useState<
    string | undefined
  >();
  const hasLoadedAdministrationData = useRef(false);
  const requestSequenceRef = useRef(0);
  const requestControllerRef = useRef<AbortController | undefined>(undefined);

  const refreshData = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestStillCurrent = () =>
      requestSequenceRef.current === requestSequence &&
      requestControllerRef.current === controller;

    const isInitialLoad = !hasLoadedAdministrationData.current;
    if (isInitialLoad) setAdministrationDataStatus('loading');
    setAdministrationDataError(undefined);
    try {
      const canReadStaff = authenticatedUser.permissions.includes(
        'staff-directory:read',
      );
      const [studentsResponse, staffResponse] = await Promise.all([
        studentAdministrationService.getStudents(
          organizationId,
          controller.signal,
        ),
        canReadStaff
          ? studentAdministrationService.getStaff(
              organizationId,
              controller.signal,
            )
          : Promise.resolve(undefined),
      ]);
      const loadedStudents = studentsResponse.data.map(
        mapStudentListItemToStudent,
      );
      const loadedStaff = staffResponse?.data.map(mapStaffDirectoryItemToUser);
      const directoryUsers = loadedStaff?.map((user) =>
        user.membershipId === authenticatedUser.membershipId
          ? authenticatedUser
          : user,
      );

      if (!requestStillCurrent()) return;
      setCurrentUser(authenticatedUser);
      setAllUsers(directoryUsers ?? [authenticatedUser]);
      setStudents(loadedStudents);
      // The students endpoint is authorization-filtered for the active membership.
      setAssignedStudents(loadedStudents);
      hasLoadedAdministrationData.current = true;
      setAdministrationDataError(undefined);
      setAdministrationDataStatus('ready');
    } catch (error) {
      if (isRequestCancelled(error) || !requestStillCurrent()) return;
      setAdministrationDataError(administrationErrorMessage(error));
      if (isInitialLoad) {
        setStudents([]);
        setAssignedStudents([]);
        setAllUsers([authenticatedUser]);
        setAdministrationDataStatus('error');
      } else {
        setAdministrationDataStatus('ready');
      }
    }
  }, [authenticatedUser, organizationId]);

  useEffect(() => {
    void refreshData();
    return () => requestControllerRef.current?.abort();
  }, [refreshData]);

  return {
    currentUser,
    allUsers,
    students,
    assignedStudents,
    administrationDataStatus,
    administrationDataError,
    refreshData,
  };
}
