// base
import type { PlayerDependencies } from './base-player';
import { BasePlayer } from './base-player';
import { ServiceLocator } from '../service-locator';

export class Player extends BasePlayer {
  public static create(): Player {
    return new Player(new ServiceLocator());
  }

  public constructor(dependencies: PlayerDependencies) {
    super(dependencies);
  }
}
