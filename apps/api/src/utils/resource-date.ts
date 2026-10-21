export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function dateAtUtcMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
