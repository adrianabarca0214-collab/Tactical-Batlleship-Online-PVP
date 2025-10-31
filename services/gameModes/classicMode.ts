import { IGameModeLogic, GameState, Player, Grid, GameMode, CellState, GameLogEntry } from "../../types";
import { createEmptyGrid } from "../gameLogic";

const processShotClassic = (gameState: GameState, targetPlayerId: string | null, x: number, y: number): GameState => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const attacker = newGameState.players.find(p => p.id === newGameState.currentPlayerId)!;
    attacker.actionPoints -= 1;

    const baseLogEntry = {
        turn: newGameState.turn,
        playerId: attacker.id,
        playerName: attacker.name,
        coords: { x, y },
    };

    const target = newGameState.players.find(p => p.id === targetPlayerId)!;
    const logEntry: GameLogEntry = { ...baseLogEntry, targetId: targetPlayerId, targetName: target.name, result: 'MISS' };
    const { rows, cols } = gameState.gridDimensions;

    if (!attacker.shots[targetPlayerId]) attacker.shots[targetPlayerId] = createEmptyGrid(rows, cols);
    if (attacker.shots[targetPlayerId][y][x] !== CellState.EMPTY) {
      attacker.actionPoints += 1; // Refund AP
      return gameState;
    }

    const targetCell = target.grid[y][x];
    if (targetCell === CellState.SHIP || targetCell === CellState.HIT || targetCell === CellState.SUNK) {
      attacker.shots[targetPlayerId][y][x] = CellState.HIT;
      target.grid[y][x] = CellState.HIT;
      logEntry.result = 'HIT';
      const hitShip = target.ships.find(ship => ship.positions.some(pos => pos.x === x && pos.y === y));
      if (hitShip) {
        logEntry.hitShipName = hitShip.name;
        const isSunk = hitShip.positions.every(pos => target.grid[pos.y][pos.x] === CellState.HIT);
        if (isSunk) {
          hitShip.isSunk = true;
          logEntry.result = 'SUNK_SHIP';
          logEntry.sunkShipName = hitShip.name;
          hitShip.positions.forEach(pos => {
            target.grid[pos.y][pos.x] = CellState.SUNK;
            attacker.shots[targetPlayerId][pos.y][pos.x] = CellState.SUNK;
          });
        }
      }
    } else {
      attacker.shots[targetPlayerId][y][x] = CellState.MISS;
      if (targetCell !== CellState.ASTEROID) target.grid[y][x] = CellState.MISS;
    }
    
    if (target.ships.every(ship => ship.isSunk)) target.isEliminated = true;
    
    const activePlayers = newGameState.players.filter(p => !p.isEliminated);
    if (activePlayers.length <= 1) {
      newGameState.phase = 'GAME_OVER';
      newGameState.winner = activePlayers.length === 1 ? activePlayers[0].id : null;
    }
    newGameState.log.unshift(logEntry);
    newGameState.lastShot = { coords: { x, y }, attackerId: attacker.id, targetId: target.id };

    return newGameState;
};

const advanceTurnClassic = (gameState: GameState): GameState => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    
    let currentPlayerIndex = newGameState.players.findIndex(p => p.id === newGameState.currentPlayerId);
    let nextPlayerIndex = (currentPlayerIndex + 1) % newGameState.players.length;
    
    while(newGameState.players[nextPlayerIndex].isEliminated) {
        nextPlayerIndex = (nextPlayerIndex + 1) % newGameState.players.length;
        if (nextPlayerIndex === currentPlayerIndex) break;
    }
    
    const nextPlayer = newGameState.players[nextPlayerIndex];
    nextPlayer.actionPoints = 1; // Classic mode has 1 shot per turn.

    const hasMultipleHumans = newGameState.players.filter(p => !p.isAI).length > 1;
    if (!nextPlayer.isAI && hasMultipleHumans) {
        newGameState.phase = 'TURN_TRANSITION';
    }

    newGameState.turn++;
    newGameState.currentPlayerId = newGameState.players[nextPlayerIndex].id;
    newGameState.activeAction = null;
    
    return newGameState;
};

export const classicModeLogic: IGameModeLogic = {
    processShot: processShotClassic,
    advanceTurn: advanceTurnClassic,
    applySkill: (gameState) => ({ error: "Skills are not available in Classic mode." }),
    initializePlayer: (id: string, name: string, isAI: boolean, grid: Grid, gameMode: GameMode): Player => {
        return {
            id,
            name: isAI ? `${name} (AI)` : name,
            isAI,
            grid,
            ships: [],
            shots: {},
            isReady: false,
            isEliminated: false,
            score: 0,
            skillCooldowns: {},
            skillUses: {},
            decoyPositions: [],
            actionPoints: 1, // Classic mode starts with 1 AP
        };
    },
};
