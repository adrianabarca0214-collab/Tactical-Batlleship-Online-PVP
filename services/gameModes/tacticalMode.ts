
import { IGameModeLogic, GameState, Player, Grid, GameMode, CellState, GameLogEntry, Ship, ShipType } from "../../types";
import { createEmptyGrid, placeShip, canPlaceShip } from "../gameLogic";

const getColumnLetter = (col: number) => String.fromCharCode(65 + col);

const isShipJammed = (ship: Ship, player: Player): boolean => {
    if (!player.jamTurnsRemaining || player.jamTurnsRemaining === 0) {
        return false;
    }
    return ship.positions.some(shipPos =>
        player.jammedPositions?.some(jamPos => jamPos.x === shipPos.x && jamPos.y === shipPos.y)
    );
};

const initializePlayerTactical = (id: string, name: string, isAI: boolean, grid: Grid, gameMode: GameMode): Player => {
  const player: Player = {
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
    shieldedPositions: [],
    jammedPositions: [],
    jamTurnsRemaining: 0,
    escapeSkillUnlocked: false,
    actionPoints: 2,
    bonusAP: 0,
  };

  player.skillCooldowns = { 'Radarship': 0, 'Commandship': 0, 'Repairship': 0, 'Jamship': 0, 'Scoutship': 0, 'Camoship': 0, 'Supportship': 0, 'Shieldship': 0 };
  player.skillUses = { 'Decoyship': 2, 'Mothership': 1 };

  return player;
};

const advanceTurnTactical = (gameState: GameState): GameState => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const currentTurnPlayer = newGameState.players.find(p => p.id === newGameState.currentPlayerId);
    
    if (currentTurnPlayer) {
        // Cooldown reduction
        for (const shipType in currentTurnPlayer.skillCooldowns) {
            if (currentTurnPlayer.skillCooldowns[shipType as ShipType]! > 0) {
                currentTurnPlayer.skillCooldowns[shipType as ShipType]!--;
            }
        }
        // Jam duration
        if (currentTurnPlayer.jamTurnsRemaining && currentTurnPlayer.jamTurnsRemaining > 0) {
            currentTurnPlayer.jamTurnsRemaining--;
            if (currentTurnPlayer.jamTurnsRemaining === 0) {
                currentTurnPlayer.jammedPositions = [];
                if (newGameState.jammedArea?.playerId === currentTurnPlayer.id) {
                    newGameState.jammedArea = null;
                }
            }
        }
        // Target Lock duration (correctly handled on the attacker's turn)
        if (currentTurnPlayer.targetLocks) {
            for (const opponentId in currentTurnPlayer.targetLocks) {
                const lock = currentTurnPlayer.targetLocks[opponentId];
                if (lock.turnsRemaining > 0) {
                    lock.turnsRemaining--;
                    if (lock.turnsRemaining === 0) {
                        delete currentTurnPlayer.targetLocks[opponentId];
                    }
                }
            }
        }
    }

    let currentPlayerIndex = newGameState.players.findIndex(p => p.id === newGameState.currentPlayerId);
    let nextPlayerIndex = (currentPlayerIndex + 1) % newGameState.players.length;
    
    while(newGameState.players[nextPlayerIndex].isEliminated) {
        nextPlayerIndex = (nextPlayerIndex + 1) % newGameState.players.length;
        if (nextPlayerIndex === currentPlayerIndex) break;
    }
    
    const nextPlayer = newGameState.players[nextPlayerIndex];

    // Reset Action Points for the next player
    nextPlayer.actionPoints = 2;
    if (nextPlayer.bonusAP && nextPlayer.bonusAP > 0) {
        nextPlayer.actionPoints += nextPlayer.bonusAP;
        nextPlayer.bonusAP = 0;
    }

    const hasMultipleHumans = newGameState.players.filter(p => !p.isAI).length > 1;

    if (!nextPlayer.isAI && hasMultipleHumans) {
        newGameState.phase = 'TURN_TRANSITION';
    }

    newGameState.turn++;
    newGameState.currentPlayerId = newGameState.players[nextPlayerIndex].id;
    newGameState.activeAction = null;
    newGameState.radarScanResult = null;
    
    return newGameState;
};

const applySkillTactical = (gameState: GameState, playerId: string, skillType: ShipType, options: any): GameState | { error: string } => {
    const newG = JSON.parse(JSON.stringify(gameState));
    const p = newG.players.find((pl: Player) => pl.id === playerId)!;

    const applyStandardCost = (type: ShipType, cooldown: number) => {
        p.actionPoints -= 2;
        if (p.skillCooldowns[type] !== undefined) p.skillCooldowns[type] = cooldown;
        if (p.skillUses[type] !== undefined) p.skillUses[type]! -= 1;
    };
    
    switch (skillType) {
        case 'Repairship': {
            const { x, y } = options;
            const targetCell = p.grid[y][x];
            if (targetCell !== CellState.HIT) {
                return { error: "You can only repair damaged ship parts." };
            }
            const hitShip = p.ships.find((s: Ship) => s.positions.some(pos => pos.x === x && pos.y === y));
            if (hitShip && hitShip.hasBeenRepaired) {
                return { error: `${hitShip.name} has already been repaired once.` };
            }
            if (hitShip) {
                applyStandardCost('Repairship', 3);
                p.grid[y][x] = CellState.SHIP;

                // Reset this specific cell on all opponents' shot grids so they can shoot it again
                newG.players.forEach((opponent: Player) => {
                    if (opponent.id !== p.id && opponent.shots[p.id]?.[y]?.[x]) {
                        opponent.shots[p.id][y][x] = CellState.EMPTY;
                    }
                });
                
                // If the repaired part was shielded, remove the shield
                if (p.shieldedPositions) {
                    p.shieldedPositions = p.shieldedPositions.filter((pos: {x: number, y: number}) => pos.x !== x || pos.y !== y);
                }
                hitShip.hasBeenRepaired = true;
                const isStillDamaged = hitShip.positions.some((pos: {x:number, y:number}) => p.grid[pos.y][pos.x] === CellState.HIT);
                if (!isStillDamaged) {
                    hitShip.isDamaged = false;
                     // Ship is fully repaired, make it go dark for opponents
                    newG.players.forEach((opponent: Player) => {
                        if (opponent.id !== p.id && opponent.shots[p.id]) {
                            hitShip.positions.forEach((pos: {x:number, y:number}) => {
                                if (opponent.shots[p.id][pos.y]?.[pos.x]) {
                                    opponent.shots[p.id][pos.y][pos.x] = CellState.EMPTY;
                                }
                            });
                        }
                    });
                }
                
                newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} repaired their ${hitShip.name}.` });
                return newG;
            }
            return { error: "No ship found at the selected location." };
        }

        case 'Radarship': {
            const { radarTargets } = options;
            if (radarTargets.length !== 4) return { error: "Invalid number of radar targets."};
            applyStandardCost('Radarship', 3);
            const opponent = newG.players.find((pl: Player) => pl.id !== p.id)!;
            const results = radarTargets.map((c: {x:number, y:number}) => ({ x: c.x, y: c.y, state: opponent.grid[c.y][c.x] === CellState.SHIP ? CellState.RADAR_CONTACT : opponent.grid[c.y][c.x] }));
            newG.radarScanResult = { playerId: p.id, results };
            newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} scanned the enemy grid.` });
            return newG;
        }

        case 'Jamship': {
            const { jamTargets } = options;
            if (jamTargets.length !== 4) return { error: "Invalid number of jam targets."};
            applyStandardCost('Jamship', 4);
            const opponent = newG.players.find((pl: Player) => pl.id !== p.id)!;
            opponent.jammedPositions = jamTargets;
            opponent.jamTurnsRemaining = 1;
            newG.jammedArea = { playerId: opponent.id, coords: jamTargets };
            newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} jammed a section of the enemy grid.` });
            return newG;
        }
        
        case 'Decoyship': {
            const { x, y } = options;
            if (p.grid[y][x] !== CellState.EMPTY) {
                return { error: "Decoys can only be placed in empty water." };
            }
            applyStandardCost('Decoyship', 0);
            p.decoyPositions.push({x, y});
            newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} placed a decoy at ${getColumnLetter(x)}${y + 1}.` });
            return newG;
        }

        case 'Camoship': {
            const { x, y } = options;
            applyStandardCost('Camoship', 99); // One-time use
            p.camoArea = { x, y, width: 4, height: 4 };
            newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} deployed a camouflage field.` });
            return newG;
        }

        case 'Scoutship': {
            const { targets } = options;
            if (targets.length !== 4) return { error: "Invalid number of lock-on targets."};
            const opponent = newG.players.find((pl: Player) => pl.id !== p.id)!;
            applyStandardCost('Scoutship', 4);
            if(!p.targetLocks) p.targetLocks = {};
            p.targetLocks[opponent.id] = { cells: targets, turnsRemaining: 3 };
            newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} locked onto enemy coordinates.` });
            return newG;
        }
        
        case 'Shieldship': {
            const { x, y } = options;
            const targetCell = p.grid[y][x];

            if (targetCell === CellState.ASTEROID) {
                return { error: "Cannot place a shield on an asteroid." };
            }
            if (p.shieldedPositions?.some((pos: {x: number, y: number}) => pos.x === x && pos.y === y)) {
                return { error: "This location is already shielded." };
            }

            // Allow shielding on SHIP (healthy) or EMPTY cells
            if (targetCell !== CellState.SHIP && targetCell !== CellState.EMPTY) {
                 return { error: "Shields can only be placed on healthy ship parts or empty water." };
            }

            // One-shield-per-ship rule
            if (targetCell === CellState.SHIP) {
                const targetShip = p.ships.find((s: Ship) => s.positions.some(pos => pos.x === x && pos.y === y));
                if (targetShip) {
                    const shipAlreadyHasShield = targetShip.positions.some(pos =>
                        p.shieldedPositions?.some((sp: {x: number, y: number}) => sp.x === pos.x && sp.y === pos.y)
                    );
                    if (shipAlreadyHasShield) {
                        return { error: "This ship already has a shield." };
                    }
                }
            }

            applyStandardCost('Shieldship', 5);
            if (!p.shieldedPositions) p.shieldedPositions = [];
            p.shieldedPositions.push({ x, y });
            newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', coords: { x, y }, message: `${p.name} deployed a shield at ${getColumnLetter(x)}${y + 1}.` });
            return newG;
        }

        case 'Commandship':
        case 'Mothership': {
            const { x, y, isHorizontal, shipToMove: shipFromOptions } = options;
            const shipToMoveName = shipFromOptions?.name || newG.activeAction?.shipToMove?.name;
            const shipToMove = p.ships.find((s: Ship) => s.name === shipToMoveName)!;
            
            if (!shipToMove) {
                return { error: "No ship selected for relocation." };
            }

            if (isShipJammed(shipToMove, p)) {
                return { error: `${shipToMove.name} is jammed and cannot be relocated.` };
            }

            const gridWithoutShip = createEmptyGrid(newG.gridDimensions.rows, newG.gridDimensions.cols);
            p.ships.forEach((ship: Ship) => {
                if (ship.name !== shipToMove.name) {
                    ship.positions.forEach((pos: {x: number, y: number}) => { gridWithoutShip[pos.y][pos.x] = CellState.SHIP; });
                }
            });
            
            if (!canPlaceShip(gridWithoutShip, shipToMove, x, y, isHorizontal, newG.gridDimensions)) {
                return { error: "Cannot place ship there." };
            }
            
            // Logic to move shields with the ship
            const originalPositions = [...shipToMove.positions];
            const shieldedPartsIndices = originalPositions
                .map((pos, index) => p.shieldedPositions?.some((sp: {x: number, y: number}) => sp.x === pos.x && sp.y === pos.y) ? index : -1)
                .filter(index => index !== -1);
            
            p.shieldedPositions = p.shieldedPositions?.filter((sp: {x: number, y: number}) => !originalPositions.some(op => op.x === sp.x && op.y === sp.y)) || [];


            if (skillType === 'Mothership') {
                applyStandardCost('Mothership', 99);
                shipToMove.positions.forEach((pos: {x:number, y:number}) => { if(p.grid[pos.y][pos.x] === CellState.HIT) p.grid[pos.y][pos.x] = CellState.SHIP; });
                shipToMove.isDamaged = false;
                newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} executed an emergency escape maneuver!` });
            } else {
                applyStandardCost('Commandship', 4);
                shipToMove.hasBeenRelocated = true;
                newG.log.unshift({ turn: newG.turn, playerId: p.id, playerName: p.name, result: 'SKILL_USED', message: `${p.name} relocated their ${shipToMove.name}.` });
            }
            
            p.grid = p.grid.map((row: CellState[], y: number) => row.map((cell: CellState, x: number) => (shipToMove.positions.some((pos: {x:number, y:number}) => pos.x === x && pos.y === y)) ? CellState.EMPTY : cell));
            const { newGrid, newShip } = placeShip(p.grid, shipToMove, x, y, isHorizontal);
            p.grid = newGrid;
            
            // Re-apply shields to new positions
            if (shieldedPartsIndices.length > 0) {
                shieldedPartsIndices.forEach(index => {
                    const newShieldPos = newShip.positions[index];
                    if (newShieldPos) p.shieldedPositions.push(newShieldPos);
                });
            }

            const shipIndex = p.ships.findIndex((s: Ship) => s.name === newShip.name);
            p.ships[shipIndex] = newShip;
            return newG;
        }
        default:
            return { error: "Unknown skill type." };
    }
};

const processShotTactical = (gameState: GameState, targetPlayerId: string | null, x: number, y: number): GameState => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const attacker = newGameState.players.find(p => p.id === newGameState.currentPlayerId)!;
    const target = newGameState.players.find(p => p.id === targetPlayerId)!;
    
    if (!attacker.shots[targetPlayerId]) {
        attacker.shots[targetPlayerId] = createEmptyGrid(newGameState.gridDimensions.rows, newGameState.gridDimensions.cols);
    }

    const currentShotCellState = attacker.shots[targetPlayerId][y][x];
    if (currentShotCellState !== CellState.EMPTY && currentShotCellState !== CellState.RADAR_CONTACT && currentShotCellState !== CellState.SHIELD_HIT) {
        return gameState; // Invalid shot on an already revealed cell
    }

    attacker.actionPoints -= 1;
    newGameState.lastShot = { coords: { x, y }, attackerId: attacker.id, targetId: target.id };

    const baseLogEntry = {
        turn: newGameState.turn,
        playerId: attacker.id,
        playerName: attacker.name,
        coords: { x, y },
        targetId: target.id,
        targetName: target.name,
    };

    // --- PRIORITY 1: SHIELD CHECK ---
    const isShielded = target.shieldedPositions?.some((p: {x: number, y: number}) => p.x === x && p.y === y);
    if (isShielded) {
        target.shieldedPositions = target.shieldedPositions.filter((p: {x: number, y: number}) => p.x !== x || p.y !== y);
        const underlyingCell = target.grid[y][x];
        const wasBluff = (underlyingCell === CellState.EMPTY || underlyingCell === CellState.MISS);

        const isCamo = target.camoArea && x >= target.camoArea.x && x < target.camoArea.x + 4 && y >= target.camoArea.y && y < target.camoArea.y + 4;
        const isLocked = attacker.targetLocks?.[target.id]?.cells.some(c => c.x === x && c.y === y);

        if (isCamo && !isLocked) {
            attacker.shots[targetPlayerId][y][x] = CellState.CAMO_HIT;
            newGameState.log.unshift({ ...baseLogEntry, result: 'CAMO_HIT' });
        } else {
            attacker.shots[targetPlayerId][y][x] = CellState.SHIELD_HIT;
            const message = wasBluff 
                ? `${attacker.name}'s shot at ${getColumnLetter(x)}${y+1} broke a bluff shield!`
                : `${attacker.name}'s shot at ${getColumnLetter(x)}${y+1} was absorbed by an energy shield!`;
            newGameState.log.unshift({ ...baseLogEntry, result: 'SHIELD_BROKEN', message });
        }
        return newGameState; // Shield absorbs the hit, no further processing.
    }

    // --- NO SHIELD ---
    const targetCell = target.grid[y][x];

    // --- PRIORITY 2: ASTEROID CHECK ---
    if (targetCell === CellState.ASTEROID) {
        target.grid[y][x] = CellState.EMPTY;
        attacker.shots[targetPlayerId][y][x] = CellState.ASTEROID_DESTROYED;
        newGameState.log.unshift({ ...baseLogEntry, result: 'ASTEROID_DESTROYED' });
        return newGameState;
    }

    // --- PRIORITY 3: CAMO/LOCK CHECK ---
    const isCamo = target.camoArea && x >= target.camoArea.x && x < target.camoArea.x + 4 && y >= target.camoArea.y && y < target.camoArea.y + 4;
    const isLocked = attacker.targetLocks?.[target.id]?.cells.some(c => c.x === x && c.y === y);

    if (isCamo && !isLocked) {
        // Attacker sees CAMO_HIT, but we process the actual result silently on the backend.
        attacker.shots[targetPlayerId][y][x] = CellState.CAMO_HIT;
        newGameState.log.unshift({ ...baseLogEntry, result: 'CAMO_HIT' });

        const decoyIndex = target.decoyPositions?.findIndex((p: {x:number, y:number}) => p.x === x && p.y === y);
        if (decoyIndex > -1) {
            target.decoyPositions.splice(decoyIndex, 1);
        } else if (targetCell === CellState.SHIP) {
            const hitShip = target.ships.find((ship: Ship) => ship.positions.some(pos => pos.x === x && pos.y === y))!;
            target.grid[y][x] = CellState.HIT;
            hitShip.isDamaged = true;

            if (hitShip.type === 'Mothership') {
                if (!target.escapeSkillUnlocked) target.escapeSkillUnlocked = true;
                // MOTHERSHIP HIT MECHANIC
                attacker.bonusAP = (attacker.bonusAP || 0) + attacker.actionPoints;
                attacker.actionPoints = 0;
            }

            if (hitShip.type === 'Supportship') {
                target.bonusAP = (target.bonusAP || 0) + 1;
            }

            const isSunk = hitShip.positions.every((pos: {x:number, y:number}) => target.grid[pos.y][pos.x] === CellState.HIT);
            if (isSunk) {
                hitShip.isSunk = true;
                attacker.bonusAP = (attacker.bonusAP || 0) + 1;
                if (hitShip.type === 'Mothership') {
                    target.isEliminated = true;
                    newGameState.phase = 'GAME_OVER';
                    newGameState.winner = attacker.id;
                }
            }
        }
        return newGameState;
    }

    // --- PRIORITY 4: DECOY/HIT/MISS CHECK ---
    const decoyIndex = target.decoyPositions?.findIndex((p: {x:number, y:number}) => p.x === x && p.y === y);
    if (decoyIndex > -1) {
        attacker.shots[targetPlayerId][y][x] = CellState.HIT;
        target.decoyPositions.splice(decoyIndex, 1);
        newGameState.log.unshift({ ...baseLogEntry, result: 'HIT', hitShipName: 'decoy' });
    } else if (targetCell === CellState.SHIP) {
        attacker.shots[targetPlayerId][y][x] = CellState.HIT;
        target.grid[y][x] = CellState.HIT;
        const hitShip = target.ships.find((ship: Ship) => ship.positions.some(pos => pos.x === x && pos.y === y))!;
        hitShip.isDamaged = true;

        if (hitShip.type === 'Supportship') {
            target.bonusAP = (target.bonusAP || 0) + 1;
            newGameState.log.unshift({ turn: newGameState.turn, playerId: target.id, playerName: target.name, result: 'SKILL_USED', message: `${target.name} will gain +1 AP next turn from a passive ability!` });
        }
        
        if (hitShip.type === 'Mothership') {
            if (!target.escapeSkillUnlocked) target.escapeSkillUnlocked = true;
            attacker.bonusAP = (attacker.bonusAP || 0) + attacker.actionPoints;
            attacker.actionPoints = 0; // End turn
        }

        const isSunk = hitShip.positions.every((pos: {x:number, y:number}) => target.grid[pos.y][pos.x] === CellState.HIT);
        if (isSunk) {
            hitShip.isSunk = true;
            attacker.bonusAP = (attacker.bonusAP || 0) + 1;
            hitShip.positions.forEach((pos: {x:number, y:number}) => {
                target.grid[pos.y][pos.x] = CellState.SUNK;
                attacker.shots[targetPlayerId][pos.y][pos.x] = CellState.SUNK;
            });
            newGameState.log.unshift({ ...baseLogEntry, result: 'SUNK_SHIP', sunkShipName: hitShip.name, message: `${attacker.name} will receive +1 AP next turn.` });
            if (hitShip.type === 'Mothership') {
                target.isEliminated = true;
                newGameState.phase = 'GAME_OVER';
                newGameState.winner = attacker.id;
            }
        } else {
            newGameState.log.unshift({ ...baseLogEntry, result: 'HIT', hitShipName: hitShip.name });
        }
    } else {
        attacker.shots[targetPlayerId][y][x] = CellState.MISS;
        target.grid[y][x] = CellState.MISS;
        newGameState.log.unshift({ ...baseLogEntry, result: 'MISS' });
    }
    return newGameState;
};


export const tacticalModeLogic: IGameModeLogic = {
    processShot: processShotTactical,
    advanceTurn: advanceTurnTactical,
    applySkill: applySkillTactical,
    initializePlayer: initializePlayerTactical,
};
