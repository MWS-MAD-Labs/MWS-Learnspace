import { z } from 'zod';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

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

    sessionTtlHours: values.SESSION_TTL_HOURS,
    logLevel: values.LOG_LEVEL,
    e2eAuthSecret: values.E2E_AUTH_SECRET,
    e2eAuthUserEmail: values.E2E_AUTH_USER_EMAIL?.toLowerCase(),
  };
}
