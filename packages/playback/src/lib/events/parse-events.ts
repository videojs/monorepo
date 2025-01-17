import { PlayerEventType } from '../consts/events';
import { PlayerEvent } from './base-player-event';
// We may want to move the following somehwere else.
// We will also need a parsed DASH manifest type.
// import { ParsedPlaylist } from '../../../../../node_modules/@videojs/hls-parser/dist/types/index';

export class HlsPlaylistParsedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.HlsPlaylistParsed;
  // public readonly playlist: ParsedPlaylist;

  // TODO: pass and set playlist here
  public constructor() {
    super();
  }
}

export class DashManifestParsedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.DashManifestParsed;
  // public readonly manifest: ParsedManifest;

  // TODO: pass and set manifest here
  public constructor() {
    super();
  }
}
