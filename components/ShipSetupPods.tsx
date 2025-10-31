
import React from 'react';
import { Ship, ShipType, GameMode } from '../types';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import JamshipIcon from './icons/JamshipIcon';
import ShipIcon from './icons/ShipIcon';
import CamoshipIcon from './icons/CamoshipIcon';
import ScoutshipIcon from './icons/ScoutshipIcon';
import SupportshipIcon from './icons/SupportshipIcon';
import ShieldshipIcon from './icons/ShieldshipIcon';

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
        default: return <ShipIcon className={className} />; // Fallback for Classic
    }
}

interface ShipSetupPodsProps {
  ships: Ship[];
  selectedShipName: string | null;
  onSelectShip: (shipName: string) => void;
  gameMode: GameMode;
}

const ShipSetupPods: React.FC<ShipSetupPodsProps> = ({ ships, selectedShipName, onSelectShip, gameMode }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
      {ships.map(ship => {
        const isPlaced = ship.positions.length > 0;
        const isSelected = ship.name === selectedShipName;
        
        const tacticalShipTypes: ShipType[] = ['Mothership', 'Radarship', 'Repairship', 'Commandship', 'Decoyship', 'Jamship', 'Camoship', 'Scoutship', 'Supportship', 'Shieldship'];
        const shortName = (gameMode === 'TACTICAL' && tacticalShipTypes.includes(ship.type as ShipType))
            ? ship.type.replace('ship', '')
            : ship.name;

        let buttonClasses = `p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all transform hover:-translate-y-0.5 relative border`;
        if (isSelected) {
            buttonClasses += ' bg-cyan-700/80 border-cyan-400 ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-800';
        } else {
            buttonClasses += ' bg-slate-700 border-slate-600 hover:bg-slate-600';
        }

        if (!isPlaced && !isSelected) {
            buttonClasses += ' opacity-70';
        }
        
        return (
          <button key={ship.name} onClick={() => onSelectShip(ship.name)} className={buttonClasses}>
            <ShipTypeIcon shipType={ship.type} className={`w-8 h-8 ${isPlaced || isSelected ? 'text-slate-100' : 'text-slate-400'}`} />
            <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{shortName}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isPlaced ? 'bg-green-500/20 text-green-300' : 'bg-slate-800 text-slate-400'}`}>
                {isPlaced ? 'Placed' : `${ship.length} sq.`}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ShipSetupPods;