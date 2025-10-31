


export enum GamePhase {
  LOBBY = 'LOBBY',
  FLEET_SELECTION = 'FLEET_SELECTION',
  AI_FLEET_SELECTION = 'AI_FLEET_SELECTION',
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  TURN_TRANSITION = 'TURN_TRANSITION',
}

export enum CellState {
  EMPTY = 'EMPTY',
  SHIP = 'SHIP',
  HIT = 'HIT',
  MISS = 'MISS',
  SUNK = 'SUNK',
  DECOY = 'DECOY',
  RADAR_CONTACT = 'RADAR_CONTACT',
  ASTEROID = 'ASTEROID',
  CAMO_HIT = 'CAMO_HIT',
  ASTEROID_DESTROYED = 'ASTEROID_DESTROYED',
  SHIELD_HIT = 'SHIELD_HIT',
}

export type ShipType = 'Mothership' | 'Radarship' | 'Repairship' | 'Commandship' | 'Decoyship' | 'Jamship' | 'Camoship' | 'Scoutship' | 'Supportship' | 'Shieldship';

export interface Ship {
  name: string;
  type: ShipType;
  length: number;
  positions: { x: number; y: number }[];
  isSunk: boolean;
  isDamaged: boolean;
  hasBeenRepaired: boolean;
  hasBeenRelocated: boolean;
  pointCost: number;
}

export type Grid = CellState[][];

export type GameMode = 'CLASSIC' | 'TACTICAL';
export type MapType = 'STANDARD' | 'ASTEROID_FIELD';
export type OpponentType = 'AI' | 'Human' | 'ONLINE';

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  grid: Grid;
  ships: Ship[];
  shots: { [key: string]: Grid }; // Key is opponent player ID
  isReady: boolean;
  isEliminated: boolean;
  score: number;
  skillCooldowns: { [key in ShipType]?: number };
  skillUses: { [key in ShipType]?: number };
  decoyPositions: { x: number; y: number }[];
  shieldedPositions?: { x: number; y: number }[];
  jammedPositions?: { x: number; y: number }[];
  jamTurnsRemaining?: number;
  escapeSkillUnlocked?: boolean;
  actionPoints: number;
  bonusAP?: number;
  camoArea?: { x: number; y: number; width: number; height: number };
  targetLocks?: { [opponentId: string]: { cells: { x: number; y: number }[], turnsRemaining: number } };
  sessionId?: string; // To identify a player's browser session
}

export interface GameLogEntry {
  turn: number;
  playerId: string;
  playerName: string;
  targetId?: string | null;
  targetName?: string;
  coords?: { x: number; y: number };
  result: 'HIT' | 'MISS' | 'SUNK_SHIP' | 'SHOT_FIRED' | 'SKILL_USED' | 'CAMO_HIT' | 'ASTEROID_DESTROYED' | 'SHIELD_BROKEN';
  sunkShipName?: string;
  hitShipName?: string;
  message?: string;
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerId: string | null;
  winner: string | null;
  maxPlayers: number;
  turn: number;
  gridDimensions: { rows: number; cols: number };
  shipsConfig: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired' | 'hasBeenRelocated'>[];
  gameMode: GameMode;
  mapType: MapType;
  opponentType: OpponentType;
  fleetBudget: number;
  log: GameLogEntry[];
  // Fields for Tactical Mode
  activeAction?: {
    playerId: string;
    type: 'ATTACK' | 'SKILL';
    shipType?: ShipType;
    stage?: 'SELECT_SHIP' | 'PLACE_SHIP' | 'PLACE_DECOY' | 'SELECT_J_TARGETS' | 'SELECT_TARGET_LOCK' | 'SELECT_R_TARGETS' | 'PLACE_CAMO' | 'SELECT_SHIELD_TARGET';
    shipToMove?: Ship;
    isHorizontal?: boolean;
    originalPositions?: { x: number; y: number; state: CellState }[];
    jamTargets?: { x: number; y: number }[];
    radarTargets?: { x: number; y: number }[];
    targetLockTargets?: { x: number; y: number }[];
  } | null;
  radarScanResult?: {
    playerId: string;
    results: { x: number; y: number; state: CellState }[];
  } | null;
  jammedArea?: {
    playerId: string;
    coords: { x: number; y: number }[];
  } | null;
  hitLog?: { [playerId: string]: { [coord: string]: number } }; // coord: 'x,y', value: turn number
  lastHitTurn?: { [shipName: string]: number };
  lastShot?: {
    coords: { x: number; y: number };
    attackerId: string;
    targetId: string;
  } | null;
  lastUpdated?: number; // Timestamp for polling
}

export type PlayerId = string;

export interface IGameModeLogic {
  processShot: (gameState: GameState, targetPlayerId: string | null, x: number, y: number) => GameState;
  advanceTurn: (gameState: GameState) => GameState;
  applySkill: (gameState: GameState, playerId: string, skillType: ShipType, options: any) => GameState | { error: string };
  initializePlayer: (id: string, name: string, isAI: boolean, grid: Grid, gameMode: GameMode) => Player;
}

export interface IOpponentLogic {
  handleFleetReady(gameState: GameState, player: Player): { newState: GameState, nextPlayerIndexToSetup?: number | null };
  handleSetupReady(gameState: GameState, player: Player): { newState: GameState, nextPlayerIndexToSetup?: number | null };
}