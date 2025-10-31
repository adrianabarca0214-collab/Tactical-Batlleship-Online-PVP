
import { CellState, Grid, Player, Ship, ShipType, GamePhase } from '../types';

const getColumnLetter = (col: number) => String.fromCharCode(65 + col);

export const createEmptyGrid = (rows: number, cols: number): Grid => {
  return Array(rows).fill(null).map(() => Array(cols).fill(CellState.EMPTY));
};

export const generateAsteroids = (grid: Grid, maxAsteroids: number): Grid => {
    const newGrid = grid.map(row => [...row]);
    const { rows, cols } = { rows: grid.length, cols: grid[0].length };
    let count = 0;
    let attempts = 0;

    while (count < maxAsteroids && attempts < 100) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);

        if (newGrid[y][x] === CellState.EMPTY) {
            newGrid[y][x] = CellState.ASTEROID;
            count++;
        }
        attempts++;
    }
    return newGrid;
};

export const canPlaceShip = (grid: Grid, ship: { length: number }, x: number, y: number, isHorizontal: boolean, gridDimensions: { rows: number, cols: number }): boolean => {
  const shipPositions = [];
  for (let i = 0; i < ship.length; i++) {
    const currentX = x + (isHorizontal ? i : 0);
    const currentY = y + (isHorizontal ? 0 : i);
    shipPositions.push({ x: currentX, y: currentY });
  }

  for (const pos of shipPositions) {
    if (pos.x < 0 || pos.x >= gridDimensions.cols || pos.y < 0 || pos.y >= gridDimensions.rows || grid[pos.y][pos.x] !== CellState.EMPTY) {
      return false;
    }
  }

  return true;
};


export const placeShip = (grid: Grid, ship: Ship, x: number, y: number, isHorizontal: boolean): { newGrid: Grid; newShip: Ship } => {
  const newGrid = grid.map(row => [...row]);
  const newPositions = [];
  for (let i = 0; i < ship.length; i++) {
    const currentX = x + (isHorizontal ? i : 0);
    const currentY = y + (isHorizontal ? 0 : i);
    newGrid[currentY][currentX] = CellState.SHIP;
    newPositions.push({ x: currentX, y: currentY });
  }
  return { newGrid, newShip: { ...ship, positions: newPositions } };
};

const placeShipsStrategically = (ships: Ship[], grid: Grid, gridDimensions: { rows: number, cols: number }): { grid: Grid, ships: Ship[] } => {
    let newGrid = grid.map(row => [...row]);
    const newShips: Ship[] = [];
    const sortedShips = [...ships].sort((a, b) => {
        if (a.type === 'Mothership') return -1;
        if (b.type === 'Mothership') return 1;
        return b.length - a.length;
    });

    for (const shipConfig of sortedShips) {
        let bestPlacement = null;
        let maxScore = -Infinity;

        const placementCandidates = [];

        // Iterate through all possible positions and orientations
        for (let y = 0; y < gridDimensions.rows; y++) {
            for (let x = 0; x < gridDimensions.cols; x++) {
                for (const isHorizontal of [true, false]) {
                    if (canPlaceShip(newGrid, shipConfig, x, y, isHorizontal, gridDimensions)) {
                        let score = 0;
                        let touchesAsteroid = false;
                        
                        // Scoring logic
                        for (let i = 0; i < shipConfig.length; i++) {
                            const currentX = x + (isHorizontal ? i : 0);
                            const currentY = y + (isHorizontal ? 0 : i);

                            // Avoid edges, less penalty for smaller ships
                            if (currentX === 0 || currentX === gridDimensions.cols - 1 || currentY === 0 || currentY === gridDimensions.rows - 1) {
                                score -= (5 - shipConfig.length);
                            }
                            
                            // Check for adjacent asteroids (cover)
                            const neighbors = [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}];
                            for(const n of neighbors) {
                                const nx = currentX + n.dx;
                                const ny = currentY + n.dy;
                                if(nx >= 0 && nx < gridDimensions.cols && ny >= 0 && ny < gridDimensions.rows) {
                                    if(grid[ny][nx] === CellState.ASTEROID) {
                                        touchesAsteroid = true;
                                    }
                                }
                            }
                        }

                        if (touchesAsteroid) {
                            score += 15; // High bonus for using cover
                        }
                        
                        // Add some randomness to make it less predictable
                        score += Math.random();

                        if (score > maxScore) {
                            maxScore = score;
                            placementCandidates.length = 0; // Clear candidates
                            placementCandidates.push({ x, y, isHorizontal });
                        } else if (score === maxScore) {
                            placementCandidates.push({ x, y, isHorizontal });
                        }
                    }
                }
            }
        }

        if (placementCandidates.length > 0) {
            bestPlacement = placementCandidates[Math.floor(Math.random() * placementCandidates.length)];
            const shipToPlace: Ship = { ...shipConfig, positions: [], isSunk: false, isDamaged: false, hasBeenRepaired: false, hasBeenRelocated: false };
            const result = placeShip(newGrid, shipToPlace, bestPlacement.x, bestPlacement.y, bestPlacement.isHorizontal);
            newGrid = result.newGrid;
            newShips.push(result.newShip);
        } else {
             // Fallback to purely random if no strategic placement found (highly unlikely on a valid board)
            let placed = false;
            let attempts = 0;
            while(!placed && attempts < 100) {
                const isHorizontal = Math.random() < 0.5;
                const randX = Math.floor(Math.random() * gridDimensions.cols);
                const randY = Math.floor(Math.random() * gridDimensions.rows);
                if(canPlaceShip(newGrid, shipConfig, randX, randY, isHorizontal, gridDimensions)) {
                     const shipToPlace: Ship = { ...shipConfig, positions: [], isSunk: false, isDamaged: false, hasBeenRepaired: false, hasBeenRelocated: false };
                     const result = placeShip(newGrid, shipToPlace, randX, randY, isHorizontal);
                     newGrid = result.newGrid;
                     newShips.push(result.newShip);
                     placed = true;
                }
                attempts++;
            }
            if(!placed) console.error(`Failed to place ship: ${shipConfig.name}.`);
        }
    }
    const shipOrder = ships.map(s => s.name);
    newShips.sort((a, b) => shipOrder.indexOf(a.name) - shipOrder.indexOf(b.name));
    return { grid: newGrid, ships: newShips };
};

export const placeShipsForAI = (player: Player, ships: Ship[], grid: Grid, gridDimensions: { rows: number, cols: number }): Player => {
    const placed = placeShipsStrategically(ships, grid, gridDimensions);
    return { ...player, grid: placed.grid, ships: placed.ships, isReady: true };
};

export const findRandomValidPlacement = (player: Player, ship: Ship, gridDimensions: { rows: number, cols: number }): { x: number, y: number, isHorizontal: boolean } | null => {
    if (!player.grid || !player.grid.length || !player.grid[0].length) {
        console.error("findRandomValidPlacement called with invalid grid.");
        return null; // Add guard clause for safety
    }
    const gridWithoutShip = player.grid.map(row => [...row]);
    ship.positions.forEach(pos => {
        if (gridWithoutShip[pos.y] && gridWithoutShip[pos.y][pos.x] !== undefined) {
          gridWithoutShip[pos.y][pos.x] = CellState.EMPTY;
        }
    });

    let attempts = 0;
    while (attempts < 100) {
        const isHorizontal = Math.random() < 0.5;
        const x = Math.floor(Math.random() * gridDimensions.cols);
        const y = Math.floor(Math.random() * gridDimensions.rows);

        if (canPlaceShip(gridWithoutShip, ship, x, y, isHorizontal, gridDimensions)) {
            return { x, y, isHorizontal };
        }
        attempts++;
    }
    return null; // Failed to find a placement
};
