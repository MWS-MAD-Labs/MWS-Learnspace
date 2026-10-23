import type { PrismaClient } from '@prisma/client';
import { CentralApiError } from 'mws-central-auth/data-client';
import type { CentralEntitlementClient } from './shared-session-shadow-service.js';

export const backfillConflictCodes = [
  'LOCAL_EMAIL_NOT_UNIQUE',
  'CENTRAL_NOT_FOUND',
  'CENTRAL_EMAIL_MISMATCH',
  'SUBJECT_ALREADY_LINKED',
  'USER_ALREADY_LINKED',
  'WRITE_CONFLICT',
] as const;

type ConflictCode = (typeof backfillConflictCodes)[number];

export type BackfillReport = {
  mode: 'dry-run' | 'apply';
  counts: {
    scanned: number;
    eligible: number;
    created: number;
    alreadyLinked: number;
    conflicts: number;
  };
  conflicts: Partial<Record<ConflictCode, number>>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function increment(report: BackfillReport, code: ConflictCode): void {
  report.counts.conflicts += 1;
  report.conflicts[code] = (report.conflicts[code] ?? 0) + 1;
}

export async function backfillExternalPrincipals(input: {
  prisma: Pick<PrismaClient, 'user' | 'externalPrincipal'>;
  central: Pick<CentralEntitlementClient, 'lookupEmployee'>;
  issuer: string;
  mode: 'dry-run' | 'apply';
}): Promise<BackfillReport> {
  const report: BackfillReport = {
    mode: input.mode,
    counts: {
      scanned: 0,
      eligible: 0,
      created: 0,
      alreadyLinked: 0,
      conflicts: 0,
    },
    conflicts: {},
  };
  const users = await input.prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, email: true },
  });
  const normalizedEmailCounts = new Map<string, number>();
  for (const user of users) {
    const email = normalizeEmail(user.email);
    normalizedEmailCounts.set(
      email,
      (normalizedEmailCounts.get(email) ?? 0) + 1,
    );
  }

  for (const user of users) {
    report.counts.scanned += 1;
    const email = normalizeEmail(user.email);
    if ((normalizedEmailCounts.get(email) ?? 0) !== 1) {
      increment(report, 'LOCAL_EMAIL_NOT_UNIQUE');
      continue;
    }
    let employee: { person_id: string; email: string };
    try {
      employee = await input.central.lookupEmployee({ email });
    } catch (error) {
      if (error instanceof CentralApiError && error.status === 404) {
        increment(report, 'CENTRAL_NOT_FOUND');
        continue;
      }
      throw error;
    }
    if (normalizeEmail(employee.email) !== email) {
      increment(report, 'CENTRAL_EMAIL_MISMATCH');
      continue;
    }

    const [bySubject, byUser] = await Promise.all([
      input.prisma.externalPrincipal.findUnique({
        where: {
          issuer_subject: { issuer: input.issuer, subject: employee.person_id },
        },
        select: { userId: true },
      }),
      input.prisma.externalPrincipal.findUnique({
        where: { userId_issuer: { userId: user.id, issuer: input.issuer } },
        select: { subject: true },
      }),
    ]);
    if (
      bySubject?.userId === user.id &&
      byUser?.subject === employee.person_id
    ) {
      report.counts.alreadyLinked += 1;
      continue;
    }
    if (bySubject && bySubject.userId !== user.id) {
      increment(report, 'SUBJECT_ALREADY_LINKED');
      continue;
    }
    if (byUser && byUser.subject !== employee.person_id) {
      increment(report, 'USER_ALREADY_LINKED');
      continue;
    }

    report.counts.eligible += 1;
    if (input.mode === 'dry-run') continue;
    try {
      await input.prisma.externalPrincipal.create({
        data: {
          userId: user.id,
          issuer: input.issuer,
          subject: employee.person_id,
          source: 'employee',
          linkSource: 'normalized_email_backfill',
          verified: true,
          verifiedAt: new Date(),
        },
      });
      report.counts.created += 1;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        increment(report, 'WRITE_CONFLICT');
        continue;
      }
      throw error;
    }
  }
  return report;
}
