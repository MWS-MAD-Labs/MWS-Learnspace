import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { LearningJourneyCalendar } from './components/learning-journey/LearningJourneyCalendar';
import { LearningJourneyStatusTracker } from './components/learning-journey/LearningJourneyStatusTracker';
import { LearningJourneyEditor } from './components/learning-journey/LearningJourneyEditor';
import { ObservationToolsView } from './components/special-ed/ObservationToolsView';
import { IEPPlanView } from './components/special-ed/IEPPlanView';
import { WeeklyReportView } from './components/special-ed/WeeklyReportView';
import { ReportsAnalyticsView } from './components/dashboard/ReportsAnalyticsView';
import { ObservationReferenceDrawer } from './components/common/ObservationReferenceDrawer';
import { ToastContainer } from './components/common/ToastContainer';

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    isObservationDrawerOpen, 
    setIsObservationDrawerOpen, 
    selectedStudentId, 
    navigateToObservation 
  } = useApp();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return <DashboardView />;
      case 'ATTENDANCE':
        return <AttendanceView />;
      case 'LEARNING_JOURNEY_CALENDAR':
        return <LearningJourneyCalendar />;
      case 'LEARNING_JOURNEY_TRACKER':
        return <LearningJourneyStatusTracker />;
      case 'LEARNING_JOURNEY_EDITOR':
        return <LearningJourneyEditor />;
      case 'SPECIAL_ED_OBSERVATION':
        return <ObservationToolsView />;
      case 'SPECIAL_ED_IEP':
        return <IEPPlanView />;
      case 'SPECIAL_ED_WEEKLY_REPORT':
        return <WeeklyReportView />;
      case 'REPORTS':
        return <ReportsAnalyticsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <AppShell>
      {renderTabContent()}
      <ObservationReferenceDrawer 
        isOpen={isObservationDrawerOpen}
        onClose={() => setIsObservationDrawerOpen(false)}
        studentId={selectedStudentId}
        onNavigateToFull={navigateToObservation}
      />
      <ToastContainer />
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
