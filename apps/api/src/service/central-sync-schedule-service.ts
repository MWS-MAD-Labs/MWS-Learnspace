import type { PrismaClient } from '@prisma/client';
import { CentralDataClient } from 'mws-central-auth/data-client';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import {
  createPostgresCentralAccessSyncLock,
  synchronizeCentralAccess,
} from './central-access-sync-service.js';
import {
  createPostgresCentralAcademicSyncLock,
  synchronizeCentralAcademics,
  type AcademicCentralClient,
} from './central-academic-sync-service.js';
import {
  createPostgresCentralStudentSyncLock,
  synchronizeCentralStudents,
  type StudentCentralClient,
} from './central-student-sync-service.js';
import { createCentralOrganizationService } from './central-organization-service.js';
import { createCentralDataClient } from './shared-session-shadow-service.js';

// One round: who still has access, then the classes and the scopes of the teachers. Each step is its own transaction
// under its own advisory lock, so two API instances do not repeat each other.
export async function runCentralSyncRound(input: {
  prisma: PrismaClient;
  config: AppConfig;
  central: CentralDataClient;
}) {
  const { prisma, config, central } = input;
  const organization = await createCentralOrganizationService(prisma).resolve({
    centralOrganizationId: config.centralOrganizationId!,
    localOrganizationIdHint: config.sharedSessionLocalOrganizationId,
  });
  const access = await synchronizeCentralAccess({
    lock: createPostgresCentralAccessSyncLock(prisma),
    central,
    issuer: config.hubSessionIssuer ?? 'mws-hub',
    applicationId: config.applicationId!,
    centralOrganizationId: config.centralOrganizationId!,
    localOrganizationId: organization.localOrganizationId,
    mode: 'apply',
  });
  const academics = await synchronizeCentralAcademics({
    lock: createPostgresCentralAcademicSyncLock(prisma),
    central: central as unknown as AcademicCentralClient,
    localOrganizationId: organization.localOrganizationId,
    mode: 'apply',
  });
  // Students come after the classes, because an enrollment needs the class.
  const students = await synchronizeCentralStudents({
    lock: createPostgresCentralStudentSyncLock(prisma),
    central: central as unknown as StudentCentralClient,
    localOrganizationId: organization.localOrganizationId,
    mode: 'apply',
  });
  return { access, academics, students };
}

// Runs a round every CENTRAL_SYNC_INTERVAL_MINUTES, and once soon after start. Off unless the shared session is on and the
// interval is set. Only counts are logged.
export function scheduleCentralSync(
  prisma: PrismaClient,
  config: AppConfig,
  logger: Logger,
  run: typeof runCentralSyncRound = runCentralSyncRound,
): { stop: () => void } | undefined {
  if (
    config.sharedSessionMode !== 'shared' ||
    (config.centralSyncIntervalMinutes ?? 0) <= 0
  ) {
    return undefined;
  }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const report = await run({
        prisma,
        config,
        central: createCentralDataClient(config),
      });
      logger.info(
        {
          access: report.access.counts,
          academics: report.academics.counts,
          students: report.students.counts,
        },
        'central sync completed',
      );
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.name : 'unknown error' },
        'central sync failed',
      );
    } finally {
      running = false;
    }
  };
  const first = setTimeout(() => void tick(), 30_000);
  const timer = setInterval(
    () => void tick(),
    (config.centralSyncIntervalMinutes ?? 0) * 60_000,
  );
  first.unref();
  timer.unref();
  return {
    stop: () => {
      clearTimeout(first);
      clearInterval(timer);
    },
  };
}
