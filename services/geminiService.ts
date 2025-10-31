
import { CellState, Grid, Player, GameState, Ship, ShipType } from '../types';
import { createEmptyGrid, canPlaceShip } from "./gameLogic";
import { getModeLogic } from './gameModeStrategy';

/**
 * Creates a strategic fleet for the AI based on a randomly chosen personality.
 * @param shipPool The list of all available ships with their costs.
 * @param budget The total point budget for the fleet.
 * @returns An array of Ship objects representing the AI's chosen fleet.
 */
export const getAIFleetSelection = (
    shipPool: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired' | 'hasBeenRelocated'>[],
    budget: number
): Ship[] => {
    let fleet: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired' | 'hasBeenRelocated'>[] = [];
    let currentCost = 0;
    
    const strategies = ['STEALTH_AGGRO', 'COUNTER_INTEL', 'BALANCED_UTILITY', 'DEFENSIVE_WALL', 'MAX_PRESSURE_SWARM'];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    // 1. Mothership is mandatory and free.
    const mothership = shipPool.find(s => s.type === 'Mothership');
    if (!mothership) {
        console.error("Mothership not found in ship pool!");
        return []; // Should not happen
    }
    fleet.push(mothership);
    // currentCost is 0 for mothership

    let availableShips = shipPool.filter(s => s.type !== 'Mothership');
    
    // 2. Add strategy-specific priority ships.
    const addShip = (type: ShipType) => {
        const ship = availableShips.find(s => s.type === type);
        if (ship && currentCost + ship.pointCost <= budget) {
            fleet.push(ship);
            currentCost += ship.pointCost;
            availableShips = availableShips.filter(s => s.type !== type);
            return true;
        }
        return false;
    };

    switch (strategy) {
        case 'STEALTH_AGGRO':
            addShip('Camoship');
            addShip('Jamship');
            break;
        case 'COUNTER_INTEL':
            addShip('Scoutship');
            addShip('Radarship');
            break;
        case 'BALANCED_UTILITY':
            addShip('Commandship');
            addShip('Repairship');
            break;
        case 'DEFENSIVE_WALL':
            addShip('Shieldship');
            addShip('Repairship');
            addShip('Supportship');
            addShip('Decoyship');
            break;
        case 'MAX_PRESSURE_SWARM':
            addShip('Supportship');
            addShip('Decoyship');
            break;
    }

    // 3. Fill the remaining budget.
    if (strategy === 'MAX_PRESSURE_SWARM') {
      // For swarm, prioritize quantity: sort by cheapest first.
      availableShips.sort((a, b) => a.pointCost - b.pointCost);
    } else {
      // For others, prioritize quality: sort by most expensive first.
      availableShips.sort((a, b) => b.pointCost - a.pointCost);
    }

    for (const ship of availableShips) {
        if (currentCost + ship.pointCost <= budget) {
            fleet.push(ship);
            currentCost += ship.pointCost;
        }
    }
    
    // Convert to the full Ship type for the game state
    return fleet.map(s => ({
        ...s,
        positions: [],
        isSunk: false,
        isDamaged: false,
        hasBeenRepaired: false,
        hasBeenRelocated: false,
    }));
};


/**
 * Checks if a ship can be placed on a grid, considering existing shots.
 * A placement is valid if it doesn't overlap with any MISS cells.
 * @param shotsGrid The grid showing hits, misses, etc.
 * @param ship The ship to place.
 * @param x The starting x-coordinate.
 * @param y The starting y-coordinate.
 * @param isHorizontal The orientation of the ship.
 * @param gridDimensions The dimensions of the grid.
 * @returns True if the placement is valid, false otherwise.
 */
const canShipBePlaced = (
    shotsGrid: Grid,
    ship: { length: number },
    x: number,
    y: number,
    isHorizontal: boolean,
    gridDimensions: { rows: number, cols: number }
): boolean => {
    if (isHorizontal) {
        if (x + ship.length > gridDimensions.cols) return false;
        for (let i = 0; i < ship.length; i++) {
            if ((shotsGrid[y]?.[x + i] ?? CellState.EMPTY) === CellState.MISS) return false;
        }
    } else {
        if (y + ship.length > gridDimensions.rows) return false;
        for (let i = 0; i < ship.length; i++) {
            if ((shotsGrid[y + i]?.[x] ?? CellState.EMPTY) === CellState.MISS) return false;
        }
    }
    return true;
};

// Threat priority for identified enemy ships. Higher number = higher priority target.
const TARGET_PRIORITY: { [key in ShipType]?: number } = {
    Repairship: 1.5,
    Jamship: 1.4,
    Scoutship: 1.4,
    Shieldship: 1.3,
    Supportship: 1.2,
    Camoship: 1.2,
    Commandship: 1.1,
};


/**
 * Builds a probability map indicating the likelihood of a ship occupying each cell.
 * @param opponent The opponent player whose ships we are trying to find.
 * @param shotsGrid The AI's grid of shots taken against the opponent.
 * @param gridDimensions The dimensions of the game grid.
 * @returns A 2D array representing the probability heatmap.
 */
const buildProbabilityMap = (
    opponent: Player,
    shotsGrid: Grid,
    gridDimensions: { rows: number, cols: number }
): number[][] => {
    const probabilityMap: number[][] = Array(gridDimensions.rows).fill(0).map(() => Array(gridDimensions.cols).fill(0));
    const unsunkShips = opponent.ships.filter(ship => !ship.isSunk);

    const hitCells: { x: number, y: number }[] = [];
    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            if ((shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.HIT) {
                hitCells.push({ x, y });
            }
        }
    }

    for (const ship of unsunkShips) {
        // Check if we've hit this ship before to identify it
        const isIdentified = opponent.grid[ship.positions[0].y][ship.positions[0].x] === CellState.HIT;
        const priorityMultiplier = isIdentified ? (TARGET_PRIORITY[ship.type] || 1.0) : 1.0;

        for (let y = 0; y < gridDimensions.rows; y++) {
            for (let x = 0; x < gridDimensions.cols; x++) {
                // Try placing horizontally
                if (canShipBePlaced(shotsGrid, ship, x, y, true, gridDimensions)) {
                    const placementHits = [];
                    for (let i = 0; i < ship.length; i++) {
                        if ((shotsGrid[y]?.[x + i] ?? CellState.EMPTY) === CellState.HIT) {
                            placementHits.push({ x: x + i, y });
                        }
                    }
                    const relevantHits = hitCells.filter(h => h.y === y && h.x >= x && h.x < x + ship.length);
                    if (placementHits.length === relevantHits.length) {
                         for (let i = 0; i < ship.length; i++) {
                            probabilityMap[y][x + i] += 1 * priorityMultiplier;
                        }
                    }
                }
                // Try placing vertically
                if (canShipBePlaced(shotsGrid, ship, x, y, false, gridDimensions)) {
                     const placementHits = [];
                    for (let i = 0; i < ship.length; i++) {
                        if ((shotsGrid[y + i]?.[x] ?? CellState.EMPTY) === CellState.HIT) {
                            placementHits.push({ x, y: y+i });
                        }
                    }
                    const relevantHits = hitCells.filter(h => h.x === x && h.y >= y && h.y < y + ship.length);
                    if (placementHits.length === relevantHits.length) {
                        for (let i = 0; i < ship.length; i++) {
                            probabilityMap[y + i][x] += 1 * priorityMultiplier;
                        }
                    }
                }
            }
        }
    }
    
     if (hitCells.length > 0) {
        hitCells.forEach(hit => {
            const adjacent = [
                {x: hit.x, y: hit.y - 1}, {x: hit.x, y: hit.y + 1},
                {x: hit.x - 1, y: hit.y}, {x: hit.x + 1, y: hit.y}
            ];
            adjacent.forEach(cell => {
                if (cell.x >= 0 && cell.x < gridDimensions.cols && cell.y >= 0 && cell.y < gridDimensions.rows && (shotsGrid[cell.y]?.[cell.x] ?? CellState.EMPTY) === CellState.EMPTY) {
                    probabilityMap[cell.y][cell.x] *= 5; // Heavily weight adjacent cells
                }
            });
        });
    }

    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            if ((shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.SHIELD_HIT) {
                const adjacent = [
                    {x, y}, {x, y: y - 1}, {x, y: y + 1}, {x: x - 1, y}, {x: x + 1, y}
                ];
                adjacent.forEach(cell => {
                    if (cell.x >= 0 && cell.x < gridDimensions.cols && cell.y >= 0 && cell.y < gridDimensions.rows) {
                        probabilityMap[cell.y][cell.x] *= 3;
                    }
                });
            }
        }
    }

    return probabilityMap;
};

/**
 * Finds the coordinates of the cell(s) with the highest probability.
 * @param probabilityMap The probability heatmap.
 * @param shotsGrid The AI's record of shots to avoid targeting known cells.
 * @returns An array of coordinates for the best cells to target.
 */
const findBestTargets = (probabilityMap: number[][], shotsGrid: Grid): { x: number, y: number }[] => {
    let maxProbability = -1;
    let bestTargets: { x: number, y: number }[] = [];

    for (let y = 0; y < probabilityMap.length; y++) {
        for (let x = 0; x < probabilityMap[y].length; x++) {
            if ((shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.EMPTY || (shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.RADAR_CONTACT) {
                if (probabilityMap[y][x] > maxProbability) {
                    maxProbability = probabilityMap[y][x];
                    bestTargets = [{ x, y }];
                } else if (probabilityMap[y][x] === maxProbability) {
                    bestTargets.push({ x, y });
                }
            }
        }
    }
    return bestTargets;
};

/**
 * Finds the best 4 cells to scan with Radar Bots based on the probability map.
 * It prioritizes high-probability cells that are not adjacent to each other.
 * @param probabilityMap The probability heatmap.
 * @param shotsGrid The AI's record of shots taken.
 * @param gridDimensions The dimensions of the grid.
 * @returns An array of up to 4 coordinates to scan.
 */
const findBestRadarTargets = (probabilityMap: number[][], shotsGrid: Grid, gridDimensions: { rows: number; cols: number }): { x: number; y: number }[] => {
    const allCells: { x: number; y: number; prob: number }[] = [];
    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            if ((shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.EMPTY || (shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.RADAR_CONTACT) {
                allCells.push({ x, y, prob: probabilityMap[y][x] });
            }
        }
    }

    allCells.sort((a, b) => b.prob - a.prob);

    const targets: { x: number; y: number }[] = [];
    
    for (const cell of allCells) {
        if (targets.length >= 4) break;
        
        const isAdjacent = targets.some(target => 
            Math.abs(target.x - cell.x) <= 1 && Math.abs(target.y - cell.y) <= 1
        );
        
        if (!isAdjacent) {
            targets.push({ x: cell.x, y: cell.y });
        }
    }

    if (targets.length < 4) {
        for (const cell of allCells) {
            if (targets.length >= 4) break;
            if (!targets.some(t => t.x === cell.x && t.y === cell.y)) {
                targets.push({ x: cell.x, y: cell.y });
            }
        }
    }

    return targets.map(({ x, y }) => ({ x, y }));
};


const findBestTargetLockTargets = (probabilityMap: number[][], shotsGrid: Grid, gridDimensions: { rows: number; cols: number }): { x: number; y: number }[] => {
    return findBestRadarTargets(probabilityMap, shotsGrid, gridDimensions); // Same logic: find 4 best spots
}


/**
 * Finds the best place to deploy a decoy, which is a large area of low probability.
 * @param probabilityMap The probability heatmap.
 * @param shotsGrid The AI's record of shots.
 * @param gridDimensions The dimensions of the grid.
 * @returns A valid coordinate for decoy placement.
 */
const findBestDecoySpot = (probabilityMap: number[][], shotsGrid: Grid, gridDimensions: { rows: number; cols: number }): { x: number; y: number } | null => {
    let minDensity = Infinity;
    const potentialSpots: { x: number; y: number }[] = [];

    for (let y = 0; y < gridDimensions.rows - 1; y++) {
        for (let x = 0; x < gridDimensions.cols - 1; x++) {
             if ((shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.EMPTY) {
                const density = probabilityMap[y][x] + probabilityMap[y+1][x] + probabilityMap[y][x+1] + probabilityMap[y+1][x+1];
                if (density < minDensity) {
                    minDensity = density;
                    potentialSpots.length = 0;
                    potentialSpots.push({ x, y });
                } else if (density === minDensity) {
                    potentialSpots.push({ x, y });
                }
             }
        }
    }

    if (potentialSpots.length > 0) {
        return potentialSpots[Math.floor(Math.random() * potentialSpots.length)];
    }
    return null;
}

/**
 * Finds the best spot for the AI to place its camouflage field.
 * It identifies the 4x4 area that covers the most ship parts, prioritizing the Mothership.
 * @param aiPlayer The AI player object.
 * @param gridDimensions The dimensions of the grid.
 * @returns The top-left coordinate for the best camouflage placement.
 */
const findBestCamoSpot = (aiPlayer: Player, gridDimensions: { rows: number; cols: number }): { x: number; y: number } | null => {
    let bestSpot: { x: number; y: number } | null = null;
    let maxScore = -1;

    const mothership = aiPlayer.ships.find(s => s.type === 'Mothership');

    for (let y = 0; y <= gridDimensions.rows - 4; y++) {
        for (let x = 0; x <= gridDimensions.cols - 4; x++) {
            let currentScore = 0;
            for (let j = 0; j < 4; j++) {
                for (let i = 0; i < 4; i++) {
                    const cellState = aiPlayer.grid[y + j]?.[x + i];
                    if (cellState === CellState.SHIP || cellState === CellState.HIT) {
                        currentScore++;
                        // Check if this part belongs to the mothership
                        if (mothership?.positions.some(p => p.x === x + i && p.y === y + j)) {
                            currentScore += 3; // Prioritize covering the mothership
                        }
                    }
                }
            }
            if (currentScore > maxScore) {
                maxScore = currentScore;
                bestSpot = { x, y };
            }
        }
    }
    return bestSpot;
};

/**
 * Finds a valuable, healthy ship that is in a threatened position.
 * @param aiPlayer The AI player object.
 * @param opponent The opponent player object.
 * @param gridDimensions Grid dimensions.
 * @returns A ship object if a suitable candidate for relocation is found.
 */
const findShipToRelocate = (aiPlayer: Player, opponent: Player, gridDimensions: { rows: number, cols: number }): Ship | null => {
    const opponentShotsGrid = opponent.shots[aiPlayer.id] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
    const opponentProbabilityMap = buildProbabilityMap(aiPlayer, opponentShotsGrid, gridDimensions);

    const valuableShipsPriority: ShipType[] = ['Mothership', 'Repairship', 'Jamship', 'Radarship', 'Decoyship', 'Commandship'];
    
    for (const shipType of valuableShipsPriority) {
        const ship = aiPlayer.ships.find(s => s.type === shipType && !s.isDamaged && !s.isSunk && !s.hasBeenRelocated);
        if (ship) {
            const shipThreat = ship.positions.reduce((sum, pos) => sum + (opponentProbabilityMap[pos.y]?.[pos.x] ?? 0), 0);
            if (shipThreat > ship.length * 2) { // Heuristic: if average threat per cell is > 2
                return ship;
            }
        }
    }
    return null;
}

/**
 * Finds the best ship part to shield based on value, damage, threat, and potential for bluffing.
 * @param aiPlayer The AI player object.
 * @param opponent The opponent player object.
 * @param gridDimensions The dimensions of the grid.
 * @returns The coordinate of the best part to shield, or null.
 */
const findBestShieldTarget = (aiPlayer: Player, opponent: Player, gridDimensions: { rows: number, cols: number }): { x: number, y: number } | null => {
    const opponentShotsGrid = opponent.shots[aiPlayer.id] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
    const opponentProbabilityMap = buildProbabilityMap(aiPlayer, opponentShotsGrid, gridDimensions);

    const potentialTargets: { x: number, y: number, score: number, type: 'DEFEND' | 'BLUFF' }[] = [];

    // --- DEFEND STRATEGY: Shielding own assets ---
    aiPlayer.ships.forEach(ship => {
        if (ship.isSunk) return;

        // One Shield Per Ship Rule: Check if this ship already has a shield.
        const shipAlreadyHasShield = ship.positions.some(p => 
            aiPlayer.shieldedPositions?.some(sp => sp.x === p.x && sp.y === p.y)
        );
        if (shipAlreadyHasShield) return;

        ship.positions.forEach(pos => {
            const cellState = aiPlayer.grid[pos.y][pos.x];
            // Only consider healthy parts for shielding a ship
            if (cellState === CellState.SHIP) {
                let score = opponentProbabilityMap[pos.y][pos.x] || 1;
                score *= 5; // Prioritize healthy parts under threat
                
                // Prioritize valuable ships
                if (ship.type === 'Mothership') score *= 4;
                else if (['Repairship', 'Jamship', 'Shieldship'].includes(ship.type)) score *= 2;
                
                // Prioritize parts within a camo field
                const isInCamo = aiPlayer.camoArea && pos.x >= aiPlayer.camoArea.x && pos.x < aiPlayer.camoArea.x + 4 && pos.y >= aiPlayer.camoArea.y && pos.y < aiPlayer.camoArea.y + 4;
                if(isInCamo) score *= 3;

                potentialTargets.push({ ...pos, score, type: 'DEFEND' });
            }
        });
    });

    // --- BLUFF STRATEGY: Shielding empty cells to waste enemy shots ---
    // Find the top 5 most threatened empty cells
    const emptyCells: { x: number, y: number, prob: number }[] = [];
    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            if (aiPlayer.grid[y][x] === CellState.EMPTY && !aiPlayer.shieldedPositions?.some(p => p.x === x && p.y === y)) {
                emptyCells.push({ x, y, prob: opponentProbabilityMap[y][x] || 0 });
            }
        }
    }

    emptyCells.sort((a, b) => b.prob - a.prob);
    const topEmptyCells = emptyCells.slice(0, 5);

    topEmptyCells.forEach(cell => {
        // Score is based on threat, but lower than defending a real asset
        potentialTargets.push({ x: cell.x, y: cell.y, score: cell.prob * 1.5, type: 'BLUFF' });
    });


    if (potentialTargets.length === 0) return null;

    potentialTargets.sort((a, b) => b.score - a.score);
    
    // AI Personality: 75% chance to pick the absolute best target (usually defensive).
    // 25% chance to pick the best bluffing spot if it's in the top 3 choices.
    if (Math.random() > 0.75) {
        const bestBluff = potentialTargets.find(t => t.type === 'BLUFF');
        const top3 = potentialTargets.slice(0, 3);
        if (bestBluff && top3.includes(bestBluff)) {
            return bestBluff;
        }
    }

    return potentialTargets[0];
};


/**
 * Finds the safest possible placement for a ship to be relocated to.
 * @param gridWithoutShip The AI's grid, with the moving ship removed.
 * @param ship The ship to relocate.
 * @param opponentProbabilityMap The opponent's probability map against the AI.
 * @param gridDimensions Grid dimensions.
 * @returns The coordinates and orientation of the safest spot.
 */
const findBestRelocationSpot = (
    gridWithoutShip: Grid,
    ship: Ship,
    opponentProbabilityMap: number[][],
    gridDimensions: { rows: number; cols: number }
): { x: number; y: number; isHorizontal: boolean } | null => {
    let bestSpot: { x: number; y: number; isHorizontal: boolean } | null = null;
    let minThreat = Infinity;

    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            // Try horizontal placement
            if (canPlaceShip(gridWithoutShip, ship, x, y, true, gridDimensions)) {
                let currentThreat = 0;
                for (let i = 0; i < ship.length; i++) {
                    currentThreat += opponentProbabilityMap[y]?.[x + i] ?? 0;
                }
                if (currentThreat < minThreat) {
                    minThreat = currentThreat;
                    bestSpot = { x, y, isHorizontal: true };
                }
            }
            // Try vertical placement
            if (canPlaceShip(gridWithoutShip, ship, x, y, false, gridDimensions)) {
                let currentThreat = 0;
                for (let i = 0; i < ship.length; i++) {
                    currentThreat += opponentProbabilityMap[y + i]?.[x] ?? 0;
                }
                if (currentThreat < minThreat) {
                    minThreat = currentThreat;
                    bestSpot = { x, y, isHorizontal: false };
                }
            }
        }
    }
    return bestSpot;
};

const isShipJammed = (ship: Ship, player: Player): boolean => {
    if (!player.jamTurnsRemaining || player.jamTurnsRemaining === 0) {
        return false;
    }
    return ship.positions.some(shipPos =>
        player.jammedPositions?.some(jamPos => jamPos.x === shipPos.x && jamPos.y === shipPos.y)
    );
};

/**
 * Gets a single strategic decision for the AI. This is the "Strategist" brain.
 */
export const getAIStrategicDecision = (aiPlayer: Player, opponent: Player, gameState: GameState): any => {
    const { gridDimensions } = gameState;
    const shotsGrid = aiPlayer.shots[opponent.id] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
    const probabilityMap = buildProbabilityMap(opponent, shotsGrid, gridDimensions);

    // --- AI DECISION TREE (MASTER TACTICIAN) ---
    const canAffordSkill = aiPlayer.actionPoints >= 2;

    // PRIORITY 1: URGENT ACTIONS (WIN/SURVIVE)
    const mothership = aiPlayer.ships.find(s => s.type === 'Mothership');
    if (canAffordSkill && mothership) {
        if (mothership.isDamaged && aiPlayer.escapeSkillUnlocked && (aiPlayer.skillUses?.Mothership ?? 0) > 0 && !isShipJammed(mothership, aiPlayer)) {
            const gridWithoutShip = aiPlayer.grid.map(row => [...row]);
            mothership.positions.forEach(pos => { gridWithoutShip[pos.y][pos.x] = CellState.EMPTY; });
            const opponentShotsGrid = opponent.shots[aiPlayer.id] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
            const opponentProbabilityMap = buildProbabilityMap(aiPlayer, opponentShotsGrid, gridDimensions);
            const relocationSpot = findBestRelocationSpot(gridWithoutShip, mothership, opponentProbabilityMap, gridDimensions);
            if (relocationSpot) {
                return { action: "SKILL", shipType: "Mothership", coords: { ...relocationSpot, shipToMove: mothership } };
            }
        }
        const repairship = aiPlayer.ships.find(s => s.type === 'Repairship');
        if (mothership.isDamaged && repairship && !isShipJammed(repairship, aiPlayer) && (aiPlayer.skillCooldowns?.Repairship ?? 0) === 0 && !mothership.hasBeenRepaired) {
            const repairableDamage = mothership.positions.find(pos => aiPlayer.grid[pos.y][pos.x] === CellState.HIT && (gameState.hitLog?.[aiPlayer.id]?.[`${pos.x},${pos.y}`] ?? 999) < gameState.turn);
            if (repairableDamage) {
                return { action: "SKILL", shipType: "Repairship", coords: { x: repairableDamage.x, y: repairableDamage.y } };
            }
        }
    }
    const opponentMothership = opponent.ships.find(s => s.type === 'Mothership');
    if (opponentMothership && opponentMothership.isDamaged) {
        const hitsOnMothership = opponentMothership.positions.filter(pos => (shotsGrid[pos.y]?.[pos.x] ?? CellState.EMPTY) === CellState.HIT);
        if (hitsOnMothership.length === opponentMothership.length - 1) {
            const winningShot = opponentMothership.positions.find(pos => (shotsGrid[pos.y]?.[pos.x] ?? CellState.EMPTY) === CellState.EMPTY);
            if (winningShot) return { action: "ATTACK", coords: winningShot };
        }
    }

    // PRIORITY 1.5: ONE-TIME SETUP & CRITICAL DEFENSE
    const camoship = aiPlayer.ships.find(s => s.type === 'Camoship' && !s.isSunk && !s.isDamaged);
    if (canAffordSkill && camoship && !aiPlayer.camoArea && (aiPlayer.skillCooldowns?.Camoship ?? 0) === 0 && !isShipJammed(camoship, aiPlayer)) {
        const camoSpot = findBestCamoSpot(aiPlayer, gridDimensions);
        if (camoSpot) {
            return { action: "SKILL", shipType: "Camoship", coords: { x: camoSpot.x, y: camoSpot.y } };
        }
    }
    
    const shieldship = aiPlayer.ships.find(s => s.type === 'Shieldship');
    if (canAffordSkill && shieldship && !isShipJammed(shieldship, aiPlayer) && (aiPlayer.skillCooldowns?.Shieldship ?? 0) === 0 && Math.random() > 0.10) {
        const shieldTarget = findBestShieldTarget(aiPlayer, opponent, gridDimensions);
        if (shieldTarget) {
            return { action: "SKILL", shipType: "Shieldship", coords: { x: shieldTarget.x, y: shieldTarget.y } };
        }
    }


    // PRIORITY 2: OFFENSIVE EXECUTION & STRATEGIC POSTURING
    const bestTargets = findBestTargets(probabilityMap, shotsGrid);
    const bestTarget = bestTargets[Math.floor(Math.random() * bestTargets.length)];

    if (bestTarget && probabilityMap[bestTarget.y][bestTarget.x] > 10) {
        return { action: "ATTACK", coords: bestTarget };
    }

    const jamship = aiPlayer.ships.find(s => s.type === 'Jamship');
    const opponentRepairShip = opponent.ships.find(s => s.type === 'Repairship');
    const hasDamagedOpponent = opponent.ships.some(s => s.isDamaged);
    if (canAffordSkill && jamship && !isShipJammed(jamship, aiPlayer) && (aiPlayer.skillCooldowns?.Jamship ?? 0) === 0 && hasDamagedOpponent && opponentRepairShip && !opponentRepairShip.isSunk && (opponent.skillCooldowns?.Repairship ?? 0) === 0 && Math.random() > 0.15) {
        const hitCells = [];
        for (let y = 0; y < gridDimensions.rows; y++) for (let x = 0; x < gridDimensions.cols; x++) if ((shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.HIT) hitCells.push({x,y});
        if (hitCells.length > 0) {
            const center = hitCells.reduce((acc, c) => ({x: acc.x + c.x, y: acc.y + c.y}), {x:0, y:0});
            center.x = Math.max(0, Math.min(gridDimensions.cols - 1, Math.round(center.x / hitCells.length)));
            center.y = Math.max(0, Math.min(gridDimensions.rows - 1, Math.round(center.y / hitCells.length)));

            const jamTargets = [{x: center.x, y: center.y}];
            const candidates = [
                {x: center.x - 1, y: center.y}, {x: center.x + 1, y: center.y},
                {x: center.x, y: center.y - 1}, {x: center.x, y: center.y + 1},
                {x: center.x - 1, y: center.y - 1}, {x: center.x + 1, y: center.y - 1},
                {x: center.x - 1, y: center.y + 1}, {x: center.x + 1, y: center.y + 1},
            ];

            for(const cand of candidates) {
                if(jamTargets.length < 4 && cand.x >=0 && cand.x < gridDimensions.cols && cand.y >= 0 && cand.y < gridDimensions.rows && !jamTargets.some(t => t.x === cand.x && t.y === cand.y)) {
                    jamTargets.push(cand);
                }
            }
            return { action: "SKILL", shipType: "Jamship", coords: { jamTargets } };
        }
    }

    const commandship = aiPlayer.ships.find(s => s.type === 'Commandship');
    if (canAffordSkill && commandship && !isShipJammed(commandship, aiPlayer) && (aiPlayer.skillCooldowns?.Commandship ?? 0) === 0 && Math.random() > 0.20) {
        const shipToSave = findShipToRelocate(aiPlayer, opponent, gridDimensions);
        if (shipToSave && !isShipJammed(shipToSave, aiPlayer)) {
            const gridWithoutShip = aiPlayer.grid.map(row => [...row]);
            shipToSave.positions.forEach(pos => { gridWithoutShip[pos.y][pos.x] = CellState.EMPTY; });
            const opponentShotsGrid = opponent.shots[aiPlayer.id] || createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
            const opponentProbabilityMap = buildProbabilityMap(aiPlayer, opponentShotsGrid, gridDimensions);

            const relocationSpot = findBestRelocationSpot(gridWithoutShip, shipToSave, opponentProbabilityMap, gridDimensions);
            if (relocationSpot) {
                return { action: "SKILL", shipType: "Commandship", coords: { ...relocationSpot, shipToMove: shipToSave } };
            }
        }
    }

    const repairshipForProactive = aiPlayer.ships.find(s => s.type === 'Repairship');
    if (canAffordSkill && repairshipForProactive && !isShipJammed(repairshipForProactive, aiPlayer) && (aiPlayer.skillCooldowns?.Repairship ?? 0) === 0) {
         const damagedShips = aiPlayer.ships.filter(s => s.isDamaged && !s.isSunk && !s.hasBeenRepaired && s.type !== 'Mothership');
         if (damagedShips.length > 0) {
            const shipToRepair = damagedShips.sort((a, b) => b.length - a.length)[0];
            const repairableDamage = shipToRepair.positions.find(pos => aiPlayer.grid[pos.y][pos.x] === CellState.HIT && (gameState.hitLog?.[aiPlayer.id]?.[`${pos.x},${pos.y}`] ?? 999) < gameState.turn);
            if (repairableDamage) return { action: "SKILL", shipType: "Repairship", coords: { x: repairableDamage.x, y: repairableDamage.y } };
         }
    }

    // PRIORITY 3: INTELLIGENCE GATHERING & HUNTING
    const scoutship = aiPlayer.ships.find(s => s.type === 'Scoutship');
    if (canAffordSkill && scoutship && !isShipJammed(scoutship, aiPlayer) && (aiPlayer.skillCooldowns?.Scoutship ?? 0) === 0 && Math.random() > 0.15) {
        const targets = findBestTargetLockTargets(probabilityMap, shotsGrid, gridDimensions);
        if (targets.length > 0) {
            return { action: "SKILL", shipType: "Scoutship", coords: { targets } };
        }
    }

    const radarship = aiPlayer.ships.find(s => s.type === 'Radarship');
    if (canAffordSkill && radarship && !isShipJammed(radarship, aiPlayer) && (aiPlayer.skillCooldowns?.Radarship ?? 0) === 0 && Math.random() > 0.15) {
        const radarTargets = findBestRadarTargets(probabilityMap, shotsGrid, gridDimensions);
        if (radarTargets.length > 0) {
            return { action: "SKILL", shipType: "Radarship", coords: { radarTargets } };
        }
    }
    
    const decoyship = aiPlayer.ships.find(s => s.type === 'Decoyship');
    if (canAffordSkill && decoyship && !isShipJammed(decoyship, aiPlayer) && (aiPlayer.skillUses?.Decoyship ?? 0) > 0 && Math.random() > 0.15) {
        const decoySpot = findBestDecoySpot(probabilityMap, shotsGrid, gridDimensions);
        if (decoySpot) return { action: "SKILL", shipType: "Decoyship", coords: { x: decoySpot.x, y: decoySpot.y } };
    }

    // PRIORITY 4: DEFAULT ATTACK
    if (bestTarget) {
        return { action: "ATTACK", coords: bestTarget };
    }

    // Absolute fallback if no valid moves are found (should be rare)
    const emptyCells = [];
    for(let y=0; y<gridDimensions.rows; y++) for(let x=0; x<gridDimensions.cols; x++) if((shotsGrid[y]?.[x] ?? CellState.EMPTY) === CellState.EMPTY) emptyCells.push({x,y});
    const randomTarget = emptyCells[Math.floor(Math.random() * emptyCells.length)] || {x:0, y:0};
    return { action: "ATTACK", coords: randomTarget };
};

/**
 * Executes the AI's entire turn. This is the "Localized Brain".
 * @param gameState The current state of the game.
 * @param onActionTaken A callback to update the UI after each discrete AI action.
 * @returns The final state of the game after the AI's turn is complete.
 */
export const executeAITurn = async (gameState: GameState, onActionTaken: (newState: GameState) => void): Promise<GameState> => {
    let currentGameState = JSON.parse(JSON.stringify(gameState));
    const modeLogic = getModeLogic(currentGameState.gameMode);
    
    while (true) {
        const aiPlayer = currentGameState.players.find((p: Player) => p.isAI && p.id === currentGameState.currentPlayerId)!;
        
        if (aiPlayer.actionPoints <= 0) {
            break; // No more AP, turn is over.
        }

        const opponent = currentGameState.players.find((p: Player) => p.id !== aiPlayer.id)!;
        const move = getAIStrategicDecision(aiPlayer, opponent, currentGameState);

        const cost = move.action === 'ATTACK' ? 1 : 2;
        if (aiPlayer.actionPoints < cost) {
            break; // Can't afford this move.
        }

        let nextGameState;
        if (move.action === 'ATTACK') {
            nextGameState = modeLogic.processShot(currentGameState, opponent.id, move.coords.x, move.coords.y);
        } else if (move.action === 'SKILL') {
            const result = modeLogic.applySkill(currentGameState, aiPlayer.id, move.shipType, move.coords);
            if ('error' in result) {
                console.error("AI tried an invalid skill move:", result.error, "Move:", move);
                break; // AI made a mistake, end its turn to prevent loops.
            }
            nextGameState = result;
        } else {
            break; // Unknown action.
        }
        
        currentGameState = nextGameState;
        onActionTaken(currentGameState); // Update UI after the action
        
        if (currentGameState.phase === 'GAME_OVER') {
            break;
        }

        // Add a delay between actions to make it watchable
        await new Promise(resolve => setTimeout(resolve, 1200));
    }

    return currentGameState;
};

/**
 * Gets a move for the AI in Classic mode using local logic.
 * It follows a Hunt/Target strategy.
 */
export const getAIMove = (shotsGrid: Grid, gridDimensions: { rows: number, cols: number }): { x: number, y: number } => {
    const hitCells: { x: number, y: number }[] = [];
    const emptyCells: { x: number, y: number }[] = [];
    const huntCells: { x: number, y: number }[] = [];

    for (let y = 0; y < gridDimensions.rows; y++) {
        for (let x = 0; x < gridDimensions.cols; x++) {
            const cellState = shotsGrid?.[y]?.[x] || CellState.EMPTY;
            if (cellState === CellState.HIT) {
                hitCells.push({ x, y });
            } else if (cellState === CellState.EMPTY) {
                emptyCells.push({ x, y });
                if ((x + y) % 2 === 0) { // Checkerboard pattern for efficient hunting
                    huntCells.push({ x, y });
                }
            }
        }
    }

    // TARGET MODE: If there are hits, attack adjacent cells to sink the ship.
    if (hitCells.length > 0) {
        const potentialTargets: { x: number, y: number }[] = [];
        for (const hit of hitCells) {
            const adjacent = [
                {x: hit.x, y: hit.y - 1}, {x: hit.x, y: hit.y + 1},
                {x: hit.x - 1, y: hit.y}, {x: hit.x + 1, y: hit.y}
            ];
            for (const cell of adjacent) {
                if (cell.x >= 0 && cell.x < gridDimensions.cols && cell.y >= 0 && cell.y < gridDimensions.rows && (shotsGrid?.[cell.y]?.[cell.x] || CellState.EMPTY) === CellState.EMPTY) {
                    if (!potentialTargets.some(t => t.x === cell.x && t.y === cell.y)) {
                        potentialTargets.push(cell);
                    }
                }
            }
        }
        if (potentialTargets.length > 0) return potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
    }

    // HUNT MODE: Use checkerboard pattern if no active targets.
    if (huntCells.length > 0) return huntCells[Math.floor(Math.random() * huntCells.length)];
    
    // FALLBACK: If checkerboard is full, pick any remaining empty cell.
    if (emptyCells.length > 0) return emptyCells[Math.floor(Math.random() * emptyCells.length)];

    return { x: 0, y: 0 };
};
