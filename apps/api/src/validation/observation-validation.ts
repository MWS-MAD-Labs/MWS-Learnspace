import { z } from 'zod';
import {
  fedcObservationCompleteCommandSchema,
  fedcObservationCreateDraftCommandSchema,
  fedcObservationSaveDraftCommandSchema,
  sensoryProfileObservationCompleteCommandSchema,
  sensoryProfileObservationCreateDraftCommandSchema,
  sensoryProfileObservationSaveDraftCommandSchema,
  sfaObservationCompleteCommandSchema,
  sfaObservationCreateDraftCommandSchema,
  sfaObservationSaveDraftCommandSchema,
} from '@learnspace/contracts';

export const fedcCreateDraftPayloadSchema =
  fedcObservationCreateDraftCommandSchema;
export const fedcSaveDraftPayloadSchema = fedcObservationSaveDraftCommandSchema;
export const fedcCompletePayloadSchema = fedcObservationCompleteCommandSchema;
export const fedcPayloadSchema = z.union([
  fedcSaveDraftPayloadSchema,
  fedcCompletePayloadSchema,
]);

export const sensoryProfileCreateDraftPayloadSchema =
  sensoryProfileObservationCreateDraftCommandSchema;
export const sensoryProfileSaveDraftPayloadSchema =
  sensoryProfileObservationSaveDraftCommandSchema;
export const sensoryProfileCompletePayloadSchema =
  sensoryProfileObservationCompleteCommandSchema;
export const sensoryProfilePayloadSchema = z.union([
  sensoryProfileSaveDraftPayloadSchema,
  sensoryProfileCompletePayloadSchema,
]);

export const sfaCreateDraftPayloadSchema =
  sfaObservationCreateDraftCommandSchema;
export const sfaSaveDraftPayloadSchema = sfaObservationSaveDraftCommandSchema;
export const sfaCompletePayloadSchema = sfaObservationCompleteCommandSchema;
export const sfaPayloadSchema = sfaSaveDraftPayloadSchema;
