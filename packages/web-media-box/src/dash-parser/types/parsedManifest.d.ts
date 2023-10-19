export type ManifestType = 'static' | 'dynamic';

export interface ParsedManifest {
  id?: number;
  type: ManifestType;
  availabilityStartTime?: number;
  availabilityEndTime?: number;
  segments: Array<unknown>;
  custom: Record<string, unknown>;
}
