import type { ParseOptions, ParserOptions } from '../types/parser-options';
import createStateMachine from '../state-machine';
import type { ParsedPlaylist } from '../types/parsed-playlist';
import { Parser } from './base-parser';

export class FullPlaylistParser extends Parser {
  public static create(options: ParserOptions): FullPlaylistParser {
    return new FullPlaylistParser(options);
  }

  public parse(playlist: string | Uint8Array, options: ParseOptions): ParsedPlaylist {
    const isString = typeof playlist === 'string';
    this.gatherParseOptions_(options);

    const stateMachine = createStateMachine(this.tagInfoCallback_, this.uriInfoCallback_);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(isString ? playlist[i] : String.fromCharCode(playlist[i]));
    }

    this.transitionToNewLine_(stateMachine);

    return this.clean_();
  }
}
