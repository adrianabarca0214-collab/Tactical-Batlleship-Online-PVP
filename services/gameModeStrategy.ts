import { GameMode, IGameModeLogic } from '../types';
import { classicModeLogic } from './gameModes/classicMode';
import { tacticalModeLogic } from './gameModes/tacticalMode';

const modeStrategies: { [key in GameMode]: IGameModeLogic } = {
  CLASSIC: classicModeLogic,
  TACTICAL: tacticalModeLogic,
};

export const getModeLogic = (mode: GameMode): IGameModeLogic => {
  return modeStrategies[mode];
};
