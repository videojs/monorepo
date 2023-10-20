import error from './error';

/**
 * Parses the manifest for a UTCTiming node, returning the nodes attributes if found
 *
 * @param UTCTimingNode string of the MPD manifest
 * @return Attributes of UTCTiming node specified in the manifest. Null if none found
 */
export const parseUTCTimingScheme = (attributes: Record<string, unknown>): Record<string, unknown> => {
  switch (attributes.schemeIdUri) {
  case 'urn:mpeg:dash:utc:http-head:2014':
  case 'urn:mpeg:dash:utc:http-head:2012':
    attributes.method = 'HEAD';
    break;
  case 'urn:mpeg:dash:utc:http-xsdate:2014':
  case 'urn:mpeg:dash:utc:http-iso:2014':
  case 'urn:mpeg:dash:utc:http-xsdate:2012':
  case 'urn:mpeg:dash:utc:http-iso:2012':
    attributes.method = 'GET';
    break;
  case 'urn:mpeg:dash:utc:direct:2014':
  case 'urn:mpeg:dash:utc:direct:2012':
    attributes.method = 'DIRECT';
    attributes.value = Date.parse(attributes.value as string);
    break;
  case 'urn:mpeg:dash:utc:http-ntp:2014':
  case 'urn:mpeg:dash:utc:ntp:2014':
  case 'urn:mpeg:dash:utc:sntp:2014':
  default:
    throw new Error(error.UNSUPPORTED_UTC_TIMING_SCHEME);
  }

  return attributes;
};
