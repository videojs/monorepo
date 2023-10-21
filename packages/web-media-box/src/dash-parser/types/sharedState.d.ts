export interface SharedState {
  mpdAttributes: Record<string, unknown>,
  periodAttributes?: Record<string, unknown>,
  adaptationSetAttributes?: Record<string, unknown>,
  segmentTemplateAttributes?:  Record<string, unknown>,
  attributes?: Record<string, unknown>
}
