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
import {
  mapStaffDirectoryItemToUser,
  mapStudentListItemToStudent,
  studentAdministrationService,
} from '../services/studentAdministrationService';

export type NavigationTab =
  | 'DASHBOARD'
  | 'ATTENDANCE'
  | 'PEOPLE_ACCESS'
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
  selectedWeeklyReportId: string | null;
  weeklyReportTrackerRequested: boolean;
  attendanceTarget: { studentId: string; classId: string } | null;
  selectedObservationAssignmentId: string | null;
  observationResultsStudentId: string | null;
  searchQuery: string;
  toasts: ToastMessage[];
  isObservationDrawerOpen: boolean;

  setActiveTab: (tab: NavigationTab) => void;
  setSpecialEdSubTab: (subTab: SpecialEdSubTab) => void;
  setSelectedStudentId: (id: string) => void;
  setSelectedJourneyId: (id: string | null) => void;
  setSelectedIepId: (id: string | null) => void;
  setSelectedWeeklyReportId: (id: string | null) => void;
  setWeeklyReportTrackerRequested: (requested: boolean) => void;
  setAttendanceTarget: (
    target: { studentId: string; classId: string } | null,
  ) => void;
  setSelectedObservationAssignmentId: (id: string | null) => void;
  setObservationResultsStudentId: (id: string | null) => void;
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

  navigateToJourneyEditor: (journeyId?: string) => void;
  navigateToObservation: (
    studentId: string,
    type?: SpecialEdSubTab,
    assignmentId?: string,
    target?: 'ALL_RESULTS',
  ) => void;
  navigateToIEP: (studentId: string, iepId?: string) => void;
  navigateToWeeklyReport: (studentId: string, reportId?: string) => void;
  navigateToWeeklyReportTracker: () => void;
  navigateToAttendanceStudent: (studentId: string, classId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const [allUsers, setAllUsers] = useState<User[]>([authenticatedUser]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [administrationDataStatus, setAdministrationDataStatus] =
    useState<AdministrationDataStatus>('loading');
  const [administrationDataError, setAdministrationDataError] = useState<
    string | undefined
  >();
  const hasLoadedAdministrationData = useRef(false);
  const administrationRequestSequenceRef = useRef(0);
  const administrationRequestControllerRef = useRef<AbortController>();

  const [activeTab, setActiveTab] = useState<NavigationTab>('DASHBOARD');
  const [specialEdSubTab, setSpecialEdSubTab] =
    useState<SpecialEdSubTab>('FEDC');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(
    null,
  );
  const [selectedIepId, setSelectedIepId] = useState<string | null>(null);
  const [selectedWeeklyReportId, setSelectedWeeklyReportId] = useState<
    string | null
  >(null);
  const [weeklyReportTrackerRequested, setWeeklyReportTrackerRequested] =
    useState(false);
  const [attendanceTarget, setAttendanceTarget] = useState<{
    studentId: string;
    classId: string;
  } | null>(null);
  const [selectedObservationAssignmentId, setSelectedObservationAssignmentId] =
    useState<string | null>(null);
  const [observationResultsStudentId, setObservationResultsStudentId] =
    useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isObservationDrawerOpen, setIsObservationDrawerOpen] =
    useState<boolean>(false);

  const refreshData = useCallback(async () => {
    const requestSequence = ++administrationRequestSequenceRef.current;
    administrationRequestControllerRef.current?.abort();
    const controller = new AbortController();
    administrationRequestControllerRef.current = controller;
    const requestStillCurrent = () =>
      administrationRequestSequenceRef.current === requestSequence &&
      administrationRequestControllerRef.current === controller;

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
      setSelectedStudentId((selected) =>
        loadedStudents.some((student) => student.id === selected)
          ? selected
          : (loadedStudents[0]?.id ?? ''),
      );
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
    return () => administrationRequestControllerRef.current?.abort();
  }, [refreshData]);

  const toggleObservationDrawer = () => {
    setIsObservationDrawerOpen((prev) => !prev);
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

  const navigateToJourneyEditor = (journeyId?: string) => {
    setSelectedJourneyId(journeyId || null);
    setActiveTab('LEARNING_JOURNEY_EDITOR');
  };

  const navigateToObservation = (
    studentId: string,
    type: SpecialEdSubTab = 'FEDC',
    assignmentId?: string,
    target?: 'ALL_RESULTS',
  ) => {
    setSelectedStudentId(studentId);
    setSpecialEdSubTab(type);
    setSelectedObservationAssignmentId(assignmentId ?? null);
    setObservationResultsStudentId(target === 'ALL_RESULTS' ? studentId : null);
    setActiveTab('SPECIAL_ED_OBSERVATION');
  };

  const navigateToIEP = (studentId: string, iepId?: string) => {
    setSelectedStudentId(studentId);
    setSelectedIepId(iepId || null);
    setActiveTab('SPECIAL_ED_IEP');
  };

  const navigateToWeeklyReport = (studentId: string, reportId?: string) => {
    setSelectedStudentId(studentId);
    setSelectedWeeklyReportId(reportId ?? null);
    setWeeklyReportTrackerRequested(false);
    setActiveTab('SPECIAL_ED_WEEKLY_REPORT');
  };

  const navigateToAttendanceStudent = (studentId: string, classId: string) => {
    setAttendanceTarget({ studentId, classId });
    setActiveTab('ATTENDANCE');
  };

  const navigateToWeeklyReportTracker = () => {
    setSelectedWeeklyReportId(null);
    setWeeklyReportTrackerRequested(true);
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
    selectedWeeklyReportId,
    weeklyReportTrackerRequested,
    attendanceTarget,
    selectedObservationAssignmentId,
    observationResultsStudentId,
    searchQuery,
    toasts,
    isObservationDrawerOpen,
    setActiveTab,
    setSpecialEdSubTab,
    setSelectedStudentId,
    setSelectedJourneyId,
    setSelectedIepId,
    setSelectedWeeklyReportId,
    setWeeklyReportTrackerRequested,
    setAttendanceTarget,
    setSelectedObservationAssignmentId,
    setObservationResultsStudentId,
    setSearchQuery,
    setIsObservationDrawerOpen,
    toggleObservationDrawer,
    showToast,
    dismissToast,
    refreshData,
    navigateToJourneyEditor,
    navigateToObservation,
    navigateToIEP,
    navigateToWeeklyReport,
    navigateToWeeklyReportTracker,
    navigateToAttendanceStudent,
  };

  return (
    <AppContext.Provider value={value}>
      {administrationDataStatus === 'loading' ? (
        <main
          className="grid min-h-screen place-items-center bg-[#FAF6F0] px-6"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 text-sm font-semibold text-stone-700">
            <RefreshCw className="h-5 w-5 animate-spin text-[#6E161E]" />
            Loading authorized students…
          </div>
        </main>
      ) : administrationDataStatus === 'error' ? (
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
          {administrationDataError ? (
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
