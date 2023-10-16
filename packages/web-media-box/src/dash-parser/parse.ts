import { ParsedManifest } from "./types/parsedManifest";
import { testString } from "./examples/mpd";

/**
 * Parses a MPD manifest file.
 *
 * @param playlist The URL of the mpd manifest to be parsed.
 */
export default function parse(playlist: string): ParsedManifest {
  const parsedManifest: ParsedManifest = {
    segments: [],
    custom: {}
  };

  // TODO: implement parsing.
  var doc = new DOMParser().parseFromString(testString, 'text/xml');

  return parsedManifest;
}
