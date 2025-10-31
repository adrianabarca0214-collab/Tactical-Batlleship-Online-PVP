
import React from 'react';
import { Ship, Grid as GridType, CellState, GameMode, Player, ShipType } from '../types';
import ShipIcon from './icons/ShipIcon';
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
import XIcon from './icons/XIcon';

interface ShipStatusProps {
  ships: Ship[];
  grid?: GridType;
  isOpponent?: boolean;
  gameMode?: GameMode;
  player?: Player;
  onPodClick?: (ship: Ship) => void;
  activeAction?: any;
}

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

const ShipStatus: React.FC<ShipStatusProps> = ({ ships, grid, isOpponent = false, gameMode, player, onPodClick, activeAction }) => {

  const getShipHealth = (ship: Ship) => {
    if (ship.isSunk) {
      return { status: 'Sunk', hits: ship.length };
    }
    
    if (isOpponent && gameMode === 'TACTICAL') {
        return { status: 'Unknown', hits: '?' };
    }

    if (!grid) {
      return { status: 'Operational', hits: 0 };
    }

    const hits = ship.positions.reduce((acc, pos) => {
      if (grid && grid[pos.y] && grid[pos.y][pos.x] !== undefined) {
          const cell = grid[pos.y][pos.x];
          if (cell === CellState.HIT || cell === CellState.SUNK) {
              return acc + 1;
          }
      }
      return acc;
    }, 0);

    let status = 'Operational';
    if (hits > 0) {
      status = 'Damaged';
    }

    return { status, hits };
  };
  
  const sortedShips = [...ships].sort((a,b) => (a.isSunk ? 1 : -1) - (b.isSunk ? 1 : -1) || a.length - b.length);

  // Classic Mode Opponent View: Simple list, only shows sunk status.
  if (isOpponent && gameMode === 'CLASSIC') {
    return (
      <div className="mt-3 p-2 rounded-lg">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {sortedShips.map(ship => (
            <div
              key={ship.name}
              title={`${ship.name} (${ship.length} squares)`}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                ship.isSunk
                  ? 'bg-red-900/50 text-slate-500 line-through'
                  : 'bg-slate-700/50 text-slate-300'
              }`}
            >
              <span className="font-semibold text-sm">{ship.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }


  const renderSkillStatus = (ship: Ship) => {
    if (isOpponent || gameMode !== 'TACTICAL' || ship.isSunk || !player) return null;

    let statusElement = null;

    if (ship.type === 'Mothership') {
        if (player.escapeSkillUnlocked && (player.skillUses?.Mothership ?? 0) > 0) {
            statusElement = <div className="w-full h-full bg-green-500 rounded-full skill-ready-pulse flex items-center justify-center"><MothershipIcon className="w-3 h-3 text-white" /></div>;
        } else if (player.escapeSkillUnlocked) {
            statusElement = <div className="w-full h-full bg-slate-600 rounded-full flex items-center justify-center"><XIcon className="w-3 h-3 text-slate-400" /></div>;
        }
    } else {
        const cooldown = player.skillCooldowns[ship.type];
        const uses = player.skillUses[ship.type];

        if (cooldown !== undefined) {
            if (cooldown > 0) {
                statusElement = <div className="w-full h-full bg-orange-600/90 rounded-full flex items-center justify-center text-white text-xs font-bold font-mono">{cooldown}</div>;
            } else {
                statusElement = <div className="w-full h-full bg-green-500 rounded-full skill-ready-pulse"></div>;
            }
        } else if (uses !== undefined) {
             if (uses > 0) {
                statusElement = <div className="w-full h-full bg-cyan-600/90 rounded-full flex items-center justify-center text-white text-xs font-bold font-mono">{uses}</div>;
            } else {
                statusElement = <div className="w-full h-full bg-slate-600 rounded-full flex items-center justify-center"><XIcon className="w-3 h-3 text-slate-400" /></div>;
            }
        }
    }
    
    if (!statusElement) return null;

    return (
        <div className="skill-status-indicator absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 p-0.5 shadow-md">
            {statusElement}
        </div>
    );
  };

  return (
    <div className="mt-3 p-2 rounded-lg">
      <div className="ship-status-pods flex flex-wrap justify-center gap-3">
        {sortedShips.map(ship => {
          const health = getShipHealth(ship);
          const isSunk = health.status === 'Sunk';
          
          const isSkillTargetable = !isOpponent && onPodClick && activeAction?.type === 'SKILL' && activeAction.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP' && !ship.isSunk && !ship.isDamaged && !ship.hasBeenRelocated;
          const isRelocateIneligible = !isOpponent && activeAction?.type === 'SKILL' && activeAction.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP' && !ship.isSunk && (ship.isDamaged || ship.hasBeenRelocated);
          const isJammed = !isOpponent && player?.jamTurnsRemaining && player.jamTurnsRemaining > 0 && ship.positions.some(shipPos => player.jammedPositions?.some(jamPos => jamPos.x === shipPos.x && jamPos.y === shipPos.y));
          
          const PodWrapper = isSkillTargetable ? 'button' : 'div';

          let ringColor = 'ring-slate-600';
          let iconColor = 'text-slate-400';
          
          if (isSunk) {
            ringColor = 'ring-red-800';
            iconColor = 'text-slate-600';
          } else if (health.status === 'Damaged') {
            ringColor = 'ring-orange-500';
            iconColor = 'text-slate-200';
          } else if (health.status === 'Operational') {
            ringColor = 'ring-green-500';
            iconColor = 'text-slate-200';
          }

          if (isOpponent && gameMode === 'TACTICAL' && !isSunk) {
            ringColor = 'ring-slate-600'; // Unknown status
          }

          let tooltip = isOpponent && gameMode === 'TACTICAL' && !isSunk
            ? `${ship.name} (${ship.length} sq) | Status: Unknown`
            : `${ship.name} (${ship.length} sq) | ${health.status} | Health: ${health.hits}/${ship.length}`;
            
          if (ship.hasBeenRelocated) {
              tooltip += ' | (Relocated)';
          }
          if (isJammed) {
              tooltip += ' | (JAMMED)';
          }

          const tacticalShipTypes: ShipType[] = ['Mothership', 'Radarship', 'Repairship', 'Commandship', 'Decoyship', 'Jamship', 'Camoship', 'Scoutship', 'Supportship', 'Shieldship'];
          const shortName = tacticalShipTypes.includes(ship.type as ShipType)
            ? ship.type.replace('ship', '')
            : ship.name;

          return (
            <div key={ship.name} className="flex flex-col items-center gap-1.5 text-center">
              {/* Name Label */}
              <div className="pod-ship-name h-3 flex items-center justify-center">
                {!isOpponent && gameMode === 'TACTICAL' && (
                    <span className={`text-[11px] font-bold leading-none transition-colors ${isSunk ? 'text-slate-600' : 'text-slate-300'}`}>
                        {shortName}
                    </span>
                )}
              </div>
              {/* Status Pod */}
              <PodWrapper 
                  title={tooltip}
                  onClick={isSkillTargetable ? () => onPodClick!(ship) : undefined}
                  className={`pod-wrapper relative w-14 h-14 rounded-lg transition-all flex items-center justify-center bg-slate-900/50 ${isSunk ? 'opacity-60' : ''} ${isSkillTargetable ? 'ship-active-glow cursor-pointer' : ''} ${isJammed ? 'jam-electric-ui' : ''}`}
              >
                <div className={`absolute inset-0 ring-2 ${ringColor} rounded-lg`}></div>
                
                <div className="relative w-full h-full flex flex-col items-center justify-center p-1 text-center">
                  <ShipTypeIcon shipType={ship.type} className={`pod-icon w-8 h-8 transition-colors ${iconColor}`} />
                </div>
                
                {renderSkillStatus(ship)}
                 {isRelocateIneligible && (
                    <div className="absolute inset-0 bg-slate-900/80 rounded-lg flex items-center justify-center z-10">
                    <span className="text-red-400 text-[10px] font-bold">
                        {ship.isDamaged ? 'DMG' : 'MOVED'}
                    </span>
                    </div>
                )}
              </PodWrapper>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShipStatus;
