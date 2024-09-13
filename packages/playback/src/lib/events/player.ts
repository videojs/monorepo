import type { LoggerLevel } from '../consts/loggerLevel';
import { PlayerEventType } from '../consts/events';
import { PlayerEvent } from './base';
import type { PlayerConfiguration } from '../types/configuration.declarations';

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

export class MutedStatusChangedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.MutedStatusChanged;
  public readonly isMuted: boolean;

  public constructor(isMuted: boolean) {
    super();
    this.isMuted = isMuted;
  }
}
