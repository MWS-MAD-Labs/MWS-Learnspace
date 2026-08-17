import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  Student, 
  LearningJourney, 
  IEPRecord, 
  IEPReport, 
  FEDCObservationRecord, 
  SensoryProfileRecord, 
  SFAObservationRecord,
  AttendanceRecord
} from '../types';
import { storageService } from '../services/storageService';

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

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface AppContextType {
  currentUser: User;
  allUsers: User[];
  students: Student[];
  assignedStudents: Student[];
  activeTab: NavigationTab;
  specialEdSubTab: SpecialEdSubTab;
  selectedStudentId: string;
  selectedJourneyId: string | null;
  selectedIepId: string | null;
  searchQuery: string;
  toasts: ToastMessage[];
  isObservationDrawerOpen: boolean;
  
  // Actions
  switchRole: (userId: string) => void;
  setActiveTab: (tab: NavigationTab) => void;
  setSpecialEdSubTab: (subTab: SpecialEdSubTab) => void;
  setSelectedStudentId: (id: string) => void;
  setSelectedJourneyId: (id: string | null) => void;
  setSelectedIepId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsObservationDrawerOpen: (open: boolean) => void;
  toggleObservationDrawer: () => void;
  showToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  refreshData: () => void;
  resetAllDataToDefault: () => void;
  
  // Quick navigation helpers
  navigateToJourneyEditor: (journeyId?: string) => void;
  navigateToObservation: (studentId: string, type?: SpecialEdSubTab) => void;
  navigateToIEP: (studentId: string, iepId?: string) => void;
  navigateToWeeklyReport: (studentId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => storageService.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(() => storageService.getUsers());
  const [students, setStudents] = useState<Student[]>(() => storageService.getStudents());
  const [assignedStudents, setAssignedStudents] = useState<Student[]>(() => 
    storageService.getStudentsForUser(currentUser)
  );
  
  const [activeTab, setActiveTab] = useState<NavigationTab>('DASHBOARD');
  const [specialEdSubTab, setSpecialEdSubTab] = useState<SpecialEdSubTab>('FEDC');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('stu-001');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [selectedIepId, setSelectedIepId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isObservationDrawerOpen, setIsObservationDrawerOpen] = useState<boolean>(false);

  const toggleObservationDrawer = () => {
    setIsObservationDrawerOpen(prev => !prev);
  };

  const refreshData = () => {
    const user = storageService.getCurrentUser();
    setCurrentUser(user);
    setAllUsers(storageService.getUsers());
    const allStuds = storageService.getStudents();
    setStudents(allStuds);
    setAssignedStudents(storageService.getStudentsForUser(user));
  };

  const switchRole = (userId: string) => {
    const updated = storageService.setCurrentUser(userId);
    setCurrentUser(updated);
    const userAssigned = storageService.getStudentsForUser(updated);
    setAssignedStudents(userAssigned);

    // If SE/GPK teacher, auto-focus their assigned student
    if (updated.isGPK || (updated.role === 'SPECIAL_ED_TEACHER' && !updated.isSpecialEdCoordinator)) {
      if (userAssigned.length > 0) {
        setSelectedStudentId(userAssigned[0].id);
      }
    }
    showToast('info', `Switched Role to ${updated.roleTitle}`, `Now operating as ${updated.name}`);
  };

  const showToast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const resetAllDataToDefault = () => {
    if (confirm('Are you sure you want to reset all portal data to initial default state?')) {
      storageService.resetAllData();
    }
  };

  const navigateToJourneyEditor = (journeyId?: string) => {
    setSelectedJourneyId(journeyId || null);
    setActiveTab('LEARNING_JOURNEY_EDITOR');
  };

  const navigateToObservation = (studentId: string, type: SpecialEdSubTab = 'FEDC') => {
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        students,
        assignedStudents,
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
        navigateToWeeklyReport
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
