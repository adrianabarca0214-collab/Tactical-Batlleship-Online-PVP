import { GameState, IOpponentLogic, Player } from '../types';
import { aiOpponentLogic } from './opponentStrategies/aiOpponent';
import { humanOpponentLogic } from './opponentStrategies/humanOpponent';

export const getOpponentLogic = (gameState: GameState): IOpponentLogic => {
  const isVsAI = gameState.players.some(p => p.isAI);
  if (isVsAI) {
    return aiOpponentLogic;
  }
  return humanOpponentLogic;
};
