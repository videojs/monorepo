// All fields we want to retiive from specific Nodes
// Note not all are required.

// TODO: This file will be removed, but keeping so I can copy attributes to the
// node processors.

export interface Attribute {
  name: string;
  required: boolean;
  default?: unknown;
}

export const BaseURLAttributes: Array<Attribute> = [{ name: 'id', required: true }];

export const EventStreamAttributes: Array<Attribute> = [
  { name: 'schemeIdUri', required: true },
  { name: 'value', required: false },
  { name: 'xlink:href', required: false },
  { name: 'xlink:actuate', required: false, default: `onRequest` },
  { name: 'timescale', required: false },
  { name: 'presentationTimeOffset', required: false, default: 0 },
];

export const EventAttributes: Array<Attribute> = [
  { name: 'presentationTime', required: false, default: 0 },
  { name: 'id', required: false },
  { name: 'duration', required: false },
  { name: 'contentEncoding', required: false },
  { name: 'messageData', required: false },
];
