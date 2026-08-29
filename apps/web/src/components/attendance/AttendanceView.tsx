import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AttendanceRosterResponse,
  AttendanceStatus,
  ClassesResponse,
} from '@learnspace/contracts';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ApiClientError, isRequestCancelled } from '../../services/apiClient';
import { attendanceService } from '../../services/attendanceService';

const STATUSES: AttendanceStatus[] = [
  'PRESENT',
  'LATE',
  'SICK',
  'EXCUSED_ABSENCE',
  'UNEXCUSED_ABSENCE',
];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  SICK: 'Sick',
  EXCUSED_ABSENCE: 'Excused absence',
  UNEXCUSED_ABSENCE: 'Unexcused absence',
};

type DraftRecord = {
  status: AttendanceStatus;
  minutesLate: number | null;
  notes: string;
};

type DraftMap = Record<string, DraftRecord>;
type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'denied';
type SaveState =
  'idle' | 'saving' | 'success' | 'validation' | 'conflict' | 'error';

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseSchoolDate(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function shiftSchoolDate(value: string, days: number): string {
  const { year, month, day } = parseSchoolDate(value);
  const date = new Date(year, month - 1, day + days, 12);
  return formatDateParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function displaySchoolDate(value: string): string {
  const { year, month, day } = parseSchoolDate(value);
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function draftsFromRoster(response: AttendanceRosterResponse): DraftMap {
  return Object.fromEntries(
    response.data.roster.map(({ student, attendance }) => [
      student.id,
      attendance
        ? {
            status: attendance.status,
            minutesLate: attendance.minutesLate,
            notes: attendance.notes ?? '',
          }
        : { status: 'PRESENT' as const, minutesLate: null, notes: '' },
    ]),
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const reference = error.requestId ? ` Reference: ${error.requestId}.` : '';
    return `${error.message}${reference}`;
  }
  return 'An unexpected error occurred.';
}

export const AttendanceView: React.FC = () => {
  const { session, currentUser } = useAuth();
  const { attendanceTarget, setAttendanceTarget } = useApp();
  const membership = session?.memberships[0];
  const organizationId = membership?.organizationId;
  const canRead = membership?.permissions.includes('attendance:read') ?? false;
  const canWrite =
    membership?.permissions.includes('attendance:write') ?? false;

  const [schoolDate, setSchoolDate] = useState('');
  const [schoolDateReady, setSchoolDateReady] = useState(false);
  const [schoolDateError, setSchoolDateError] = useState('');
  const [schoolDateReloadKey, setSchoolDateReloadKey] = useState(0);
  const [classes, setClasses] = useState<ClassesResponse['data']>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classesState, setClassesState] = useState<LoadState>('idle');
  const [classesError, setClassesError] = useState('');
  const [rosterState, setRosterState] = useState<LoadState>('idle');
  const [rosterError, setRosterError] = useState('');
  const [rosterResponse, setRosterResponse] =
    useState<AttendanceRosterResponse>();
  const [serverVersion, setServerVersion] = useState('');
  const [serverSnapshot, setServerSnapshot] = useState<DraftMap>({});
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [search, setSearch] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [classesReloadKey, setClassesReloadKey] = useState(0);
  const [rosterReloadKey, setRosterReloadKey] = useState(0);
  const preserveDraftsOnNextLoad = useRef(false);
  const attendanceContextKey = `${organizationId ?? ''}:${selectedClassId}:${schoolDate}`;
  const attendanceContextKeyRef = useRef(attendanceContextKey);
  attendanceContextKeyRef.current = attendanceContextKey;
  const saveSequenceRef = useRef(0);
  const attendanceTargetRef = useRef(attendanceTarget);
  const consumedAttendanceTargetRef = useRef<string | null>(null);

  useEffect(() => {
    attendanceTargetRef.current = attendanceTarget;
  }, [attendanceTarget]);

  useEffect(() => {
    if (!organizationId || !canRead) return;
    const controller = new AbortController();
    setSchoolDateReady(false);
    setSchoolDate('');
    setSchoolDateError('');
    setRosterResponse(undefined);
    setRosterState('idle');
    void attendanceService
      .getSchoolDate(organizationId, controller.signal)
      .then((response) => {
        setSchoolDate(response.data.schoolDate);
        setSchoolDateReady(true);
      })
      .catch((error: unknown) => {
        if (isRequestCancelled(error)) return;
        setSchoolDateError(
          error instanceof Error
            ? error.message
            : 'The organization school date could not be loaded.',
        );
      });
    return () => controller.abort();
  }, [organizationId, canRead, schoolDateReloadKey]);

  useEffect(() => {
    if (!organizationId || !canRead) {
      setClassesState('denied');
      return;
    }
    const controller = new AbortController();
    setClassesState('loading');
    setClassesError('');
    attendanceService
      .getClasses(organizationId, controller.signal)
      .then((response) => {
        setClasses(response.data);
        setSelectedClassId((current) => {
          const targetClassId = attendanceTargetRef.current?.classId;
          if (response.data.some((item) => item.id === targetClassId)) {
            return targetClassId ?? '';
          }
          return response.data.some((item) => item.id === current)
            ? current
            : (response.data[0]?.id ?? '');
        });
        setClassesState('ready');
      })
      .catch((error: unknown) => {
        if (isRequestCancelled(error)) return;
        setClassesState(
          error instanceof ApiClientError && error.category === 'authz'
            ? 'denied'
            : 'error',
        );
        setClassesError(errorMessage(error));
      });
    return () => controller.abort();
  }, [organizationId, canRead, classesReloadKey]);

  useEffect(() => {
    if (!attendanceTarget) {
      consumedAttendanceTargetRef.current = null;
      return;
    }
    const targetKey = `${attendanceTarget.classId}:${attendanceTarget.studentId}`;
    if (consumedAttendanceTargetRef.current === targetKey) return;
    if (!classes.some((item) => item.id === attendanceTarget.classId)) return;
    if (selectedClassId !== attendanceTarget.classId) {
      setSelectedClassId(attendanceTarget.classId);
      return;
    }
    if (
      rosterState !== 'ready' ||
      rosterResponse?.data.class.id !== attendanceTarget.classId ||
      rosterResponse.data.schoolDate !== schoolDate
    ) {
      return;
    }

    const target = rosterResponse.data.roster.find(
      ({ student }) => student.id === attendanceTarget.studentId,
    );
    consumedAttendanceTargetRef.current = targetKey;
    attendanceTargetRef.current = null;
    setAttendanceTarget(null);
    if (!target) return;

    setSearch(target.student.studentNumber);
    window.setTimeout(() => {
      document
        .getElementById(`attendance-student-${attendanceTarget.studentId}`)
        ?.focus();
    }, 0);
  }, [
    attendanceTarget,
    classes,
    rosterResponse,
    rosterState,
    schoolDate,
    selectedClassId,
    setAttendanceTarget,
  ]);

  useLayoutEffect(() => {
    saveSequenceRef.current += 1;
    setSaveState('idle');
    setSaveMessage('');
    setValidationErrors({});
  }, [attendanceContextKey]);

  const loadRoster = useCallback(
    (keepDrafts: boolean) => {
      if (!organizationId || !selectedClassId || !canRead || !schoolDateReady)
        return () => undefined;
      const controller = new AbortController();
      setRosterState('loading');
      setRosterError('');
      if (!keepDrafts) setSaveState('idle');
      attendanceService
        .getRoster(
          organizationId,
          selectedClassId,
          schoolDate,
          controller.signal,
        )
        .then((response) => {
          const loadedDrafts = draftsFromRoster(response);
          setRosterResponse(response);
          setServerVersion(response.data.version);
          setServerSnapshot(loadedDrafts);
          setDrafts((current) => {
            if (!keepDrafts) return loadedDrafts;
            return Object.fromEntries(
              response.data.roster.map(({ student }) => [
                student.id,
                current[student.id] ?? loadedDrafts[student.id],
              ]),
            );
          });
          setRosterState('ready');
          if (keepDrafts) {
            setSaveState('idle');
            setSaveMessage(
              'Latest server version loaded; your draft changes were kept.',
            );
          }
        })
        .catch((error: unknown) => {
          if (isRequestCancelled(error)) return;
          setRosterState(
            error instanceof ApiClientError && error.category === 'authz'
              ? 'denied'
              : 'error',
          );
          setRosterError(errorMessage(error));
        });
      return () => controller.abort();
    },
    [canRead, organizationId, schoolDate, schoolDateReady, selectedClassId],
  );

  useEffect(() => {
    const keepDrafts = preserveDraftsOnNextLoad.current;
    preserveDraftsOnNextLoad.current = false;
    return loadRoster(keepDrafts);
  }, [loadRoster, rosterReloadKey]);

  const roster = rosterResponse?.data.roster ?? [];
  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter(({ student }) =>
      [student.fullName, student.nickname ?? '', student.studentNumber].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [roster, search]);

  const dirtyCount = roster.filter(({ student, attendance }) => {
    const draft = drafts[student.id];
    const snapshot = serverSnapshot[student.id];
    if (!draft || !snapshot) return false;
    if (!attendance) return true;
    return JSON.stringify(draft) !== JSON.stringify(snapshot);
  }).length;

  const updateDraft = (studentId: string, update: Partial<DraftRecord>) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...current[studentId], ...update },
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });
    setSaveState('idle');
    setSaveMessage('');
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    updateDraft(studentId, {
      status,
      minutesLate:
        status === 'LATE' ? (drafts[studentId]?.minutesLate ?? null) : null,
    });
  };

  const validateDrafts = (): boolean => {
    const errors: Record<string, string> = {};
    roster.forEach(({ student }) => {
      const draft = drafts[student.id];
      if (
        draft?.status === 'LATE' &&
        (!Number.isInteger(draft.minutesLate) ||
          draft.minutesLate == null ||
          draft.minutesLate < 1 ||
          draft.minutesLate > 1440)
      ) {
        errors[student.id] = 'Enter whole minutes from 1 to 1440 for Late.';
      }
    });
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaveState('validation');
      setSaveMessage('Fix the highlighted late-minute values before saving.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (
      !organizationId ||
      !selectedClassId ||
      !canWrite ||
      !schoolDateReady ||
      roster.length === 0
    )
      return;
    if (!validateDrafts()) return;

    const savedDrafts = Object.fromEntries(
      roster.map(({ student }) => {
        const draft = drafts[student.id] ?? {
          status: 'PRESENT' as const,
          minutesLate: null,
          notes: '',
        };
        return [
          student.id,
          {
            status: draft.status,
            minutesLate: draft.status === 'LATE' ? draft.minutesLate : null,
            notes: draft.notes.trim(),
          },
        ];
      }),
    ) satisfies DraftMap;

    const saveContextKey = attendanceContextKey;
    const saveSequence = ++saveSequenceRef.current;
    const saveStillCurrent = () =>
      attendanceContextKeyRef.current === saveContextKey &&
      saveSequenceRef.current === saveSequence;

    setSaveState('saving');
    setSaveMessage('Saving attendance…');
    try {
      const response = await attendanceService.saveRoster(
        organizationId,
        selectedClassId,
        {
          schoolDate,
          expectedVersion: serverVersion,
          records: roster.map(({ student }) => {
            const draft = savedDrafts[student.id];
            return {
              studentId: student.id,
              status: draft.status,
              minutesLate: draft.minutesLate,
              notes: draft.notes || null,
            };
          }),
        },
      );
      if (!saveStillCurrent()) return;
      const savedAt = new Date().toISOString();
      setRosterResponse((current) =>
        current
          ? {
              data: {
                ...current.data,
                version: response.data.version,
                roster: current.data.roster.map((item) => {
                  const draft = savedDrafts[item.student.id];
                  return {
                    ...item,
                    attendance: {
                      id: item.attendance?.id ?? crypto.randomUUID(),
                      status: draft.status,
                      minutesLate: draft.minutesLate,
                      notes: draft.notes || null,
                      updatedAt: savedAt,
                    },
                  };
                }),
              },
            }
          : current,
      );
      setServerVersion(response.data.version);
      setServerSnapshot(savedDrafts);
      setDrafts(savedDrafts);
      setSaveState('success');
      setSaveMessage(
        `Saved attendance for ${response.data.savedCount} students.`,
      );
    } catch (error) {
      if (!saveStillCurrent()) return;
      if (error instanceof ApiClientError && error.category === 'conflict') {
        setSaveState('conflict');
        setSaveMessage(
          'Attendance changed on the server. Reload the latest version; your drafts will be preserved.',
        );
      } else if (
        error instanceof ApiClientError &&
        error.category === 'validation'
      ) {
        setSaveState('validation');
        setSaveMessage(errorMessage(error));
      } else if (
        error instanceof ApiClientError &&
        error.category === 'authz'
      ) {
        setSaveState('error');
        setSaveMessage(`Authorization denied. ${errorMessage(error)}`);
      } else {
        setSaveState('error');
        setSaveMessage(errorMessage(error));
      }
    }
  };

  const reloadRoster = (keepDrafts: boolean) => {
    preserveDraftsOnNextLoad.current = keepDrafts;
    setRosterReloadKey((value) => value + 1);
  };

  if (!membership || !currentUser || !canRead || classesState === 'denied') {
    return (
      <StateCard icon={ShieldAlert} title="Attendance access denied">
        Your authenticated membership does not allow attendance access for this
        organization.
      </StateCard>
    );
  }

  if (!schoolDateReady) {
    return (
      <StateCard
        icon={schoolDateError ? AlertCircle : RefreshCw}
        title={
          schoolDateError
            ? 'Could not load the school date'
            : 'Loading the school date…'
        }
      >
        {schoolDateError ? (
          <>
            <p>{schoolDateError}</p>
            <RetryButton
              onClick={() => setSchoolDateReloadKey((value) => value + 1)}
            />
          </>
        ) : (
          'Attendance will remain unavailable until the organization school date is confirmed.'
        )}
      </StateCard>
    );
  }

  if (classesState === 'loading' || classesState === 'idle') {
    return (
      <StateCard icon={RefreshCw} title="Loading authorized classes…">
        Please wait while Learnspace loads your class access.
      </StateCard>
    );
  }

  if (classesState === 'error') {
    return (
      <StateCard icon={AlertCircle} title="Could not load classes">
        <p>{classesError}</p>
        <RetryButton
          onClick={() => setClassesReloadKey((value) => value + 1)}
        />
      </StateCard>
    );
  }

  if (classes.length === 0) {
    return (
      <StateCard icon={Users} title="No authorized classes">
        No attendance classes are available for your current membership.
      </StateCard>
    );
  }

  return (
    <div
      className="mx-auto max-w-7xl space-y-5 pb-12"
      id="attendance-view-container"
    >
      <header className="rounded-3xl border border-[#EFE7DC] bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6E161E]">
              Class attendance
            </p>
            <h1 className="mt-1 text-2xl font-black text-stone-900">
              Daily Attendance Roster
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Signed in as {currentUser.name} · {membership.organizationName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-stone-600">
              <span className="sr-only">Class</span>
              <select
                aria-label="Class"
                className="rounded-xl border border-[#E8DFC8] bg-[#FAF5EF] px-3 py-2"
                value={selectedClassId}
                onChange={(event) => {
                  preserveDraftsOnNextLoad.current = false;
                  setSelectedClassId(event.target.value);
                }}
              >
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name} ({schoolClass.code})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center rounded-xl border border-[#E8DFC8] bg-[#FAF5EF] p-1">
              <button
                aria-label="Previous day"
                className="rounded-lg p-1.5"
                onClick={() =>
                  setSchoolDate((value) => shiftSchoolDate(value, -1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <CalendarIcon className="ml-1 h-4 w-4 text-[#6E161E]" />
              <input
                aria-label="School date"
                className="w-32 bg-transparent px-2 text-xs font-bold"
                type="date"
                value={schoolDate}
                onChange={(event) => setSchoolDate(event.target.value)}
              />
              <button
                aria-label="Next day"
                className="rounded-lg p-1.5"
                onClick={() =>
                  setSchoolDate((value) => shiftSchoolDate(value, 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                !canWrite ||
                !schoolDateReady ||
                rosterState !== 'ready' ||
                roster.length === 0 ||
                saveState === 'saving'
              }
              onClick={() => void handleSave()}
            >
              {saveState === 'saving' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveState === 'saving' ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        </div>
      </header>

      {!canWrite && (
        <Banner tone="neutral" title="Read-only attendance">
          You can view this roster, but your membership does not include
          attendance:write.
        </Banner>
      )}
      {saveMessage && (
        <Banner
          tone={
            saveState === 'success'
              ? 'success'
              : saveState === 'conflict' ||
                  saveState === 'validation' ||
                  saveState === 'error'
                ? 'error'
                : 'neutral'
          }
          title={
            saveState === 'success'
              ? 'Attendance saved'
              : saveState === 'conflict'
                ? 'Save conflict'
                : saveState === 'validation'
                  ? 'Validation required'
                  : 'Attendance update'
          }
        >
          <span>{saveMessage}</span>
          {saveState === 'conflict' && (
            <button
              className="ml-3 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#6E161E]"
              onClick={() => reloadRoster(true)}
            >
              Reload latest and keep drafts
            </button>
          )}
        </Banner>
      )}

      {rosterState === 'loading' && (
        <StateCard icon={RefreshCw} title="Loading attendance roster…">
          Loading {displaySchoolDate(schoolDate)}.
        </StateCard>
      )}
      {rosterState === 'denied' && (
        <StateCard icon={ShieldAlert} title="Authorization denied">
          You are not authorized to view this class roster.
        </StateCard>
      )}
      {rosterState === 'error' && (
        <StateCard icon={AlertCircle} title="Could not load attendance">
          <p>{rosterError}</p>
          <RetryButton onClick={() => reloadRoster(false)} />
        </StateCard>
      )}

      {rosterState === 'ready' && roster.length === 0 && (
        <StateCard icon={Users} title="No students enrolled">
          This class has no active students on {displaySchoolDate(schoolDate)}.
        </StateCard>
      )}

      {rosterState === 'ready' && roster.length > 0 && (
        <>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-xs font-semibold text-stone-500">
              {roster.length} students · {dirtyCount} unsaved{' '}
              {dirtyCount === 1 ? 'draft' : 'drafts'} · server version{' '}
              {serverVersion}
            </div>
            <label className="relative block sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                aria-label="Search students"
                className="w-full rounded-xl border border-[#E8DFC8] bg-white py-2 pl-9 pr-3 text-xs"
                placeholder="Search name or student number"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          {filteredRoster.length === 0 ? (
            <StateCard icon={Search} title="No students found">
              No loaded students match your search.
            </StateCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRoster.map(({ student, attendance }) => {
                const draft = drafts[student.id];
                if (!draft) return null;
                return (
                  <article
                    key={student.id}
                    id={`attendance-student-${student.id}`}
                    tabIndex={-1}
                    className="rounded-2xl border border-[#EFE7DC] bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      {student.avatarUrl ? (
                        <img
                          alt=""
                          className="h-12 w-12 rounded-full object-cover"
                          src={student.avatarUrl}
                        />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-stone-100 font-bold text-stone-500">
                          {student.fullName.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-bold text-stone-900">
                          {student.fullName}
                        </h2>
                        <p className="text-xs text-stone-500">
                          {student.studentNumber}
                        </p>
                        {!attendance && (
                          <p className="mt-1 text-[11px] font-semibold text-amber-700">
                            Unsaved draft defaults to Present
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <label className="block text-xs font-bold text-stone-600">
                        Status
                        <select
                          aria-label={`Status for ${student.fullName}`}
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                          disabled={!canWrite}
                          value={draft.status}
                          onChange={(event) =>
                            handleStatusChange(
                              student.id,
                              event.target.value as AttendanceStatus,
                            )
                          }
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {draft.status === 'LATE' && (
                        <label className="block text-xs font-bold text-stone-600">
                          Minutes late
                          <input
                            aria-label={`Minutes late for ${student.fullName}`}
                            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                            disabled={!canWrite}
                            min="1"
                            max="1440"
                            step="1"
                            type="number"
                            value={draft.minutesLate ?? ''}
                            onChange={(event) =>
                              updateDraft(student.id, {
                                minutesLate:
                                  event.target.value === ''
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                          />
                          {validationErrors[student.id] && (
                            <span className="mt-1 block text-xs font-medium text-red-700">
                              {validationErrors[student.id]}
                            </span>
                          )}
                        </label>
                      )}
                      <label className="block text-xs font-bold text-stone-600">
                        Notes
                        <textarea
                          aria-label={`Notes for ${student.fullName}`}
                          className="mt-1 min-h-16 w-full resize-y rounded-xl border border-stone-200 px-3 py-2 text-sm"
                          disabled={!canWrite}
                          maxLength={1000}
                          value={draft.notes}
                          onChange={(event) =>
                            updateDraft(student.id, {
                              notes: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const StateCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="mx-auto max-w-2xl rounded-3xl border border-[#EFE7DC] bg-white p-10 text-center shadow-xs">
    <Icon className="mx-auto h-8 w-8 text-[#6E161E]" />
    <h2 className="mt-3 text-lg font-bold text-stone-900">{title}</h2>
    <div className="mt-2 text-sm text-stone-600">{children}</div>
  </div>
);

const RetryButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white"
    onClick={onClick}
  >
    <RefreshCw className="h-4 w-4" />
    Retry
  </button>
);

const Banner: React.FC<{
  tone: 'neutral' | 'success' | 'error';
  title: string;
  children: React.ReactNode;
}> = ({ tone, title, children }) => (
  <div
    role="status"
    className={`rounded-2xl border px-4 py-3 text-sm ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : tone === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-stone-200 bg-stone-50 text-stone-700'}`}
  >
    <span className="font-bold">{title}: </span>
    {children}
  </div>
);
