import type { LoggerLevel } from '../consts/logger-level';
import { PlayerEventType } from '../consts/events';
import { PlayerEvent } from './base-player-event';
import type { PlayerConfiguration } from '../types/configuration.declarations';
import type { PlayerError } from '../errors/base-player-errors';
import type { PlaybackState } from '../consts/playback-state';

export class LoggerLevelChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.LoggerLevelChanged;
  public readonly level: LoggerLevel;

  public constructor(level: LoggerLevel) {
    super();
    this.level = level;
  }
}

export class ConfigurationChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.ConfigurationChanged;
  public readonly configuration: PlayerConfiguration;

  public constructor(configuration: PlayerConfiguration) {
    super();
    this.configuration = configuration;
  }
}

export class VolumeChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.VolumeChanged;
  public readonly volume: number;

  public constructor(volume: number) {
    super();
    this.volume = volume;
  }
}

export class RateChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.RateChanged;
  public readonly rate: number;

  public constructor(rate: number) {
    super();
    this.rate = rate;
  }
}

export class CurrentTimeChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.CurrentTimeChanged;
  public readonly currentTime: number;

  public constructor(currentTime: number) {
    super();
    this.currentTime = currentTime;
  }
}

export class MutedStatusChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.MutedStatusChanged;
  public readonly isMuted: boolean;

  public constructor(isMuted: boolean) {
    super();
    this.isMuted = isMuted;
  }
}

export class ErrorEvent extends PlayerEvent {
  public readonly type = PlayerEventType.Error;
  public readonly error: PlayerError;

  public constructor(error: PlayerError) {
    super();
    this.error = error;
  }
}

export class PlaybackStateChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.PlaybackStateChanged;
  public readonly state: PlaybackState;

  public constructor(state: PlaybackState) {
    super();
    this.state = state;
  }
}
