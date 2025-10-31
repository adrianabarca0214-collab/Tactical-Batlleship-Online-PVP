// IMPORTANT: This serverless function uses an in-memory Map to store game states.
// In a real-world serverless environment, this state is ephemeral and may be lost when the function
// instance is recycled. For a production app, this should be replaced with a
// persistent database like Netlify's built-in database, Firestore, or DynamoDB.

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// --- START: SHARED LOGIC (COPIED FROM FRONTEND) ---
// In a real monorepo project, these types and logic functions would be in a shared package
// to avoid duplication and ensure consistency between client and server.

// --- Types from types.ts ---
enum GamePhase { LOBBY = 'LOBBY', FLEET_SELECTION = 'FLEET_SELECTION', AI_FLEET_SELECTION = 'AI_FLEET_SELECTION', SETUP = 'SETUP', PLAYING = 'PLAYING', GAME_OVER = 'GAME_OVER', TURN_TRANSITION = 'TURN_TRANSITION' }
enum CellState { EMPTY = 'EMPTY', SHIP = 'SHIP', HIT = 'HIT', MISS = 'MISS', SUNK = 'SUNK', DECOY = 'DECOY', RADAR_CONTACT = 'RADAR_CONTACT', ASTEROID = 'ASTEROID', CAMO_HIT = 'CAMO_HIT', ASTEROID_DESTROYED = 'ASTEROID_DESTROYED', SHIELD_HIT = 'SHIELD_HIT' }
type ShipType = 'Mothership' | 'Radarship' | 'Repairship' | 'Commandship' | 'Decoyship' | 'Jamship' | 'Camoship' | 'Scoutship' | 'Supportship' | 'Shieldship';
interface Ship { name: string; type: ShipType; length: number; positions: { x: number; y: number }[]; isSunk: boolean; isDamaged: boolean; hasBeenRepaired: boolean; hasBeenRelocated: boolean; pointCost: number; }
type Grid = CellState[][];
type GameMode = 'CLASSIC' | 'TACTICAL';
type MapType = 'STANDARD' | 'ASTEROID_FIELD';
type OpponentType = 'AI' | 'Human' | 'ONLINE';
interface Player { id: string; name: string; isAI: boolean; grid: Grid; ships: Ship[]; shots: { [key: string]: Grid }; isReady: boolean; isEliminated: boolean; score: number; skillCooldowns: { [key in ShipType]?: number }; skillUses: { [key in ShipType]?: number }; decoyPositions: { x: number; y: number }[]; shieldedPositions?: { x: number; y: number }[]; jammedPositions?: { x: number; y: number }[]; jamTurnsRemaining?: number; escapeSkillUnlocked?: boolean; actionPoints: number; bonusAP?: number; camoArea?: { x: number; y: number; width: number; height: number }; targetLocks?: { [opponentId: string]: { cells: { x: number; y: number }[], turnsRemaining: number } }; sessionId?: string; }
interface GameLogEntry { turn: number; playerId: string; playerName: string; targetId?: string | null; targetName?: string; coords?: { x: number; y: number }; result: 'HIT' | 'MISS' | 'SUNK_SHIP' | 'SHOT_FIRED' | 'SKILL_USED' | 'CAMO_HIT' | 'ASTEROID_DESTROYED' | 'SHIELD_BROKEN'; sunkShipName?: string; hitShipName?: string; message?: string; }
interface GameState { gameId: string; phase: GamePhase; players: Player[]; currentPlayerId: string | null; winner: string | null; maxPlayers: number; turn: number; gridDimensions: { rows: number; cols: number }; shipsConfig: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired' | 'hasBeenRelocated'>[]; gameMode: GameMode; mapType: MapType; opponentType: OpponentType; fleetBudget: number; log: GameLogEntry[]; activeAction?: any; radarScanResult?: any; jammedArea?: any; hitLog?: any; lastHitTurn?: any; lastShot?: any; lastUpdated?: number; }
interface IGameModeLogic { processShot: (gameState: GameState, targetPlayerId: string | null, x: number, y: number) => GameState; advanceTurn: (gameState: GameState) => GameState; applySkill: (gameState: GameState, playerId: string, skillType: ShipType, options: any) => GameState | { error: string }; initializePlayer: (id: string, name: string, isAI: boolean, grid: Grid, gameMode: GameMode) => Player; }

// --- Logic from constants.ts ---
const SHIPS_CONFIG_DEFAULT = [{ name: 'Carrier', length: 5 }, { name: 'Battleship', length: 4 }, { name: 'Cruiser', length: 3 }, { name: 'Submarine', length: 3 }, { name: 'Destroyer', length: 2 }];
const TACTICAL_SHIP_POOL = [{ name: 'Mothership', type: 'Mothership', length: 2, pointCost: 0 }, { name: 'Camoship', type: 'Camoship', length: 4, pointCost: 7 }, { name: 'Commandship', type: 'Commandship', length: 5, pointCost: 7 }, { name: 'Scoutship', type: 'Scoutship', length: 3, pointCost: 6 }, { name: 'Radarship', type: 'Radarship', length: 3, pointCost: 4 }, { name: 'Shieldship', type: 'Shieldship', length: 3, pointCost: 5 }, { name: 'Repairship', type: 'Repairship', length: 3, pointCost: 4 }, { name: 'Jamship', type: 'Jamship', length: 3, pointCost: 4 }, { name: 'Decoyship', type: 'Decoyship', length: 4, pointCost: 3 }, { name: 'Supportship', type: 'Supportship', length: 3, pointCost: 3 }];
const getGameConfig = (mode: GameMode) => { if (mode === 'TACTICAL') { return { gridDimensions: { rows: 12, cols: 12 }, shipsConfig: TACTICAL_SHIP_POOL, fleetBudget: 30 }; } return { gridDimensions: { rows: 12, cols: 12 }, shipsConfig: SHIPS_CONFIG_DEFAULT.map(s => ({ ...s, type: s.name as any, pointCost: 0 })), fleetBudget: 0 }; };

// --- Logic from gameLogic.ts ---
const createEmptyGrid = (rows: number, cols: number): Grid => Array(rows).fill(null).map(() => Array(cols).fill(CellState.EMPTY));
const generateAsteroids = (grid: Grid, maxAsteroids: number): Grid => { const newGrid = grid.map(row => [...row]); const { rows, cols } = { rows: grid.length, cols: grid[0].length }; let count = 0; let attempts = 0; while (count < maxAsteroids && attempts < 100) { const x = Math.floor(Math.random() * cols); const y = Math.floor(Math.random() * rows); if (newGrid[y][x] === CellState.EMPTY) { newGrid[y][x] = CellState.ASTEROID; count++; } attempts++; } return newGrid; };
const canPlaceShip = (grid: Grid, ship: { length: number }, x: number, y: number, isHorizontal: boolean, gridDimensions: { rows: number, cols: number }): boolean => { for (let i = 0; i < ship.length; i++) { const currentX = x + (isHorizontal ? i : 0); const currentY = y + (isHorizontal ? 0 : i); if (currentX < 0 || currentX >= gridDimensions.cols || currentY < 0 || currentY >= gridDimensions.rows || grid[currentY][currentX] !== CellState.EMPTY) return false; } return true; };
const placeShip = (grid: Grid, ship: Ship, x: number, y: number, isHorizontal: boolean): { newGrid: Grid; newShip: Ship } => { const newGrid = grid.map(row => [...row]); const newPositions = []; for (let i = 0; i < ship.length; i++) { const currentX = x + (isHorizontal ? i : 0); const currentY = y + (isHorizontal ? 0 : i); newGrid[currentY][currentX] = CellState.SHIP; newPositions.push({ x: currentX, y: currentY }); } return { newGrid, newShip: { ...ship, positions: newPositions } }; };

// --- Logic from gameModes/classicMode.ts & tacticalMode.ts & gameModeStrategy.ts ---
const classicModeLogic: IGameModeLogic = { processShot: (gs, targetId, x, y) => { const ngs = JSON.parse(JSON.stringify(gs)); const attacker = ngs.players.find(p => p.id === ngs.currentPlayerId); if (!attacker) return ngs; attacker.actionPoints -= 1; const target = ngs.players.find(p => p.id === targetId); if (!target) return ngs; if (!attacker.shots[targetId]) attacker.shots[targetId] = createEmptyGrid(ngs.gridDimensions.rows, ngs.gridDimensions.cols); if (attacker.shots[targetId][y][x] !== CellState.EMPTY) { attacker.actionPoints += 1; return gs; } const targetCell = target.grid[y][x]; if (targetCell === CellState.SHIP) { attacker.shots[targetId][y][x] = CellState.HIT; target.grid[y][x] = CellState.HIT; const hitShip = target.ships.find(ship => ship.positions.some(pos => pos.x === x && pos.y === y)); if (hitShip) { const isSunk = hitShip.positions.every(pos => target.grid[pos.y][pos.x] === CellState.HIT); if (isSunk) { hitShip.isSunk = true; hitShip.positions.forEach(pos => { target.grid[pos.y][pos.x] = CellState.SUNK; attacker.shots[targetId][pos.y][pos.x] = CellState.SUNK; }); } } } else { attacker.shots[targetId][y][x] = CellState.MISS; } if (target.ships.every(s => s.isSunk)) { target.isEliminated = true; } const activePlayers = ngs.players.filter(p => !p.isEliminated); if (activePlayers.length <= 1) { ngs.phase = GamePhase.GAME_OVER; ngs.winner = activePlayers[0]?.id || null; } return ngs; }, advanceTurn: (gs) => { const ngs = JSON.parse(JSON.stringify(gs)); let ci = ngs.players.findIndex(p => p.id === ngs.currentPlayerId); let ni = (ci + 1) % ngs.players.length; while(ngs.players[ni].isEliminated) { ni = (ni + 1) % ngs.players.length; if(ni === ci) break;} ngs.currentPlayerId = ngs.players[ni].id; ngs.players[ni].actionPoints = 1; ngs.turn++; ngs.phase = GamePhase.TURN_TRANSITION; return ngs; }, applySkill: (gs) => ({ error: "Skills not available" }), initializePlayer: (id, name, isAI, grid) => ({ id, name, isAI, grid, ships: [], shots: {}, isReady: false, isEliminated: false, score: 0, skillCooldowns: {}, skillUses: {}, decoyPositions: [], actionPoints: 1 }) };
const tacticalModeLogic: IGameModeLogic = { processShot: (gs, targetId, x, y) => { const ngs = JSON.parse(JSON.stringify(gs)); const attacker = ngs.players.find(p => p.id === ngs.currentPlayerId); const target = ngs.players.find(p => p.id === targetId); if(!attacker || !target) return ngs; attacker.actionPoints -= 1; ngs.lastShot = { coords: {x,y}, attackerId: attacker.id, targetId: target.id }; if (target.grid[y][x] === CellState.SHIP) { target.grid[y][x] = CellState.HIT; attacker.shots[targetId][y][x] = CellState.HIT; const hitShip = target.ships.find(s => s.positions.some(p => p.x === x && p.y === y)); if(hitShip) { hitShip.isDamaged = true; if (hitShip.type === 'Mothership') { target.isEliminated = true; ngs.phase = GamePhase.GAME_OVER; ngs.winner = attacker.id; } } } else { target.grid[y][x] = CellState.MISS; attacker.shots[targetId][y][x] = CellState.MISS; } return ngs; }, advanceTurn: (gs) => { const ngs = JSON.parse(JSON.stringify(gs)); const cp = ngs.players.find(p=>p.id === ngs.currentPlayerId); if(cp) { Object.keys(cp.skillCooldowns).forEach(k => { if(cp.skillCooldowns[k] > 0) cp.skillCooldowns[k]--; }); } let ci = ngs.players.findIndex(p => p.id === ngs.currentPlayerId); let ni = (ci + 1) % ngs.players.length; ngs.currentPlayerId = ngs.players[ni].id; ngs.players[ni].actionPoints = 2 + (ngs.players[ni].bonusAP || 0); ngs.players[ni].bonusAP = 0; ngs.turn++; ngs.phase = GamePhase.TURN_TRANSITION; return ngs; }, applySkill: (gs, pId, skill, opts) => { const ngs = JSON.parse(JSON.stringify(gs)); const p = ngs.players.find(pl => pl.id === pId); if(p) p.actionPoints -= 2; return ngs; }, initializePlayer: (id, name, isAI, grid) => ({ id, name, isAI, grid, ships: [], shots: {}, isReady: false, isEliminated: false, score: 0, skillCooldowns: {'Radarship':0, 'Commandship':0, 'Repairship':0, 'Jamship':0}, skillUses: {'Decoyship': 2}, decoyPositions: [], shieldedPositions:[], jammedPositions:[], jamTurnsRemaining:0, escapeSkillUnlocked:false, actionPoints: 2, bonusAP:0 }) };
const getModeLogic = (mode: GameMode): IGameModeLogic => mode === 'CLASSIC' ? classicModeLogic : tacticalModeLogic;

// --- END: SHARED LOGIC ---


const games = new Map<string, GameState>();

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const headers = { 'Content-Type': 'application/json' };

    if (event.httpMethod === 'GET') {
        const gameId = event.queryStringParameters?.gameId;
        if (!gameId || !games.has(gameId)) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Game not found' }), headers };
        }
        return { statusCode: 200, body: JSON.stringify(games.get(gameId)), headers };
    }

    if (event.httpMethod !== 'POST' || !event.body) {
        return { statusCode: 400, body: 'Invalid request', headers };
    }

    try {
        const { action, payload } = JSON.parse(event.body);

        switch (action) {
            case 'create': {
                const { playerName, sessionId, gameMode, mapType } = payload;
                const gameId = crypto.randomUUID().slice(0, 6).toUpperCase();
                const { gridDimensions, shipsConfig, fleetBudget } = getGameConfig(gameMode);
                const modeLogic = getModeLogic(gameMode);
                let initialGrid = createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
                if (mapType === 'ASTEROID_FIELD') initialGrid = generateAsteroids(initialGrid, 10);
                const player1 = { ...modeLogic.initializePlayer(crypto.randomUUID(), playerName, false, initialGrid, gameMode), sessionId };
                const newGame: GameState = { gameId, phase: GamePhase.LOBBY, players: [player1], currentPlayerId: player1.id, winner: null, maxPlayers: 2, turn: 1, gridDimensions, shipsConfig: shipsConfig as any, gameMode, mapType, opponentType: 'ONLINE', fleetBudget, log: [], lastUpdated: Date.now() };
                games.set(gameId, newGame);
                return { statusCode: 200, body: JSON.stringify(newGame), headers };
            }

            case 'join': {
                const { gameId, playerName, sessionId } = payload;
                if (!games.has(gameId)) return { statusCode: 404, body: JSON.stringify({ message: 'Game not found' }), headers };
                const game = games.get(gameId)!;
                if (game.players.length >= 2) return { statusCode: 400, body: JSON.stringify({ message: 'Game is full' }), headers };
                const modeLogic = getModeLogic(game.gameMode);
                const player2 = { ...modeLogic.initializePlayer(crypto.randomUUID(), playerName, false, game.players[0].grid, game.gameMode), sessionId };
                game.players.push(player2);
                game.phase = game.gameMode === 'TACTICAL' ? GamePhase.FLEET_SELECTION : GamePhase.SETUP;
                game.currentPlayerId = game.players[0].id;
                game.lastUpdated = Date.now();
                games.set(gameId, game);
                return { statusCode: 200, body: JSON.stringify(game), headers };
            }

            case 'update': {
                const { gameId, playerId, sessionId, move } = payload;
                if (!games.has(gameId)) return { statusCode: 404, body: JSON.stringify({ message: 'Game not found' }), headers };
                let game = games.get(gameId)!;
                const player = game.players.find(p => p.id === playerId);
                if (!player || player.sessionId !== sessionId) {
                    return { statusCode: 403, body: JSON.stringify({ message: 'Unauthorized action' }), headers };
                }
                
                const { type, payload: movePayload } = move;
                const modeLogic = getModeLogic(game.gameMode);

                switch (type) {
                    case 'fleetReady':
                        game.players = game.players.map(p => p.id === movePayload.playerWithFleet.id ? movePayload.playerWithFleet : p);
                        if (game.players.length === 2 && game.players.every(p => p.ships.length > 0)) {
                            game.phase = GamePhase.SETUP;
                            game.currentPlayerId = game.players[0].id;
                        }
                        break;
                    case 'setupReady':
                        const playerWithReady = { ...movePayload.playerWithShips, isReady: true };
                        game.players = game.players.map(p => p.id === playerWithReady.id ? playerWithReady : p);
                        if (game.players.length === 2 && game.players.every(p => p.isReady)) {
                            game.phase = GamePhase.TURN_TRANSITION;
                            game.currentPlayerId = game.players[0].id;
                        } else {
                            const nextPlayer = game.players.find(p => !p.isReady);
                            if (nextPlayer) game.currentPlayerId = nextPlayer.id;
                        }
                        break;
                    case 'fireShot':
                        game = modeLogic.processShot(game, movePayload.targetPlayerId, movePayload.x, movePayload.y);
                        break;
                    case 'useSkill':
                        const result = modeLogic.applySkill(game, playerId, movePayload.skillType, movePayload.options);
                        if ('error' in result) throw new Error(result.error);
                        game = result;
                        break;
                    case 'endTurn':
                        game = modeLogic.advanceTurn(game);
                        break;
                    case 'transitionContinue':
                        game.phase = GamePhase.PLAYING;
                        break;
                    case 'setActiveAction':
                        game.activeAction = movePayload.action;
                        break;
                    case 'activateMothershipEscape':
                    case 'selectShipForRelocation':
                        // Simplified - client sends updated activeAction state
                        game.activeAction = movePayload.action;
                        break;
                    default:
                        throw new Error(`Invalid move type: ${type}`);
                }

                game.lastUpdated = Date.now();
                games.set(gameId, game);
                return { statusCode: 200, body: JSON.stringify(game), headers };
            }

            default:
                return { statusCode: 400, body: JSON.stringify({ message: 'Invalid action' }), headers };
        }
    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }), headers };
    }
};

export { handler };
