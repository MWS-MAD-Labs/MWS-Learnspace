import { useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';

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
export type ObservationManageTab = 'gpk' | 'assignments' | 'forms' | 'results';

const tabPaths: Record<NavigationTab, string> = {
  DASHBOARD: '/dashboard',
  ATTENDANCE: '/attendance',
  PEOPLE_ACCESS: '/people',
  LEARNING_JOURNEY_CALENDAR: '/journeys/calendar',
  LEARNING_JOURNEY_TRACKER: '/journeys/tracker',
  LEARNING_JOURNEY_EDITOR: '/journeys/new',
  SPECIAL_ED_OBSERVATION: '/observations',
  SPECIAL_ED_IEP: '/ieps',
  SPECIAL_ED_WEEKLY_REPORT: '/weekly-reports',
  REPORTS: '/reports',
};

function routeParam(pathname: string, pattern: string, name: string) {
  return (
    matchPath({ path: pattern, end: true }, pathname)?.params[name] ?? null
  );
}

function activeTabForPath(pathname: string): NavigationTab {
  if (pathname === '/attendance') return 'ATTENDANCE';
  if (pathname === '/people') return 'PEOPLE_ACCESS';
  if (pathname === '/reports') return 'REPORTS';
  if (pathname === '/journeys/calendar') return 'LEARNING_JOURNEY_CALENDAR';
  if (pathname === '/journeys/tracker') return 'LEARNING_JOURNEY_TRACKER';
  if (pathname.startsWith('/journeys/')) return 'LEARNING_JOURNEY_EDITOR';
  if (pathname.startsWith('/observations')) return 'SPECIAL_ED_OBSERVATION';
  if (pathname === '/ieps' || pathname.includes('/ieps'))
    return 'SPECIAL_ED_IEP';
  if (
    pathname.startsWith('/weekly-reports') ||
    pathname.includes('/weekly-reports')
  ) {
    return 'SPECIAL_ED_WEEKLY_REPORT';
  }
  return 'DASHBOARD';
}

function instrumentFrom(value: string | null): SpecialEdSubTab {
  return value === 'SENSORY_PROFILE' || value === 'SFA' ? value : 'FEDC';
}

export function useNavigationState() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const query = new URLSearchParams(location.search);
  const pathname = location.pathname;

  const journeyId =
    routeParam(pathname, '/journeys/:journeyId', 'journeyId') ??
    routeParam(pathname, '/journeys/:journeyId/edit', 'journeyId');
  const iepStudentId =
    routeParam(pathname, '/students/:studentId/ieps', 'studentId') ??
    routeParam(pathname, '/students/:studentId/ieps/:iepId', 'studentId') ??
    routeParam(pathname, '/students/:studentId/ieps/:iepId/edit', 'studentId');
  const weeklyStudentId =
    routeParam(pathname, '/students/:studentId/weekly-reports', 'studentId') ??
    routeParam(
      pathname,
      '/students/:studentId/weekly-reports/new',
      'studentId',
    ) ??
    routeParam(
      pathname,
      '/students/:studentId/weekly-reports/:reportId',
      'studentId',
    );
  const resultsStudentId = routeParam(
    pathname,
    '/observations/students/:studentId/results',
    'studentId',
  );
  const manageMatch = matchPath(
    '/observations/manage/:manageTab/:studentId?',
    pathname,
  );
  const manageStudentId = manageMatch?.params.studentId ?? null;
  const selectedStudentId =
    iepStudentId ??
    weeklyStudentId ??
    resultsStudentId ??
    manageStudentId ??
    query.get('studentId') ??
    '';
  const selectedObservationAssignmentId = routeParam(
    pathname,
    '/observations/assignments/:assignmentId',
    'assignmentId',
  );
  const observationManageTab = (manageMatch?.params.manageTab ??
    'gpk') as ObservationManageTab;

  const navigateWithQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    navigate({ pathname, search: next.toString(), hash: location.hash });
  };

  const setActiveTab = (tab: NavigationTab) => navigate(tabPaths[tab]);
  const setSpecialEdSubTab = (subTab: SpecialEdSubTab) =>
    navigateWithQuery({ instrument: subTab });
  const setSelectedStudentId = (id: string) =>
    navigateWithQuery({ studentId: id || null });
  const setSelectedJourneyId = (id: string | null) => {
    if (id)
      navigate(`/journeys/${encodeURIComponent(id)}/edit`, { replace: true });
  };
  const setSelectedIepId = (id: string | null) => {
    if (id && selectedStudentId) {
      navigate(
        `/students/${encodeURIComponent(selectedStudentId)}/ieps/${encodeURIComponent(id)}`,
        { replace: true },
      );
    }
  };
  const setSelectedWeeklyReportId = (id: string | null) => {
    if (id && selectedStudentId) {
      navigate(
        `/students/${encodeURIComponent(selectedStudentId)}/weekly-reports/${encodeURIComponent(id)}`,
        { replace: true },
      );
    } else if (pathname.includes('/weekly-reports')) {
      navigate(
        selectedStudentId
          ? `/students/${encodeURIComponent(selectedStudentId)}/weekly-reports/new`
          : '/weekly-reports',
        { replace: true },
      );
    }
  };
  const setWeeklyReportTrackerRequested = (requested: boolean) => {
    if (requested) navigate('/weekly-reports/tracker');
  };
  const setAttendanceTarget = (
    target: { studentId: string; classId: string } | null,
  ) => {
    if (target) {
      navigate(
        `/attendance?classId=${encodeURIComponent(target.classId)}&studentId=${encodeURIComponent(target.studentId)}`,
      );
    }
  };
  const setSelectedObservationAssignmentId = (id: string | null) => {
    if (id) navigate(`/observations/assignments/${encodeURIComponent(id)}`);
  };
  const setObservationResultsStudentId = (id: string | null) => {
    if (id)
      navigate(`/observations/students/${encodeURIComponent(id)}/results`);
  };

  const navigateToJourneyEditor = (id?: string) =>
    navigate(id ? `/journeys/${encodeURIComponent(id)}/edit` : '/journeys/new');
  const navigateToJourneyDetail = (id: string) =>
    navigate(`/journeys/${encodeURIComponent(id)}`);
  const navigateToObservation = (
    studentId: string,
    type: SpecialEdSubTab = 'FEDC',
    assignmentId?: string,
    target?: 'ALL_RESULTS',
  ) => {
    if (assignmentId) {
      navigate(
        `/observations/assignments/${encodeURIComponent(assignmentId)}?instrument=${type}`,
      );
    } else if (target === 'ALL_RESULTS') {
      navigate(
        `/observations/students/${encodeURIComponent(studentId)}/results`,
      );
    } else {
      navigate(
        `/observations?studentId=${encodeURIComponent(studentId)}&instrument=${type}`,
      );
    }
  };
  const navigateToIEP = (studentId: string, iepId?: string) =>
    navigate(
      iepId
        ? `/students/${encodeURIComponent(studentId)}/ieps/${encodeURIComponent(iepId)}`
        : `/students/${encodeURIComponent(studentId)}/ieps`,
    );
  const navigateToWeeklyReport = (studentId: string, reportId?: string) =>
    navigate(
      reportId
        ? `/students/${encodeURIComponent(studentId)}/weekly-reports/${encodeURIComponent(reportId)}`
        : `/students/${encodeURIComponent(studentId)}/weekly-reports/new`,
      reportId ? { replace: true } : undefined,
    );

  return {
    activeTab: activeTabForPath(pathname),
    setActiveTab,
    specialEdSubTab: instrumentFrom(query.get('instrument')),
    setSpecialEdSubTab,
    observationManageTab,
    selectedStudentId,
    setSelectedStudentId,
    selectedJourneyId: journeyId,
    setSelectedJourneyId,
    selectedIepId:
      routeParam(pathname, '/students/:studentId/ieps/:iepId', 'iepId') ??
      routeParam(pathname, '/students/:studentId/ieps/:iepId/edit', 'iepId'),
    setSelectedIepId,
    selectedWeeklyReportId: routeParam(
      pathname,
      '/students/:studentId/weekly-reports/:reportId',
      'reportId',
    ),
    setSelectedWeeklyReportId,
    weeklyReportTrackerRequested: pathname === '/weekly-reports/tracker',
    setWeeklyReportTrackerRequested,
    attendanceTarget:
      query.get('studentId') && query.get('classId')
        ? { studentId: query.get('studentId')!, classId: query.get('classId')! }
        : null,
    setAttendanceTarget,
    selectedObservationAssignmentId,
    setSelectedObservationAssignmentId,
    observationResultsStudentId:
      resultsStudentId ??
      (observationManageTab === 'results' ? manageStudentId : null),
    setObservationResultsStudentId,
    searchQuery,
    setSearchQuery,
    navigateToJourneyEditor,
    navigateToJourneyDetail,
    navigateToObservation,
    navigateToIEP,
    navigateToWeeklyReport,
    navigateToWeeklyReportTracker: () => navigate('/weekly-reports/tracker'),
    navigateToAttendanceStudent: (studentId: string, classId: string) =>
      setAttendanceTarget({ studentId, classId }),
  };
}
