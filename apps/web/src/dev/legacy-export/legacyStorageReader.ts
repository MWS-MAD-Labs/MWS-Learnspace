import {
  LEARNSPACE_EXPORT_FORMAT,
  LEARNSPACE_EXPORT_VERSION,
  learnspaceExportSchema,
  type LearnspaceExportV1,
} from '@learnspace/contracts';

export const LEGACY_STORAGE_KEYS = {
  users: 'mws_users_v2',
  currentUserId: 'mws_current_user_id_v2',
  students: 'mws_students_v2',
  learningJourneys: 'mws_learning_journeys_v2',
  fedcObservations: 'mws_fedc_observations_v2',
  sensoryProfileObservations: 'mws_sensory_profiles_v2',
  sfaObservations: 'mws_sfa_observations_v2',
  ieps: 'mws_iep_records_v2',
  weeklyReports: 'mws_iep_reports_v2',
  observationAssignments: 'mws_observation_assignments_v2',
  observationDefinitions: 'mws_observation_forms_v2',
} as const;

const JSON_COLLECTION_KEYS = Object.entries(LEGACY_STORAGE_KEYS).filter(
  ([name]) => name !== 'currentUserId',
) as [Exclude<keyof typeof LEGACY_STORAGE_KEYS, 'currentUserId'>, string][];

export class LegacyExportError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'LegacyExportError';
  }
}

const parseCollection = (storage: Storage, name: string, key: string) => {
  const raw = storage.getItem(key);
  if (raw === null) {
    throw new LegacyExportError(`Missing legacy storage key "${key}".`);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new LegacyExportError(
      `Legacy storage key "${key}" contains malformed JSON.`,
    );
  }
  if (!Array.isArray(value)) {
    throw new LegacyExportError(
      `Legacy storage key "${key}" must contain an array for ${name}.`,
    );
  }
  return value;
};

const uniqueStrings = (values: unknown[]) =>
  [
    ...new Set(
      values.filter((value): value is string => typeof value === 'string'),
    ),
  ].sort();

export function buildLegacyExport(
  storage: Storage,
  options: {
    exportedAt?: string;
    applicationVersion: string;
    targetOrganizationId?: string | null;
  },
): LearnspaceExportV1 {
  const rawCollections = Object.fromEntries(
    JSON_COLLECTION_KEYS.map(([name, key]) => [
      name,
      parseCollection(storage, name, key),
    ]),
  ) as Record<
    Exclude<keyof typeof LEGACY_STORAGE_KEYS, 'currentUserId'>,
    unknown[]
  >;

  const currentUserId = storage.getItem(LEGACY_STORAGE_KEYS.currentUserId);
  if (currentUserId === null || currentUserId.trim() === '') {
    throw new LegacyExportError(
      `Missing legacy storage key "${LEGACY_STORAGE_KEYS.currentUserId}".`,
    );
  }

  const students = rawCollections.students as Record<string, unknown>[];
  const journeys = rawCollections.learningJourneys as Record<string, unknown>[];
  const ieps = rawCollections.ieps as Record<string, unknown>[];

  const candidate = {
    format: LEARNSPACE_EXPORT_FORMAT,
    version: LEARNSPACE_EXPORT_VERSION,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    source: {
      application: 'learnspace-web',
      applicationVersion: options.applicationVersion,
      storageVersion: 2,
    },
    organization: {
      sourceKey: 'legacy-browser-v2',
      targetOrganizationId: options.targetOrganizationId ?? null,
      academicYears: uniqueStrings([
        ...journeys.map((value) => value.academicYear),
        ...ieps.map((value) => value.academicYear),
      ]),
      semesters: uniqueStrings([
        ...journeys.map((value) => value.semester),
        ...ieps.map((value) => value.semester),
      ]),
      units: uniqueStrings([
        ...students.map((value) => value.unit),
        ...journeys.map((value) => value.unit),
        ...ieps.map((value) => value.unit),
      ]),
      grades: uniqueStrings([
        ...students.map((value) => value.grade),
        ...journeys.map((value) => value.grade),
        ...ieps.map((value) => value.grade),
      ]),
      classes: uniqueStrings(students.map((value) => value.className)),
      subjects: uniqueStrings(journeys.map((value) => value.subject)),
    },
    records: rawCollections,
  };

  const result = learnspaceExportSchema.safeParse(candidate);
  if (!result.success) {
    throw new LegacyExportError(
      'Legacy browser data cannot be exported until validation errors are fixed.',
      result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'export'}: ${issue.message}`,
      ),
    );
  }

  const currentUserExists = result.data.records.users.some(
    ({ id }) => id === currentUserId,
  );
  if (!currentUserExists) {
    throw new LegacyExportError(
      `Current user source ID "${currentUserId}" does not exist in exported users.`,
    );
  }

  return result.data;
}

export function downloadLegacyExport(exportDocument: LearnspaceExportV1) {
  const date = exportDocument.exportedAt.slice(0, 10);
  const blob = new Blob([`${JSON.stringify(exportDocument, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `learnspace-export-v1-${date}-SENSITIVE.json`;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}
