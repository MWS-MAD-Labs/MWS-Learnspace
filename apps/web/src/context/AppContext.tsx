import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { User, Student } from '../types';
import { isRequestCancelled } from '../services/apiClient';
import { storageService } from '../services/storageService';
import {
  mapStaffDirectoryItemToUser,
  mapStudentListItemToStudent,
  studentAdministrationService,
} from '../services/studentAdministrationService';

export type NavigationTab =
  | 'DASHBOARD'
  | 'ATTENDANCE'
  | 'LEARNING_JOURNEY_CALENDAR'
  | 'LEARNING_JOURNEY_TRACKER'
  | 'LEARNING_JOURNEY_EDITOR'
  | 'SPECIAL_ED_OBSERVATION'
  | 'SPECIAL_ED_IEP'
  | 'SPECIAL_ED_WEEKLY_REPORT'
  | 'REPORTS';

export type SpecialEdSubTab = 'FEDC' | 'SENSORY_PROFILE' | 'SFA';
export type AdministrationDataStatus = 'loading' | 'ready' | 'error';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface AppContextType {
  organizationId: string;
  currentUser: User;
  allUsers: User[];
  students: Student[];
  assignedStudents: Student[];
  administrationDataStatus: AdministrationDataStatus;
  administrationDataError?: string;
  activeTab: NavigationTab;
  specialEdSubTab: SpecialEdSubTab;
  selectedStudentId: string;
  selectedJourneyId: string | null;
  selectedIepId: string | null;
  searchQuery: string;
  toasts: ToastMessage[];
  isObservationDrawerOpen: boolean;

  switchRole: (userId: string) => void;
  setActiveTab: (tab: NavigationTab) => void;
  setSpecialEdSubTab: (subTab: SpecialEdSubTab) => void;
  setSelectedStudentId: (id: string) => void;
  setSelectedJourneyId: (id: string | null) => void;
  setSelectedIepId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsObservationDrawerOpen: (open: boolean) => void;
  toggleObservationDrawer: () => void;
  showToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message?: string,
  ) => void;
  dismissToast: (id: string) => void;
  refreshData: () => Promise<void>;
  resetAllDataToDefault: () => void;

  navigateToJourneyEditor: (journeyId?: string) => void;
  navigateToObservation: (studentId: string, type?: SpecialEdSubTab) => void;
  navigateToIEP: (studentId: string, iepId?: string) => void;
  navigateToWeeklyReport: (studentId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const demoRoleSwitcherEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_DEMO_ROLE_SWITCHER === 'true' &&
  import.meta.env.VITE_FAKE_DATA_MODE === 'true';

function administrationErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Student administration data could not be loaded.';
}

export const AppProvider: React.FC<{
  children: ReactNode;
  authenticatedUser: User;
  organizationId: string;
}> = ({ children, authenticatedUser, organizationId }) => {
  const [currentUser, setCurrentUser] = useState<User>(authenticatedUser);
  const [allUsers, setAllUsers] = useState<User[]>(() =>
    demoRoleSwitcherEnabled ? storageService.getUsers() : [authenticatedUser],
  );
  const [students, setStudents] = useState<Student[]>(() =>
    demoRoleSwitcherEnabled ? storageService.getStudents() : [],
  );
  const [assignedStudents, setAssignedStudents] = useState<Student[]>(() =>
    demoRoleSwitcherEnabled
      ? storageService.getStudentsForUser(authenticatedUser)
      : [],
  );
  const [administrationDataStatus, setAdministrationDataStatus] =
    useState<AdministrationDataStatus>(
      demoRoleSwitcherEnabled ? 'ready' : 'loading',
    );
  const [administrationDataError, setAdministrationDataError] = useState<
    string | undefined
  >();
  const hasLoadedAdministrationData = useRef(demoRoleSwitcherEnabled);

  const [activeTab, setActiveTab] = useState<NavigationTab>('DASHBOARD');
  const [specialEdSubTab, setSpecialEdSubTab] =
    useState<SpecialEdSubTab>('FEDC');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    demoRoleSwitcherEnabled ? 'stu-001' : '',
  );
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(
    null,
  );
  const [selectedIepId, setSelectedIepId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isObservationDrawerOpen, setIsObservationDrawerOpen] =
    useState<boolean>(false);

  const refreshData = useCallback(async () => {
    if (demoRoleSwitcherEnabled) {
      const user = storageService.getCurrentUser();
      const loadedStudents = storageService.getStudents();
      setCurrentUser(user);
      setAllUsers(storageService.getUsers());
      setStudents(loadedStudents);
      setAssignedStudents(storageService.getStudentsForUser(user));
      setAdministrationDataError(undefined);
      setAdministrationDataStatus('ready');
      return;
    }

    const isInitialLoad = !hasLoadedAdministrationData.current;
    if (isInitialLoad) setAdministrationDataStatus('loading');
    setAdministrationDataError(undefined);
    try {
      const canReadStaff = authenticatedUser.permissions.includes(
        'staff-directory:read',
      );
      const [studentsResponse, staffResponse] = await Promise.all([
        studentAdministrationService.getStudents(organizationId),
        canReadStaff
          ? studentAdministrationService.getStaff(organizationId)
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

      setCurrentUser(authenticatedUser);
      setAllUsers(directoryUsers ?? [authenticatedUser]);
      setStudents(loadedStudents);
      // The students endpoint is authorization-filtered for the active membership.
      setAssignedStudents(loadedStudents);
      setSelectedStudentId((selected) =>
        loadedStudents.some((student) => student.id === selected)
          ? selected
          : (loadedStudents[0]?.id ?? ''),
      );
      hasLoadedAdministrationData.current = true;
      setAdministrationDataError(undefined);
      setAdministrationDataStatus('ready');
    } catch (error) {
      if (isRequestCancelled(error)) return;
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
  }, [refreshData]);

  const toggleObservationDrawer = () => {
    setIsObservationDrawerOpen((prev) => !prev);
  };

  const switchRole = (userId: string) => {
    if (!demoRoleSwitcherEnabled) return;
    const updated = storageService.setCurrentUser(userId);
    setCurrentUser(updated);
    const userAssigned = storageService.getStudentsForUser(updated);
    setAssignedStudents(userAssigned);

    if (
      updated.isGPK ||
      (updated.role === 'SPECIAL_ED_TEACHER' && !updated.isSpecialEdCoordinator)
    ) {
      if (userAssigned.length > 0) setSelectedStudentId(userAssigned[0].id);
    }
    showToast(
      'info',
      `Switched Role to ${updated.roleTitle}`,
      `Now operating as ${updated.name}`,
    );
  };

  const showToast = (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message?: string,
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => dismissToast(id), 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const resetAllDataToDefault = () => {
    if (!demoRoleSwitcherEnabled) return;
    if (
      confirm(
        'Are you sure you want to reset all portal data to initial default state?',
      )
    ) {
      storageService.resetAllData();
    }
  };

  const navigateToJourneyEditor = (journeyId?: string) => {
    setSelectedJourneyId(journeyId || null);
    setActiveTab('LEARNING_JOURNEY_EDITOR');
  };

  const navigateToObservation = (
    studentId: string,
    type: SpecialEdSubTab = 'FEDC',
  ) => {
    setSelectedStudentId(studentId);
    setSpecialEdSubTab(type);
    setActiveTab('SPECIAL_ED_OBSERVATION');
  };

  const navigateToIEP = (studentId: string, iepId?: string) => {
    setSelectedStudentId(studentId);
    setSelectedIepId(iepId || null);
    setActiveTab('SPECIAL_ED_IEP');
  };

  const navigateToWeeklyReport = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('SPECIAL_ED_WEEKLY_REPORT');
  };

  const value: AppContextType = {
    organizationId,
    currentUser,
    allUsers,
    students,
    assignedStudents,
    administrationDataStatus,
    administrationDataError,
    activeTab,
    specialEdSubTab,
    selectedStudentId,
    selectedJourneyId,
    selectedIepId,
    searchQuery,
    toasts,
    isObservationDrawerOpen,
    switchRole,
    setActiveTab,
    setSpecialEdSubTab,
    setSelectedStudentId,
    setSelectedJourneyId,
    setSelectedIepId,
    setSearchQuery,
    setIsObservationDrawerOpen,
    toggleObservationDrawer,
    showToast,
    dismissToast,
    refreshData,
    resetAllDataToDefault,
    navigateToJourneyEditor,
    navigateToObservation,
    navigateToIEP,
    navigateToWeeklyReport,
  };

  return (
    <AppContext.Provider value={value}>
      {!demoRoleSwitcherEnabled && administrationDataStatus === 'loading' ? (
        <main
          className="grid min-h-screen place-items-center bg-[#FAF6F0] px-6"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 text-sm font-semibold text-stone-700">
            <RefreshCw className="h-5 w-5 animate-spin text-[#6E161E]" />
            Loading authorized students…
          </div>
        </main>
      ) : !demoRoleSwitcherEnabled && administrationDataStatus === 'error' ? (
        <main className="grid min-h-screen place-items-center bg-[#FAF6F0] px-6">
          <div className="max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <TriangleAlert className="mx-auto h-9 w-9 text-rose-700" />
            <h1 className="mt-3 text-lg font-black text-stone-900">
              Student data could not be loaded
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              {administrationDataError}
            </p>
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white"
              onClick={() => void refreshData()}
            >
              <RefreshCw className="h-4 w-4" />
              Retry loading data
            </button>
          </div>
        </main>
      ) : (
        <>
          {!demoRoleSwitcherEnabled && administrationDataError ? (
            <div
              role="alert"
              className="fixed right-4 top-4 z-[100] flex max-w-md items-start gap-3 rounded-2xl border border-rose-200 bg-white p-4 text-sm shadow-lg"
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
              <div>
                <p className="font-bold text-stone-900">Refresh failed</p>
                <p className="mt-1 text-stone-600">
                  Existing data is still shown. {administrationDataError}
                </p>
              </div>
            </div>
          ) : null}
          {children}
        </>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
