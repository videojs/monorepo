import type { ParseOptions, ParserOptions } from '../types/parser-options';
import type { StateMachineTransition } from '../state-machine';
import createStateMachine from '../state-machine';
import type { ParsedPlaylist } from '../types/parsed-playlist';
import { Parser } from './base-parser';

export class ChunkPlaylistParser extends Parser {
  public static create(options: ParserOptions): ChunkPlaylistParser {
    return new ChunkPlaylistParser(options);
  }

  private stateMachine_: StateMachineTransition | null = null;

  public push(chunk: string | Uint8Array, options: ParseOptions): void {
    const isString = typeof chunk === 'string';
    this.gatherParseOptions_(options);

    if (this.stateMachine_ === null) {
      this.stateMachine_ = createStateMachine(this.tagInfoCallback_, this.uriInfoCallback_);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine_(isString ? chunk[i] : String.fromCharCode(chunk[i]));
    }
  }

  public done(): ParsedPlaylist {
    if (this.stateMachine_) {
      this.transitionToNewLine_(this.stateMachine_);
    }

    this.stateMachine_ = null;

    return this.clean_();
  }
}
