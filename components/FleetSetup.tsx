
import React, { useState, useMemo, useEffect } from 'react';
import { GameState, Player, Ship, ShipType, GameMode } from '../types';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import JamshipIcon from './icons/JamshipIcon';
import CamoshipIcon from './icons/CamoshipIcon';
import ScoutshipIcon from './icons/ScoutshipIcon';
import SupportshipIcon from './icons/SupportshipIcon';
import ShieldshipIcon from './icons/ShieldshipIcon';
import ShipIcon from './icons/ShipIcon';
import { getAIFleetSelection } from '../services/geminiService';

const ShipTypeIcon: React.FC<{ shipType: ShipType | string, className?: string }> = ({ shipType, className }) => {
    switch(shipType) {
        case 'Mothership': return <MothershipIcon className={className} />;
        case 'Radarship': return <RadarshipIcon className={className} />;
        case 'Repairship': return <RepairshipIcon className={className} />;
        case 'Commandship': return <CommandshipIcon className={className} />;
        case 'Decoyship': return <DecoyshipIcon className={className} />;
        case 'Jamship': return <JamshipIcon className={className} />;
        case 'Camoship': return <CamoshipIcon className={className} />;
        case 'Scoutship': return <ScoutshipIcon className={className} />;
        case 'Supportship': return <SupportshipIcon className={className} />;
        case 'Shieldship': return <ShieldshipIcon className={className} />;
        default: return <ShipIcon className={className} />;
    }
}

interface FleetSetupProps {
  game: GameState;
  playerToSetup: Player;
  onFleetReady: (player: Player) => void;
}

const FleetSetup: React.FC<FleetSetupProps> = ({ game, playerToSetup, onFleetReady }) => {
  const mothershipConfig = game.shipsConfig.find(s => s.type === 'Mothership')!;
  
  // Memoize the initial state to ensure it's stable for useEffect dependency
  const initialFleet = useMemo(() => {
    const mothershipInstance: Ship = { ...mothershipConfig, positions: [], isSunk: false, isDamaged: false, hasBeenRepaired: false, hasBeenRelocated: false };
    return [mothershipInstance];
  }, [mothershipConfig]);

  const [selectedShips, setSelectedShips] = useState<Ship[]>(initialFleet);
  
  // This effect resets the component's state when the player being set up changes.
  // This is crucial for hot-seat multiplayer, ensuring Player 2 doesn't see Player 1's selections.
  useEffect(() => {
    setSelectedShips(initialFleet);
  }, [playerToSetup.id, initialFleet]);


  const totalCost = useMemo(() => selectedShips.reduce((sum, ship) => sum + ship.pointCost, 0), [selectedShips]);
  const budgetRemaining = game.fleetBudget - totalCost;
  
  const selectableShips = game.shipsConfig.filter(s => s.type !== 'Mothership');

  const handleToggleShip = (shipConfig: Omit<Ship, 'positions' | 'isSunk'|'isDamaged'|'hasBeenRepaired'|'hasBeenRelocated'>) => {
    const existingShipIndex = selectedShips.findIndex(s => s.name === shipConfig.name);

    if (existingShipIndex > -1) {
      // Remove ship
      setSelectedShips(currentShips => currentShips.filter(s => s.name !== shipConfig.name));
    } else {
      // Add ship if budget allows
      if (budgetRemaining >= shipConfig.pointCost) {
        const newShip: Ship = { ...shipConfig, positions: [], isSunk: false, isDamaged: false, hasBeenRepaired: false, hasBeenRelocated: false };
        setSelectedShips(currentShips => [...currentShips, newShip]);
      }
    }
  };

  const handleSuggestFleet = () => {
    const autoSelectedFleet = getAIFleetSelection(game.shipsConfig, game.fleetBudget);
    setSelectedShips(autoSelectedFleet);
  };

  const handleConfirmFleet = () => {
    const playerWithFleet = { ...playerToSetup, ships: selectedShips };
    onFleetReady(playerWithFleet);
  };

  const isFleetValid = totalCost > 0 && totalCost <= game.fleetBudget && selectedShips.some(s => s.type === 'Mothership');

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 sm:pt-12 command-background p-2 sm:p-4 fade-in relative">
        <div className="command-background-dots"></div>
        <div className="text-center mb-6">
            <h1 className="text-5xl md:text-6xl font-bold command-title tracking-widest">FLEET SELECTION</h1>
            <p className="text-cyan-300 mt-1 text-xl tracking-[0.2em]">Commander: {playerToSetup.name}</p>
        </div>

        <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 items-center lg:items-start">
            <div className="w-full lg:flex-1 command-panel p-4">
                <div className="bg-slate-900/50 p-2 text-center command-panel-header mb-4">
                    <h2 className="text-2xl font-semibold text-white">Available Hulls</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectableShips.map(ship => {
                        const isSelected = selectedShips.some(s => s.name === ship.name);
                        const canAfford = budgetRemaining >= ship.pointCost || isSelected;
                        return (
                            <button
                                key={ship.name}
                                onClick={() => handleToggleShip(ship)}
                                disabled={!canAfford}
                                className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all transform hover:-translate-y-1 text-center border-2 ${
                                    isSelected ? 'bg-cyan-700/80 border-cyan-400' : 'bg-slate-800/70 border-slate-700 hover:bg-slate-700/70'
                                } ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <ShipTypeIcon shipType={ship.type} className="w-10 h-10 text-slate-100" />
                                <h3 className="font-bold text-white">{ship.name}</h3>
                                <div className="text-xs text-slate-300">{ship.length} sq.</div>
                                <div className={`font-bold text-lg ${isSelected ? 'text-yellow-300' : 'text-cyan-300'}`}>{ship.pointCost} DP</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="w-full max-w-md lg:max-w-xs mx-auto flex flex-col gap-6">
                <div className="command-panel p-6 space-y-4 w-full">
                    <div className="bg-slate-900/50 p-3 text-center command-panel-header mb-2">
                        <h2 className="text-3xl font-semibold text-white">Fleet Manifest</h2>
                    </div>
                    <div className="flex justify-between items-baseline bg-slate-800/50 p-3 rounded-md">
                        <span className="text-slate-300 font-semibold">BUDGET REMAINING:</span>
                        <span className="text-2xl font-bold text-yellow-300">{budgetRemaining}</span>
                    </div>
                    <button
                        onClick={handleSuggestFleet}
                        className="w-full btn-angular btn-indigo text-white font-bold py-3"
                    >
                        Suggest Fleet
                    </button>
                    <div className="min-h-[200px] bg-slate-900/50 p-2 rounded-md space-y-2">
                        {selectedShips.map(ship => (
                             <div key={ship.name} className={`flex items-center justify-between p-2 rounded ${ship.type === 'Mothership' ? 'bg-yellow-800/30' : 'bg-slate-700/50'}`}>
                                <span className={`font-semibold ${ship.type === 'Mothership' ? 'text-yellow-300' : 'text-white'}`}>{ship.name}</span>
                                <span className={`font-mono ${ship.type === 'Mothership' ? 'text-yellow-400' : 'text-cyan-400'}`}>{ship.pointCost} DP</span>
                            </div>
                        ))}
                    </div>
                </div>
                 <button
                    onClick={handleConfirmFleet}
                    disabled={!isFleetValid}
                    className="w-full btn-angular btn-start font-bold py-4 text-2xl"
                >
                    CONFIRM FLEET
                </button>
            </div>
        </div>
    </div>
  );
};

export default FleetSetup;
