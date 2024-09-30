import type { ParsedManifest } from '../types/parsed-manifest';

export const createDefaultParsedManifest = (): ParsedManifest => ({
  representations: [],
  type: 'static', //default value, could be updated after parsing
  custom: {},
});
