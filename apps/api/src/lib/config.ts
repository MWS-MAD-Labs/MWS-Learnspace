import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);
const optionalUuid = z.preprocess(
  emptyToUndefined,
  z.string().uuid().optional(),
);
const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

function isValidCentralApiUrl(value: string): boolean {
  const url = new URL(value);
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    ['/', '/api/internal', '/api/internal/'].includes(url.pathname)
  );
}

const rawEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith('postgresql://') || value.startsWith('postgres://'),
      {
        message: 'DATABASE_URL must be a PostgreSQL URL',
      },
    ),
  APP_URL: z.string().url(),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must contain at least 32 characters'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_ALLOWED_DOMAINS: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().url(),
  AUTH_ADMISSION_MODE: z
    .enum(['DENY_UNKNOWN', 'INVITE_ONLY', 'ALLOWED_DOMAIN'])
    .default('DENY_UNKNOWN'),
  SHARED_SESSION_MODE: z.enum(['off', 'shadow', 'shared']).default('off'),
  HUB_BASE_URL: optionalUrl,
  HUB_ACCESS_COOKIE_NAME: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^[A-Za-z0-9_-]{3,40}$/)
      .optional(),
  ),
  HUB_SESSION_ISSUER: z.string().min(1).default('mws-hub'),
  HUB_SESSION_AUDIENCE: z.string().min(1).default('mws-apps'),
  CENTRAL_API_BASE_URL: optionalUrl.refine(
    (value) => value === undefined || isValidCentralApiUrl(value),
    'CENTRAL_API_BASE_URL must be an HTTP(S) origin or end with /api/internal',
  ),
  CENTRAL_API_TOKEN: optionalString,
  CENTRAL_ORGANIZATION_ID: optionalString,
  HUB_SSO_APP_ID: optionalString,
  CENTRAL_APPLICATION_ID: optionalString,
  CENTRAL_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(5_000),
  SHARED_SESSION_LOCAL_ORGANIZATION_ID: optionalUuid,
  SHARED_SESSION_ENTITLEMENT_CACHE_SECONDS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_600)
    .default(30),
  SHARED_SESSION_LOG_MATCHES: booleanString,
  // Minutes between runs of the Central access and academic sync inside the API. 0 keeps it off.
  CENTRAL_SYNC_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_440)
    .default(0),

  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS: z
    .enum(['true', 'false'])
    .default('false'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  E2E_AUTH_SECRET: z.string().min(32).optional(),
  E2E_AUTH_USER_EMAIL: z.string().email().optional(),
});

export type AppConfig = {
  nodeEnv: z.infer<typeof rawEnvironmentSchema>['NODE_ENV'];
  port: number;
  databaseUrl: string;
  appUrl: string;
  sessionSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  googleAllowedDomains: string[];
  googleRedirectUri: string;
  authAdmissionMode: 'DENY_UNKNOWN' | 'INVITE_ONLY' | 'ALLOWED_DOMAIN';
  sharedSessionMode?: 'off' | 'shadow' | 'shared';
  hubBaseUrl?: string;
  hubAccessCookieName?: string;
  hubSessionIssuer?: string;
  hubSessionAudience?: string;
  centralApiBaseUrl?: string;
  centralApiToken?: string;
  centralOrganizationId?: string;
  applicationId?: string;
  centralApiTimeoutMs?: number;
  sharedSessionLocalOrganizationId?: string;
  sharedSessionEntitlementCacheSeconds?: number;
  sharedSessionLogMatches?: boolean;
  centralSyncIntervalMinutes?: number;

  sessionTtlHours: number;
  logLevel: (typeof logLevels)[number];
  e2eAuthSecret?: string;
  e2eAuthUserEmail?: string;
};

const placeholderValues = new Set([
  'development-placeholder',
  'replace-me',
  'replace-with-at-least-32-random-bytes',
  'changeme',
]);

type ApplicationIdEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, 'HUB_SSO_APP_ID' | 'CENTRAL_APPLICATION_ID'>
>;

export function resolveApplicationId(
  environment: ApplicationIdEnvironment,
): string {
  const canonical = environment.HUB_SSO_APP_ID?.trim();
  const legacy = environment.CENTRAL_APPLICATION_ID?.trim();
  if (canonical && legacy && canonical !== legacy) {
    throw new Error(
      'Invalid runtime configuration: HUB_SSO_APP_ID and CENTRAL_APPLICATION_ID must match',
    );
  }
  return canonical || legacy || 'learnspace';
}

export function loadRootEnvironment(): void {
  try {
    const contents = readFileSync(
      fileURLToPath(new URL('../../../../.env', import.meta.url)),
      'utf8',
    );
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key]) continue;
      let value = trimmed.slice(separator + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replaceAll('\\n', '\n');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const result = rawEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map(
          (issue) => issue.path.join('.') || 'environment',
        ),
      ),
    ];
    throw new Error(`Invalid runtime configuration: ${fields.join(', ')}`);
  }

  const values = result.data;
  const applicationId = resolveApplicationId(values);
  const allowsPlaceholders =
    values.NODE_ENV === 'development' &&
    values.ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS === 'true';

  if (placeholderValues.has(values.SESSION_SECRET)) {
    throw new Error('Invalid runtime configuration: SESSION_SECRET');
  }

  if (
    !allowsPlaceholders &&
    values.NODE_ENV !== 'test' &&
    (placeholderValues.has(values.GOOGLE_CLIENT_ID) ||
      placeholderValues.has(values.GOOGLE_CLIENT_SECRET))
  ) {
    throw new Error('Invalid runtime configuration: Google OAuth credentials');
  }

  if (
    values.NODE_ENV !== 'test' &&
    (values.E2E_AUTH_SECRET !== undefined ||
      values.E2E_AUTH_USER_EMAIL !== undefined)
  ) {
    throw new Error('Invalid runtime configuration: E2E authentication');
  }

  if (
    values.SHARED_SESSION_MODE !== 'off' &&
    (!values.HUB_BASE_URL ||
      !values.CENTRAL_API_BASE_URL ||
      !values.CENTRAL_API_TOKEN ||
      !values.CENTRAL_ORGANIZATION_ID)
  ) {
    throw new Error(
      'Invalid runtime configuration: shared session Hub/Central configuration',
    );
  }
  if (
    values.NODE_ENV === 'production' &&
    ((values.HUB_BASE_URL &&
      new URL(values.HUB_BASE_URL).protocol !== 'https:') ||
      (values.CENTRAL_API_BASE_URL &&
        new URL(values.CENTRAL_API_BASE_URL).protocol !== 'https:'))
  ) {
    throw new Error(
      'Invalid runtime configuration: shared session URLs must use HTTPS in production',
    );
  }
  if (
    (values.E2E_AUTH_SECRET === undefined) !==
    (values.E2E_AUTH_USER_EMAIL === undefined)
  ) {
    throw new Error('Invalid runtime configuration: E2E authentication');
  }

  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    appUrl: values.APP_URL,
    sessionSecret: values.SESSION_SECRET,
    googleClientId: values.GOOGLE_CLIENT_ID,
    googleClientSecret: values.GOOGLE_CLIENT_SECRET,
    googleAllowedDomains: values.GOOGLE_ALLOWED_DOMAINS.split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    googleRedirectUri: values.GOOGLE_REDIRECT_URI,
    authAdmissionMode: values.AUTH_ADMISSION_MODE,
    sharedSessionMode: values.SHARED_SESSION_MODE,
    hubBaseUrl: values.HUB_BASE_URL?.replace(/\/+$/, ''),
    hubAccessCookieName: values.HUB_ACCESS_COOKIE_NAME,
    hubSessionIssuer: values.HUB_SESSION_ISSUER,
    hubSessionAudience: values.HUB_SESSION_AUDIENCE,
    centralApiBaseUrl: values.CENTRAL_API_BASE_URL?.replace(/\/+$/, ''),
    centralApiToken: values.CENTRAL_API_TOKEN,
    centralOrganizationId: values.CENTRAL_ORGANIZATION_ID,
    applicationId,
    centralApiTimeoutMs: values.CENTRAL_API_TIMEOUT_MS,
    sharedSessionLocalOrganizationId:
      values.SHARED_SESSION_LOCAL_ORGANIZATION_ID,
    sharedSessionEntitlementCacheSeconds:
      values.SHARED_SESSION_ENTITLEMENT_CACHE_SECONDS,
    sharedSessionLogMatches: values.SHARED_SESSION_LOG_MATCHES,
    centralSyncIntervalMinutes: values.CENTRAL_SYNC_INTERVAL_MINUTES,

    sessionTtlHours: values.SESSION_TTL_HOURS,
    logLevel: values.LOG_LEVEL,
    e2eAuthSecret: values.E2E_AUTH_SECRET,
    e2eAuthUserEmail: values.E2E_AUTH_USER_EMAIL?.toLowerCase(),
  };
}
