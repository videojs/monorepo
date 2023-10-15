export interface PlayerConfiguration {}

const defaultConfiguration: PlayerConfiguration = {};

export const getDefaultPlayerConfiguration = (): PlayerConfiguration => structuredClone(defaultConfiguration);
