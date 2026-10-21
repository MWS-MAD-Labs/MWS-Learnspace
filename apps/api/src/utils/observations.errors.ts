import { FedcScoringError } from '../utils/fedc-scoring.js';
import { HttpError } from '../middleware/http-errors.js';
import { SensoryProfileScoringError } from '../utils/sensory-profile-scoring.js';
import { SfaScoringError } from '../utils/sfa-scoring.js';

export function definitionConflict() {
  return new HttpError(
    409,
    'OBSERVATION_DEFINITION_VERSION_CONFLICT',
    'The observation definition version could not be published concurrently.',
  );
}

export function lifecycleConflict(message: string) {
  return new HttpError(409, 'OBSERVATION_ASSIGNMENT_INVALID_STATE', message);
}

export function fedcLifecycleConflict(message: string) {
  return new HttpError(409, 'FEDC_OBSERVATION_INVALID_STATE', message);
}

export function translateFedcScoringError(error: unknown): unknown {
  if (!(error instanceof FedcScoringError)) return error;
  return new HttpError(
    error.code === 'FEDC_DEFINITION_UNSCORABLE' ? 409 : 400,
    error.code,
    error.message,
    error.details,
  );
}

export function sensoryProfileLifecycleConflict(message: string) {
  return new HttpError(
    409,
    'SENSORY_PROFILE_OBSERVATION_INVALID_STATE',
    message,
  );
}

export function translateSensoryProfileScoringError(error: unknown): unknown {
  if (!(error instanceof SensoryProfileScoringError)) return error;
  return new HttpError(
    error.code === 'SENSORY_PROFILE_DEFINITION_UNSCORABLE' ? 409 : 400,
    error.code,
    error.message,
    error.details,
  );
}

export function sfaLifecycleConflict(message: string) {
  return new HttpError(409, 'SFA_OBSERVATION_INVALID_STATE', message);
}

export function translateSfaScoringError(error: unknown): unknown {
  if (!(error instanceof SfaScoringError)) return error;
  return new HttpError(
    error.code === 'SFA_DEFINITION_UNSCORABLE' ? 409 : 400,
    error.code,
    error.message,
    error.details,
  );
}
