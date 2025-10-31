import { GameState } from '../types';

const API_ENDPOINT = '/api/game-handler';

export const createGame = async (
  playerName: string,
  sessionId: string,
  gameMode: 'CLASSIC' | 'TACTICAL',
  mapType: 'STANDARD' | 'ASTEROID_FIELD'
): Promise<GameState> => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', payload: { playerName, sessionId, gameMode, mapType } }),
  });
  if (!response.ok) throw new Error('Failed to create game');
  return response.json();
};

export const joinGame = async (gameId: string, playerName: string, sessionId: string): Promise<GameState> => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'join', payload: { gameId, playerName, sessionId } }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to join game');
  }
  return response.json();
};

export const getGameState = async (gameId: string): Promise<GameState | null> => {
    try {
        const response = await fetch(`${API_ENDPOINT}?gameId=${gameId}`);
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Failed to get game state');
        return response.json();
    } catch (e) {
        console.error("Error fetching game state:", e);
        return null;
    }
};

export const updateGameState = async (
  gameId: string,
  playerId: string,
  sessionId: string,
  move: { type: string; payload: any }
): Promise<GameState> => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      payload: { gameId, playerId, sessionId, move },
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update game state');
  }
  return response.json();
};
