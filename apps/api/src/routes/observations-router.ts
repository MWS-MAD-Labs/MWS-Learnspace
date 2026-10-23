import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import { createRequiredAuthentication } from '../routes/auth-router.js';
import type { SessionService } from '../service/session-service.js';
import type { ShadowSessionObserver } from '../service/shared-session-shadow-service.js';
import type { RequestAuthenticationService } from '../service/request-authentication-service.js';
import { createObservationAssignmentDeleteController } from '../controller/observation-assignment-delete-controller.js';
import { createObservationAssignmentsController } from '../controller/observation-assignments-controller.js';
import { createObservationDefinitionsController } from '../controller/observation-definitions-controller.js';
import { createFedcObservationsController } from '../controller/fedc-observations-controller.js';
import { createSensoryProfileObservationsController } from '../controller/sensory-profile-observations-controller.js';
import { createSfaObservationsController } from '../controller/sfa-observations-controller.js';
import { createObservationAssignmentDeleteService } from '../service/observation-assignment-delete-service.js';
import { createObservationAssignmentsService } from '../service/observation-assignments-service.js';
import { createObservationDefinitionsService } from '../service/observation-definitions-service.js';
import { createFedcObservationsService } from '../service/fedc-observations-service.js';
import { createSensoryProfileObservationsService } from '../service/sensory-profile-observations-service.js';
import { createSfaObservationsService } from '../service/sfa-observations-service.js';

export function createObservationRouter(
  prisma: DatabaseClient,
  sessions: SessionService | RequestAuthenticationService,
  shadowObserver?: ShadowSessionObserver,
): Router {
  const router = createRouter();
  router.use(createRequiredAuthentication(sessions, shadowObserver));
  router.use(
    createObservationDefinitionsController(
      createObservationDefinitionsService(prisma),
    ),
  );
  router.use(
    createObservationAssignmentsController(
      createObservationAssignmentsService(prisma),
    ),
  );
  router.use(
    createFedcObservationsController(createFedcObservationsService(prisma)),
  );
  router.use(
    createSensoryProfileObservationsController(
      createSensoryProfileObservationsService(prisma),
    ),
  );
  router.use(
    createSfaObservationsController(createSfaObservationsService(prisma)),
  );
  router.use(
    createObservationAssignmentDeleteController(
      createObservationAssignmentDeleteService(prisma),
    ),
  );
  return router;
}
