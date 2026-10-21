export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

export const serializableConflictCodes = new Set(['P2002', 'P2034']);
