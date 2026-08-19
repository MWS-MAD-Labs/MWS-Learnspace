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
  ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS: z
    .enum(['true', 'false'])
    .default('false'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
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
  logLevel: (typeof logLevels)[number];
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
    (placeholderValues.has(values.GOOGLE_CLIENT_ID) ||
      placeholderValues.has(values.GOOGLE_CLIENT_SECRET))
  ) {
    throw new Error('Invalid runtime configuration: Google OAuth credentials');
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
      .map((domain) => domain.trim())
      .filter(Boolean),
    logLevel: values.LOG_LEVEL,
  };
}
