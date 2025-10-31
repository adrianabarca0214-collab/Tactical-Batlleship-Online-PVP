

import { Ship } from './types';

// FIX: Corrected the Omit type to include 'hasBeenRelocated' and removed the property from the objects to match the GameState type definition.
export const SHIPS_CONFIG_DEFAULT: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'type' | 'hasBeenRepaired' | 'hasBeenRelocated' | 'pointCost'>[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
];

export const TACTICAL_SHIP_POOL: Omit<Ship, 'positions' | 'isSunk' | 'isDamaged' | 'hasBeenRepaired' | 'hasBeenRelocated'>[] = [
    { name: 'Mothership', type: 'Mothership', length: 2, pointCost: 0 },
    { name: 'Camoship', type: 'Camoship', length: 4, pointCost: 7 },
    { name: 'Commandship', type: 'Commandship', length: 5, pointCost: 7 },
    { name: 'Scoutship', type: 'Scoutship', length: 3, pointCost: 6 },
    { name: 'Radarship', type: 'Radarship', length: 3, pointCost: 4 },
    { name: 'Shieldship', type: 'Shieldship', length: 3, pointCost: 5 },
    { name: 'Repairship', type: 'Repairship', length: 3, pointCost: 4 },
    { name: 'Jamship', type: 'Jamship', length: 3, pointCost: 4 },
    { name: 'Decoyship', type: 'Decoyship', length: 4, pointCost: 3 },
    { name: 'Supportship', type: 'Supportship', length: 3, pointCost: 3 },
];


export const getGameConfig = (mode: 'CLASSIC' | 'TACTICAL') => {
    if (mode === 'TACTICAL') {
        return {
            gridDimensions: { rows: 12, cols: 12 },
            shipsConfig: TACTICAL_SHIP_POOL,
            fleetBudget: 30,
        };
    }

    return {
        gridDimensions: { rows: 12, cols: 12 },
        shipsConfig: SHIPS_CONFIG_DEFAULT.map(s => ({...s, type: s.name as any, pointCost: 0 })),
        fleetBudget: 0,
    };
};