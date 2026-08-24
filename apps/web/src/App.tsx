import React, { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGate } from './components/auth/AuthGate';

const AttendanceView = lazy(() =>
  import('./components/attendance/AttendanceView').then((module) => ({
    default: module.AttendanceView,
  })),
);
const LearningJourneyCalendar = lazy(() =>
  import('./components/learning-journey/LearningJourneyCalendar').then(
    (module) => ({ default: module.LearningJourneyCalendar }),
  ),
);
const LearningJourneyStatusTracker = lazy(() =>
  import('./components/learning-journey/LearningJourneyStatusTracker').then(
    (module) => ({ default: module.LearningJourneyStatusTracker }),
  ),
);
const LearningJourneyEditor = lazy(() =>
  import('./components/learning-journey/LearningJourneyEditor').then(
    (module) => ({ default: module.LearningJourneyEditor }),
  ),
);
const ObservationToolsView = lazy(() =>
  import('./components/special-ed/ObservationToolsView').then((module) => ({
    default: module.ObservationToolsView,
  })),
);
const IEPPlanView = lazy(() =>
  import('./components/special-ed/IEPPlanView').then((module) => ({
    default: module.IEPPlanView,
  })),
);
const WeeklyReportView = lazy(() =>
  import('./components/special-ed/WeeklyReportView').then((module) => ({
    default: module.WeeklyReportView,
  })),
);
const ReportsAnalyticsView = lazy(() =>
  import('./components/dashboard/ReportsAnalyticsView').then((module) => ({
    default: module.ReportsAnalyticsView,
  })),
);
const ObservationReferenceDrawer = lazy(() =>
  import('./components/common/ObservationReferenceDrawer').then((module) => ({
    default: module.ObservationReferenceDrawer,
  })),
);

const ContentFallback = () => (
  <div className="grid min-h-48 place-items-center text-sm font-semibold text-stone-500">
    Loading workspace…
  </div>
);

const MainContent: React.FC = () => {
  const {
    activeTab,
    isObservationDrawerOpen,
    setIsObservationDrawerOpen,
    selectedStudentId,
    navigateToObservation,
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
      <Suspense fallback={<ContentFallback />}>
        {renderTabContent()}
        {isObservationDrawerOpen && (
          <ObservationReferenceDrawer
            isOpen
            onClose={() => setIsObservationDrawerOpen(false)}
            studentId={selectedStudentId}
            onNavigateToFull={navigateToObservation}
          />
        )}
      </Suspense>
      <ToastContainer />
    </AppShell>
  );
};

const AuthenticatedApplication: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  return (
    <AppProvider authenticatedUser={currentUser}>
      <MainContent />
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AuthenticatedApplication />
      </AuthGate>
    </AuthProvider>
  );
}
