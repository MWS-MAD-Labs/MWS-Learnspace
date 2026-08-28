import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  OrganizationAccountCreateCommand,
  OrganizationAccountsResponse,
} from '@learnspace/contracts';
import {
  AlertCircle,
  Check,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isRequestCancelled } from '../../services/apiClient';
import { organizationAdministrationService } from '../../services/organizationAdministrationService';

const roles = [
  'DIRECTOR',
  'PRINCIPAL',
  'GRADE_TEACHER',
  'SUBJECT_TEACHER',
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
] as const;

type Role = (typeof roles)[number];
type Account = OrganizationAccountsResponse['data'][number];
type Option = { id: string; name: string };
type Feedback = { text: string; kind: 'success' | 'error' };
type FormState = {
  membershipId?: string;
  email: string;
  displayName: string;
  role: Role;
  roleTitle: string;
  userStatus: 'ACTIVE' | 'DISABLED';
  membershipStatus: 'ACTIVE' | 'DISABLED';
  unitIds: string[];
  gradeIds: string[];
  subjectIds: string[];
};

const emptyForm: FormState = {
  email: '',
  displayName: '',
  role: 'GRADE_TEACHER',
  roleTitle: '',
  userStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  unitIds: [],
  gradeIds: [],
  subjectIds: [],
};

function formForAccount(account: Account): FormState {
  return {
    membershipId: account.membershipId,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    roleTitle: account.roleTitle ?? '',
    userStatus: account.userStatus,
    membershipStatus: account.membershipStatus,
    unitIds: account.unitIds,
    gradeIds: account.gradeIds,
    subjectIds: account.subjectIds,
  };
}

function roleLabel(role: Role): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function ScopePicker({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-stone-200 p-3">
      <legend className="px-1 text-xs font-bold text-stone-700">{title}</legend>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
            {option.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const PeopleAccessView: React.FC = () => {
  const { session, currentUser } = useAuth();
  const membership = session?.memberships[0];
  const organizationId = membership?.organizationId;
  const canAdmin =
    membership?.permissions.includes('organization:admin') ?? false;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [grades, setGrades] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [organizationName, setOrganizationName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const timezoneDraft = useRef('UTC');
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [timezoneState, setTimezoneState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [timezoneError, setTimezoneError] = useState<string>();
  const [timezoneFeedback, setTimezoneFeedback] = useState<Feedback>();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const loadController = useRef<AbortController>();
  const settingsController = useRef<AbortController>();

  const loadSettings = useCallback(async () => {
    if (!organizationId || !canAdmin) return;
    settingsController.current?.abort();
    const controller = new AbortController();
    settingsController.current = controller;
    setTimezoneState('loading');
    setTimezoneError(undefined);
    setTimezoneFeedback(undefined);
    try {
      const settingsResponse =
        await organizationAdministrationService.getSettings(
          organizationId,
          controller.signal,
        );
      setOrganizationName(settingsResponse.data.name);
      timezoneDraft.current = settingsResponse.data.timezone;
      setTimezone(settingsResponse.data.timezone);
      setTimezoneState('ready');
    } catch (error) {
      if (isRequestCancelled(error)) return;
      setTimezoneState('error');
      setTimezoneError(
        error instanceof Error
          ? error.message
          : 'Organization timezone could not be loaded.',
      );
    } finally {
      if (settingsController.current === controller) {
        settingsController.current = undefined;
      }
    }
  }, [canAdmin, organizationId]);

  const load = useCallback(async () => {
    if (!organizationId || !canAdmin) return;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setState('loading');
    setFeedback(undefined);
    try {
      const [accountResponse, unitResponse, gradeResponse, subjectResponse] =
        await Promise.all([
          organizationAdministrationService.getAccounts(
            organizationId,
            controller.signal,
          ),
          organizationAdministrationService.getUnits(
            organizationId,
            controller.signal,
          ),
          organizationAdministrationService.getGrades(
            organizationId,
            controller.signal,
          ),
          organizationAdministrationService.getSubjects(
            organizationId,
            controller.signal,
          ),
        ]);
      setAccounts(accountResponse.data);
      setUnits(unitResponse.data.map(({ id, name }) => ({ id, name })));
      setGrades(gradeResponse.data.map(({ id, name }) => ({ id, name })));
      setSubjects(subjectResponse.data.map(({ id, name }) => ({ id, name })));
      setState('ready');
    } catch (error) {
      if (isRequestCancelled(error)) return;
      setFeedback({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'People and access could not be loaded.',
      });
      setState('error');
    } finally {
      if (loadController.current === controller) {
        loadController.current = undefined;
      }
    }
  }, [canAdmin, organizationId]);

  useEffect(() => {
    void load();
    void loadSettings();
    return () => {
      loadController.current?.abort();
      settingsController.current?.abort();
    };
  }, [load, loadSettings]);

  const saveTimezone = async () => {
    if (!organizationId || savingTimezone) return;
    const submittedTimezone = timezone;
    setSavingTimezone(true);
    setTimezoneFeedback(undefined);
    try {
      const response = await organizationAdministrationService.updateSettings(
        organizationId,
        { timezone: submittedTimezone },
      );
      if (timezoneDraft.current === submittedTimezone) {
        timezoneDraft.current = response.data.timezone;
        setTimezone(response.data.timezone);
        setTimezoneFeedback({
          kind: 'success',
          text: 'Organization timezone updated.',
        });
      } else {
        setTimezoneFeedback({
          kind: 'success',
          text: `${response.data.timezone} was saved. Your current draft (${timezoneDraft.current}) still needs saving.`,
        });
      }
    } catch (error) {
      setTimezoneFeedback({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Organization timezone could not be saved.',
      });
    } finally {
      setSavingTimezone(false);
    }
  };

  const isEditing = Boolean(form.membershipId);
  const scopeMode = useMemo(() => {
    if (form.role === 'GRADE_TEACHER') return 'grade';
    if (form.role === 'SUBJECT_TEACHER') return 'subject';
    return 'none';
  }, [form.role]);

  const selectRole = (role: Role) => {
    setForm((current) => ({
      ...current,
      role,
      unitIds: role === 'GRADE_TEACHER' ? current.unitIds : [],
      gradeIds: role === 'GRADE_TEACHER' ? current.gradeIds : [],
      subjectIds: role === 'SUBJECT_TEACHER' ? current.subjectIds : [],
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationId) return;
    setSaving(true);
    setFeedback(undefined);
    try {
      const common = {
        email: form.email,
        displayName: form.displayName,
        role: form.role,
        roleTitle: form.roleTitle.trim() || null,
        unitIds: form.unitIds,
        gradeIds: form.gradeIds,
        subjectIds: form.subjectIds,
      } satisfies OrganizationAccountCreateCommand;
      const response = form.membershipId
        ? await organizationAdministrationService.updateAccount(
            organizationId,
            form.membershipId,
            {
              ...common,
              userStatus: form.userStatus,
              membershipStatus: form.membershipStatus,
            },
          )
        : await organizationAdministrationService.createAccount(
            organizationId,
            common,
          );
      setAccounts((current) => {
        const withoutSaved = current.filter(
          (account) => account.membershipId !== response.data.membershipId,
        );
        return [...withoutSaved, response.data].sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        );
      });
      setForm(formForAccount(response.data));
      setFeedback({
        kind: 'success',
        text: isEditing ? 'Account access updated.' : 'Account access created.',
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Account access could not be saved.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!membership || !currentUser || !canAdmin) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-700" />
        <h1 className="mt-3 text-xl font-black">People & access denied</h1>
        <p className="mt-2 text-sm text-stone-600">
          Your membership cannot administer organization accounts.
        </p>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-stone-200 bg-white">
        <div className="text-center text-sm font-semibold text-stone-600">
          <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin" />
          Loading people and access…
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-700" />
        <h1 className="mt-3 text-xl font-black">
          People & access could not be loaded
        </h1>
        <p className="mt-2 text-sm text-stone-600">{feedback?.text}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6E161E] px-4 py-2 text-xs font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#6E161E]">
          Organization administration
        </p>
        <h1 className="mt-1 text-2xl font-black text-stone-900">
          People & access
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Manage authoritative staff identities, memberships, roles, statuses,
          and scopes.
        </p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="font-black">School timezone</h2>
        <p className="mt-1 text-xs text-stone-600">
          Dashboard dates, attendance scope, and assignment authorization use
          the IANA timezone configured for {organizationName}.
        </p>
        {timezoneState === 'error' && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {timezoneError}
            <button
              type="button"
              onClick={() => void loadSettings()}
              className="ml-2 font-bold underline"
            >
              Retry timezone
            </button>
          </div>
        )}
        {timezoneFeedback && (
          <div
            role={timezoneFeedback.kind === 'error' ? 'alert' : 'status'}
            className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
              timezoneFeedback.kind === 'error'
                ? 'bg-rose-50 text-rose-800'
                : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            {timezoneFeedback.text}
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-bold text-stone-700">
            IANA timezone
            <input
              value={timezone}
              onChange={(event) => {
                timezoneDraft.current = event.target.value;
                setTimezone(event.target.value);
                setTimezoneFeedback(undefined);
              }}
              placeholder="America/Los_Angeles"
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <button
            type="button"
            onClick={() => void saveTimezone()}
            disabled={savingTimezone || timezoneState !== 'ready'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6E161E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {savingTimezone ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save timezone
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black">Organization accounts</h2>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setFeedback(undefined);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" /> New account
            </button>
          </div>
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                type="button"
                key={account.membershipId}
                onClick={() => {
                  setForm(formForAccount(account));
                  setFeedback(undefined);
                }}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  form.membershipId === account.membershipId
                    ? 'border-[#6E161E] bg-[#6E161E]/5'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{account.displayName}</p>
                    <p className="text-xs text-stone-500">{account.email}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6E161E]">
                      {account.roleTitle ?? roleLabel(account.role)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      account.userStatus === 'ACTIVE' &&
                      account.membershipStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {account.userStatus === 'ACTIVE' &&
                    account.membershipStatus === 'ACTIVE'
                      ? 'Active'
                      : 'Disabled'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <form
          onSubmit={(event) => void save(event)}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-[#6E161E]" />
            <h2 className="font-black">
              {isEditing ? 'Edit account access' : 'Create account access'}
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-stone-700">
              Display name
              <input
                aria-label="Display name"
                required
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-stone-700">
              Email
              <input
                aria-label="Email"
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-stone-700">
              Role
              <select
                aria-label="Role"
                value={form.role}
                onChange={(event) => selectRole(event.target.value as Role)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-stone-700">
              Role title
              <input
                aria-label="Role title"
                value={form.roleTitle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roleTitle: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            {isEditing && (
              <>
                <label className="text-xs font-bold text-stone-700">
                  User status
                  <select
                    aria-label="User status"
                    value={form.userStatus}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        userStatus: event.target
                          .value as FormState['userStatus'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-stone-700">
                  Membership status
                  <select
                    aria-label="Membership status"
                    value={form.membershipStatus}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        membershipStatus: event.target
                          .value as FormState['membershipStatus'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </label>
              </>
            )}
          </div>

          {scopeMode === 'grade' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ScopePicker
                title="Unit scopes"
                options={units}
                selected={form.unitIds}
                onChange={(unitIds) =>
                  setForm((current) => ({ ...current, unitIds }))
                }
              />
              <ScopePicker
                title="Grade scopes"
                options={grades}
                selected={form.gradeIds}
                onChange={(gradeIds) =>
                  setForm((current) => ({ ...current, gradeIds }))
                }
              />
            </div>
          )}
          {scopeMode === 'subject' && (
            <div className="mt-4">
              <ScopePicker
                title="Subject scopes"
                options={subjects}
                selected={form.subjectIds}
                onChange={(subjectIds) =>
                  setForm((current) => ({ ...current, subjectIds }))
                }
              />
            </div>
          )}

          {feedback && (
            <div
              role={feedback.kind === 'error' ? 'alert' : 'status'}
              className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                feedback.kind === 'error'
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {feedback.kind === 'error' ? (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              {feedback.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#6E161E] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? 'Save access changes' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};
