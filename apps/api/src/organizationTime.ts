import type { Prisma, PrismaClient } from '@prisma/client';
import { HttpError } from './httpErrors.js';

export function schoolDateInTimezone(timezone: string, now = new Date()) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new HttpError(
      500,
      'ORGANIZATION_TIMEZONE_INVALID',
      'The organization timezone is not valid.',
    );
  }
  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
}

export async function organizationSchoolDate(
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true },
  });
  if (!organization) {
    throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
  }
  return {
    timezone: organization.timezone,
    schoolDate: schoolDateInTimezone(organization.timezone),
  };
}
