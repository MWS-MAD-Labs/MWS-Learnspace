import React, { Component, lazy, Suspense, type ErrorInfo } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './features/dashboard/pages/DashboardView';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthGate } from './features/auth/components/AuthGate';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';

const AttendancePage = lazy(() =>
  import('./features/attendance/pages/AttendancePage').then((module) => ({
    default: module.AttendancePage,
  })),
);
const PeopleAccessView = lazy(() =>
  import('./features/administration/pages/PeopleAccessView').then((module) => ({
    default: module.PeopleAccessView,
  })),
);
const LearningJourneyCalendar = lazy(() =>
  import('./features/learning-journeys/pages/LearningJourneyCalendar').then(
    (module) => ({ default: module.LearningJourneyCalendar }),
  ),
);
const LearningJourneyStatusTracker = lazy(() =>
  import('./features/learning-journeys/pages/LearningJourneyStatusTracker').then(
    (module) => ({ default: module.LearningJourneyStatusTracker }),
  ),
);
const LearningJourneyEditor = lazy(() =>
  import('./features/learning-journeys/pages/LearningJourneyEditor').then(
    (module) => ({ default: module.LearningJourneyEditor }),
  ),
);
const ObservationPage = lazy(() =>
  import('./features/observations/pages/ObservationPage').then((module) => ({
    default: module.ObservationPage,
  })),
);
const IEPPlanView = lazy(() =>
  import('./features/ieps/pages/IEPPlanView').then((module) => ({
    default: module.IEPPlanView,
  })),
);
const WeeklyReportView = lazy(() =>
  import('./features/weekly-reports/pages/WeeklyReportView').then((module) => ({
    default: module.WeeklyReportView,
  })),
);
const ReportsAnalyticsView = lazy(() =>
  import('./features/dashboard/pages/ReportsAnalyticsView').then((module) => ({
    default: module.ReportsAnalyticsView,
  })),
);
const ObservationReferenceDrawer = lazy(() =>
  import('./features/observations/components/history/ObservationReferenceDrawer').then(
    (module) => ({ default: module.ObservationReferenceDrawer }),
  ),
);

const ContentFallback = () => (
  <div className="grid min-h-48 place-items-center text-sm font-semibold text-stone-500">
    Loading workspace…
  </div>
);

class ApplicationErrorBoundary extends Component<
  { children: React.ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application route failed to render', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#FAF6F0] px-6">
          <section className="max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-black text-stone-900">
              This page could not be displayed
            </h1>
            <p className="mt-3 text-sm text-stone-600">
              Try reloading the page. If the problem continues, return to the
              dashboard.
            </p>
            <a
              href="/dashboard"
              className="mt-5 inline-flex rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white"
            >
              Return to dashboard
            </a>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const ProtectedLayout: React.FC = () => {
  const { currentUser, session } = useAuth();
  const organizationId = session?.memberships[0]?.organizationId;
  if (!currentUser || !organizationId) return null;

  return (
    <AppProvider
      authenticatedUser={currentUser}
      organizationId={organizationId}
    >
      <ApplicationLayout />
    </AppProvider>
  );
};

const ApplicationLayout: React.FC = () => {
  const {
    isObservationDrawerOpen,
    setIsObservationDrawerOpen,
    selectedStudentId,
    navigateToObservation,
  } = useApp();

  return (
    <AppShell>
      <Suspense fallback={<ContentFallback />}>
        <Outlet />
        {isObservationDrawerOpen && (
          <ObservationReferenceDrawer
            isOpen
            onClose={() => setIsObservationDrawerOpen(false)}
            studentId={selectedStudentId}
            onNavigateToFull={(type) => {
              setIsObservationDrawerOpen(false);
              navigateToObservation(selectedStudentId, type);
            }}
          />
        )}
      </Suspense>
      <ToastContainer />
    </AppShell>
  );
};

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-[#EFE7DC] bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-[#6E161E]">
        404
      </p>
      <h1 className="mt-2 text-2xl font-black text-stone-900">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-stone-600">
        The requested Learnspace page does not exist.
      </p>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mt-5 rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white"
      >
        Return to dashboard
      </button>
    </section>
  );
};

export function AppRoutes() {
  return (
    <AuthProvider>
      <AuthGate>
        <ApplicationErrorBoundary>
          <Routes>
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardView />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="people" element={<PeopleAccessView />} />
              <Route path="reports" element={<ReportsAnalyticsView />} />
              <Route
                path="journeys/calendar"
                element={<LearningJourneyCalendar />}
              />
              <Route
                path="journeys/tracker"
                element={<LearningJourneyStatusTracker />}
              />
              <Route path="journeys/new" element={<LearningJourneyEditor />} />
              <Route
                path="journeys/:journeyId"
                element={<LearningJourneyEditor />}
              />
              <Route
                path="journeys/:journeyId/edit"
                element={<LearningJourneyEditor />}
              />
              <Route path="observations" element={<ObservationPage />} />
              <Route
                path="observations/assignments/:assignmentId"
                element={<ObservationPage />}
              />
              <Route
                path="observations/students/:studentId/results"
                element={<ObservationPage />}
              />
              <Route
                path="observations/manage/gpk/:studentId?"
                element={<ObservationPage />}
              />
              <Route
                path="observations/manage/assignments/:studentId?"
                element={<ObservationPage />}
              />
              <Route
                path="observations/manage/forms/:studentId?"
                element={<ObservationPage />}
              />
              <Route
                path="observations/manage/results/:studentId?"
                element={<ObservationPage />}
              />
              <Route path="ieps" element={<IEPPlanView />} />
              <Route
                path="students/:studentId/ieps"
                element={<IEPPlanView />}
              />
              <Route
                path="students/:studentId/ieps/:iepId"
                element={<IEPPlanView />}
              />
              <Route
                path="students/:studentId/ieps/:iepId/edit"
                element={<IEPPlanView />}
              />
              <Route path="weekly-reports" element={<WeeklyReportView />} />
              <Route
                path="weekly-reports/tracker"
                element={<WeeklyReportView />}
              />
              <Route
                path="students/:studentId/weekly-reports"
                element={<WeeklyReportView />}
              />
              <Route
                path="students/:studentId/weekly-reports/new"
                element={<WeeklyReportView />}
              />
              <Route
                path="students/:studentId/weekly-reports/:reportId"
                element={<WeeklyReportView />}
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ApplicationErrorBoundary>
      </AuthGate>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
