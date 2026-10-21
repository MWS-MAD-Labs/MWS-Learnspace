import React, { createContext, useContext, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { User, Student } from '../types';
import {
  useAuthorizedDirectory,
  type AdministrationDataStatus,
} from '../app/state/useAuthorizedDirectory';
import {
  useNavigationState,
  type NavigationTab,
  type ObservationManageTab,
  type SpecialEdSubTab,
} from '../app/state/useNavigationState';
import { useObservationState } from '../app/state/useObservationState';
import { useToastState, type ToastMessage } from '../app/state/useToastState';

export type {
  AdministrationDataStatus,
  NavigationTab,
  ObservationManageTab,
  SpecialEdSubTab,
};
export type { ToastMessage };

export interface AppContextType {
  organizationId: string;
  currentUser: User;
  allUsers: User[];
  students: Student[];
  assignedStudents: Student[];
  administrationDataStatus: AdministrationDataStatus;
  administrationDataError?: string;
  activeTab: NavigationTab;
  specialEdSubTab: SpecialEdSubTab;
  observationManageTab: ObservationManageTab;
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
  navigateToJourneyDetail: (journeyId: string) => void;
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

export const AppProvider: React.FC<{
  children: ReactNode;
  authenticatedUser: User;
  organizationId: string;
}> = ({ children, authenticatedUser, organizationId }) => {
  const observation = useObservationState();
  const navigation = useNavigationState();
  const directory = useAuthorizedDirectory(authenticatedUser, organizationId);
  const toast = useToastState();

  const {
    currentUser,
    allUsers,
    students,
    assignedStudents,
    administrationDataStatus,
    administrationDataError,
    refreshData,
  } = directory;
  const {
    activeTab,
    setActiveTab,
    specialEdSubTab,
    setSpecialEdSubTab,
    observationManageTab,
    selectedStudentId,
    setSelectedStudentId,
    selectedJourneyId,
    setSelectedJourneyId,
    selectedIepId,
    setSelectedIepId,
    selectedWeeklyReportId,
    setSelectedWeeklyReportId,
    weeklyReportTrackerRequested,
    setWeeklyReportTrackerRequested,
    attendanceTarget,
    setAttendanceTarget,
    searchQuery,
    setSearchQuery,
    navigateToJourneyEditor,
    navigateToJourneyDetail,
    navigateToObservation,
    navigateToIEP,
    navigateToWeeklyReport,
    navigateToWeeklyReportTracker,
    navigateToAttendanceStudent,
  } = navigation;
  const {
    isObservationDrawerOpen,
    setIsObservationDrawerOpen,
    toggleObservationDrawer,
  } = observation;
  const { toasts, showToast, dismissToast } = toast;

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
    observationManageTab,
    selectedStudentId,
    selectedJourneyId,
    selectedIepId,
    selectedWeeklyReportId,
    weeklyReportTrackerRequested,
    attendanceTarget,
    selectedObservationAssignmentId: navigation.selectedObservationAssignmentId,
    observationResultsStudentId: navigation.observationResultsStudentId,
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
    setSelectedObservationAssignmentId:
      navigation.setSelectedObservationAssignmentId,
    setObservationResultsStudentId: navigation.setObservationResultsStudentId,
    setSearchQuery,
    setIsObservationDrawerOpen,
    toggleObservationDrawer,
    showToast,
    dismissToast,
    refreshData,
    navigateToJourneyEditor,
    navigateToJourneyDetail,
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
