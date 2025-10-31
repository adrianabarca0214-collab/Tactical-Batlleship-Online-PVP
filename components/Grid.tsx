
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { CellState, Grid as GridType, Ship, GameLogEntry, GameMode, Player } from '../types';
import ExplosionIcon from './icons/ExplosionIcon';
import WaterIcon from './icons/WaterIcon';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import JamshipIcon from './icons/JamshipIcon';
import RadarContactIcon from './icons/RadarContactIcon';
import DecoyBeaconIcon from './icons/DecoyBeaconIcon';
import CamoshipIcon from './icons/CamoshipIcon';
import ScoutshipIcon from './icons/ScoutshipIcon';
import SupportshipIcon from './icons/SupportshipIcon';
import AsteroidIcon from './icons/AsteroidIcon';
import CamoHitIcon from './icons/CamoHitIcon';
import AsteroidDestroyedIcon from './icons/AsteroidDestroyedIcon';
import TargetIcon from './icons/TargetIcon';
import XIcon from './icons/XIcon';
import ShieldshipIcon from './icons/ShieldshipIcon';
import ShieldIcon from './icons/ShieldIcon';
import ShieldHitIcon from './icons/ShieldHitIcon';
import PermanentDamageIcon from './icons/PermanentDamageIcon';

// This defines what information we need about each part of a ship for rendering
interface ShipPart {
  ship: Ship;
  partIndex: number; // 0 for bow, ship.length - 1 for stern
  isHorizontal: boolean;
}

const JamOverlay: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`${className} jam-overlay-animated`}></div>
);

interface GridProps {
  grid: GridType;
  player?: Player;
  ships?: Ship[]; // Player's own ships for detailed rendering
  onCellClick?: (x: number, y: number, event?: React.MouseEvent<HTMLButtonElement>) => void;
  isOpponentGrid?: boolean;
  isPlayerTurn?: boolean;
  gridDimensions: { rows: number; cols: number };
  animatedShot?: GameLogEntry | null;
  
  // Tactical Mode Props
  radarOverlay?: { x: number; y: number; state: CellState }[];
  shieldedOverlay?: { x: number; y: number }[];
  jammedOverlay?: { x: number; y: number }[];
  camoOverlay?: { x: number, y: number, width: number, height: number };
  targetLockOverlay?: { cells: { x: number, y: number }[], turnsRemaining: number };
  activeAction?: any;
  onShipPartClick?: (ship: Ship) => void;
  isDimmed?: boolean;

  // Props for setup phase or commandship relocate
  isSetup?: boolean;
  onCellMouseEnter?: (x: number, y: number, event: React.MouseEvent<HTMLButtonElement>) => void;
  onCellMouseLeave?: () => void;
  hoverPreview?: { x: number; y: number; length?: number; area?: { width: number, height: number }; isHorizontal?: boolean; isValid: boolean; } | null;
  onShipDragStart?: (ship: Ship, partIndex: number) => void;
  onCellDrop?: (x: number, y: number) => void;
  onCellDragOver?: (e: React.DragEvent, x: number, y: number) => void;
  onShipDragEnd?: () => void;
  selectedShipName?: string | null;

  // New props for cannon animation
  mothershipRef?: React.RefObject<HTMLDivElement>;
  cannonTipRef?: React.RefObject<HTMLDivElement>;
  isPlayerGrid?: boolean;
  hoveredCellEl?: HTMLElement | null;
  gameMode?: GameMode;
}

const ShipTypeIcon: React.FC<{type: string, className?: string, style?: React.CSSProperties}> = ({ type, className, style }) => {
    switch(type) {
        case 'Mothership': return <MothershipIcon className={className} style={style} />;
        case 'Radarship': return <RadarshipIcon className={className} style={style} />;
        case 'Repairship': return <RepairshipIcon className={className} style={style} />;
        case 'Commandship': return <CommandshipIcon className={className} style={style} />;
        case 'Decoyship': return <DecoyshipIcon className={className} style={style} />;
        case 'Jamship': return <JamshipIcon className={className} style={style} />;
        case 'Camoship': return <CamoshipIcon className={className} style={style} />;
        case 'Scoutship': return <ScoutshipIcon className={className} style={style} />;
        case 'Supportship': return <SupportshipIcon className={className} style={style} />;
        case 'Shieldship': return <ShieldshipIcon className={className} style={style} />;
        default: return null;
    }
}

const Grid: React.FC<GridProps> = ({ 
    grid, 
    player,
    ships = [], 
    onCellClick, 
    isOpponentGrid = false, 
    isPlayerTurn = false, 
    isSetup = false,
    onCellMouseEnter,
    onCellMouseLeave,
    hoverPreview,
    gridDimensions,
    onShipDragStart,
    onCellDrop,
    onCellDragOver,
    onShipDragEnd,
    selectedShipName,
    animatedShot,
    radarOverlay = [],
    shieldedOverlay = [],
    jammedOverlay = [],
    camoOverlay,
    targetLockOverlay,
    activeAction,
    onShipPartClick,
    isDimmed,
    mothershipRef,
    cannonTipRef,
    isPlayerGrid,
    hoveredCellEl,
    gameMode,
}) => {
  const cannonBarrelRef = useRef<HTMLDivElement>(null);
  const mothershipBowRef = useRef<HTMLDivElement>(null);
  const [glitchingCell, setGlitchingCell] = useState<{ x: number; y: number } | null>(null);
  const [glitchRotation, setGlitchRotation] = useState(0);
  
  const flagship = useMemo(() => {
    if (!ships || ships.length === 0 || !isPlayerGrid) return null;
    const availableShips = ships.filter(s => !s.isSunk);
    if (availableShips.length === 0) return null;
    if (gameMode === 'TACTICAL') {
        const mothership = availableShips.find(s => s.type === 'Mothership');
        return mothership || null;
    }
    return availableShips.sort((a, b) => b.length - a.length)[0];
  }, [ships, gameMode, isPlayerGrid]);


  useEffect(() => {
    if (!cannonBarrelRef.current || !mothershipBowRef.current || !hoveredCellEl) {
        if(cannonBarrelRef.current) cannonBarrelRef.current.style.transform = 'rotate(0deg)';
        return;
    }
    if (activeAction?.type === 'ATTACK') {
        const cannonRect = mothershipBowRef.current.getBoundingClientRect();
        const targetRect = hoveredCellEl.getBoundingClientRect();
        const cannonX = cannonRect.left + cannonRect.width / 2;
        const cannonY = cannonRect.top + cannonRect.height / 2;
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;
        const angleDeg = Math.atan2(targetY - cannonY, targetX - cannonX) * 180 / Math.PI;
        cannonBarrelRef.current.style.transform = `rotate(${angleDeg + 90}deg)`;
    } else {
      cannonBarrelRef.current.style.transform = 'rotate(0deg)';
    }
  }, [hoveredCellEl, activeAction]);

  useEffect(() => {
    if (!jammedOverlay || jammedOverlay.length === 0) {
        setGlitchingCell(null);
        return;
    }
    const intervalId = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * jammedOverlay.length);
        const cellToGlitch = jammedOverlay[randomIndex];
        setGlitchingCell(cellToGlitch);
        setGlitchRotation(Math.floor(Math.random() * 360));
        setTimeout(() => setGlitchingCell(null), 400);
    }, 1500 + Math.random() * 1000);
    return () => clearInterval(intervalId);
  }, [jammedOverlay]);


  const shipsToRender = useMemo(() => ships, [ships]);

  const shipMap = useMemo(() => {
    const map = new Map<string, ShipPart>();
    if (isOpponentGrid) return map;
    shipsToRender.forEach(ship => {
      if (ship.positions.length > 0) {
        const isHorizontal = ship.positions.length > 1 ? ship.positions[0].y === ship.positions[1].y : true;
        ship.positions.forEach((pos, index) => {
          map.set(`${pos.x},${pos.y}`, { ship, partIndex: index, isHorizontal });
        });
      }
    });
    return map;
  }, [shipsToRender, isOpponentGrid]);

  const getCellContent = (cellState: CellState, shipPart?: ShipPart) => {
    switch (cellState) {
      case CellState.ASTEROID:
        return <AsteroidIcon className="w-6 h-6 text-slate-500" />;
      case CellState.ASTEROID_DESTROYED:
        return <AsteroidDestroyedIcon className="w-6 h-6 text-slate-600" />;
      case CellState.HIT:
        if (shipPart?.ship.hasBeenRepaired) {
            return <PermanentDamageIcon className="w-5 h-5 text-red-600" />;
        }
        return <ExplosionIcon className={`w-4 h-4 ${shipPart ? 'text-orange-300' : 'text-orange-400'}`} />;
      case CellState.SUNK:
        return <ExplosionIcon className="w-5 h-5 text-red-500 animate-pulse" />;
      case CellState.MISS:
        return <WaterIcon className="w-4 h-4 text-cyan-500" />;
      case CellState.CAMO_HIT:
        return <CamoHitIcon className="w-5 h-5 text-purple-400" />;
      case CellState.SHIELD_HIT:
        return <ShieldHitIcon className="w-5 h-5 text-cyan-300" />;
      case CellState.RADAR_CONTACT:
        return <RadarContactIcon className="w-5 h-5 text-cyan-400 radar-contact-pulse fade-in" style={{ animationDelay: '0.5s' }} />;
      case CellState.DECOY:
        return <DecoyBeaconIcon className="w-5 h-5 text-purple-400 animate-pulse" />;
      default:
        return null;
    }
  };
  
  const headers = Array.from({ length: gridDimensions.cols }, (_, i) => String.fromCharCode(65 + i));
  const gridStyle = {
    gridTemplateColumns: `min-content repeat(${gridDimensions.cols}, minmax(0, 1fr))`
  };
  
  const isPlacingMode = activeAction?.type === 'SKILL' && 
      ((activeAction.shipType === 'Mothership' && activeAction.stage === 'PLACE_SHIP') ||
       (activeAction.shipType === 'Decoyship' && activeAction.stage === 'PLACE_DECOY') ||
       (activeAction.shipType === 'Commandship' && activeAction.stage === 'PLACE_SHIP') ||
       (activeAction.shipType === 'Camoship' && activeAction.stage === 'PLACE_CAMO')
      );

  return (
    <div className="relative">
      {camoOverlay && (
        <div className="camo-field" style={{
            left: `${(camoOverlay.x / gridDimensions.cols) * 100}%`,
            top: `${(camoOverlay.y / gridDimensions.rows) * 100}%`,
            width: `${(camoOverlay.width / gridDimensions.cols) * 100}%`,
            height: `${(camoOverlay.height / gridDimensions.rows) * 100}%`,
        }}/>
      )}
      {isDimmed && <div className="absolute inset-0 bg-slate-900/70 z-30 rounded-lg" />}
      <div 
        className="grid gap-1 text-xs"
        style={gridStyle}
        onMouseLeave={(isSetup || isPlacingMode) ? onCellMouseLeave : undefined}
      >
        <div /> {/* Top-left empty cell */}
        {headers.map(header => <div key={header} className="flex items-center justify-center text-slate-400">{header}</div>)}
        
        {grid.map((row, y) => (
          <React.Fragment key={y}>
            <div className="flex items-center justify-center text-slate-400">{y + 1}</div>
            {row.map((cell, x) => {
              const shipPart = shipMap.get(`${x},${y}`);
              const isFlagshipBow = flagship && shipPart?.ship.name === flagship.name && shipPart.partIndex === 0;
              let baseClass = 'w-full h-full flex items-center justify-center border border-slate-700/50 transition-colors relative';
              let hoverPreviewElement = null;
              
              const radarOverlayCell = radarOverlay.find(c => c.x === x && c.y === y);
              const isShielded = shieldedOverlay.some(c => c.x === x && c.y === y);
              const isJammed = jammedOverlay.some(c => c.x === x && c.y === y);
              const isTargetLocked = targetLockOverlay?.cells.some(c => c.x === x && c.y === y);
              const isGlitching = glitchingCell?.x === x && glitchingCell?.y === y;
              const displayCellState = radarOverlayCell ? radarOverlayCell.state : cell;
              
              let isDisabled = !onCellClick || (isSetup && cell === CellState.SHIP);
              const isPendingJamTarget = activeAction?.shipType === 'Jamship' && activeAction.stage === 'SELECT_J_TARGETS' && activeAction.jamTargets?.some(t => t.x === x && t.y === y);
              const isPendingRadarTarget = activeAction?.shipType === 'Radarship' && activeAction.stage === 'SELECT_R_TARGETS' && activeAction.radarTargets?.some(t => t.x === x && t.y === y);
              const isPendingTargetLockTarget = activeAction?.shipType === 'Scoutship' && activeAction.stage === 'SELECT_TARGET_LOCK' && activeAction.targetLockTargets?.some(t => t.x === x && t.y === y);

              if (isOpponentGrid) {
                 if (isJammed) baseClass += ' bg-purple-900/50';
                 else if (displayCellState === CellState.RADAR_CONTACT) baseClass += ' bg-cyan-900/50';
                 else if (radarOverlayCell) baseClass += ' bg-cyan-500/30 ring-1 ring-cyan-400';
                 else if (cell === CellState.HIT) baseClass += ' bg-orange-900/40';
                 else if (cell === CellState.SUNK) baseClass += ' bg-red-900/50';
                 else if (onCellClick && isPlayerTurn && activeAction && cell === CellState.EMPTY) baseClass += ' cursor-pointer bg-slate-900/70 hover:bg-slate-700/70';
                 else baseClass += ' bg-slate-900/70';

                 if (activeAction?.type === 'ATTACK') {
                    isDisabled = isDisabled || !isPlayerTurn || !activeAction || ![CellState.EMPTY, CellState.ASTEROID, CellState.RADAR_CONTACT, CellState.SHIELD_HIT].includes(cell);
                 } else { // Default for other actions before specific override
                    isDisabled = isDisabled || !isPlayerTurn || !activeAction || ![CellState.EMPTY, CellState.ASTEROID, CellState.RADAR_CONTACT].includes(cell);
                 }

                 if (activeAction?.type === 'SKILL' && (activeAction.shipType === 'Radarship' || activeAction.shipType === 'Jamship' || activeAction.shipType === 'Scoutship')) {
                     isDisabled = !isPlayerTurn || !activeAction || (cell !== CellState.EMPTY && cell !== CellState.RADAR_CONTACT) || isPendingJamTarget || isPendingRadarTarget || isPendingTargetLockTarget;
                 }
              } else if (isSetup) {
                 baseClass += ' cursor-pointer bg-slate-900/70 border-slate-700 hover:bg-slate-700'
              }
              else { // Own grid, in-game
                  baseClass += ' bg-slate-900/70';
                  isDisabled = true;
                  if (isPlayerTurn && activeAction) {
                      if (activeAction.type === 'SKILL' && activeAction.shipType === 'Repairship' && cell === CellState.HIT) {
                          baseClass += ' cursor-pointer hover:bg-green-700/50 ring-2 ring-green-500/70';
                          isDisabled = false;
                      } 
                      else if (activeAction.type === 'SKILL' && activeAction.shipType === 'Shieldship' && (cell === CellState.SHIP || cell === CellState.EMPTY)) {
                          baseClass += ' cursor-pointer hover:bg-cyan-700/50 ring-2 ring-cyan-400/70';
                          isDisabled = isShielded; // Can't shield an already shielded part
                      }
                      else if (isPlacingMode && cell === CellState.EMPTY) {
                          baseClass += ' cursor-pointer hover:bg-slate-700/70';
                          isDisabled = false;
                      }
                  }
              }

              if ((isSetup || isPlacingMode) && hoverPreview) {
                 const { x: hx, y: hy, isValid } = hoverPreview;
                 const color = isValid ? 'bg-slate-500/50' : 'bg-red-500/50';

                 if (hoverPreview.area) { // Handle area preview (e.g., Camo)
                    const { width, height } = hoverPreview.area;
                    if (x >= hx && x < hx + width && y >= hy && y < hy + height) {
                        hoverPreviewElement = <div className={`absolute inset-0.5 z-10 ${isValid ? 'bg-purple-500/40' : color}`}></div>;
                    }
                 } else if (hoverPreview.length && hoverPreview.isHorizontal !== undefined) { // Handle ship preview
                    const { length, isHorizontal } = hoverPreview;
                    const inHoverRange = isHorizontal ? (y === hy && x >= hx && x < hx + length) : (x === hx && y >= hy && y < hy + length);
                    if (inHoverRange) {
                        const isBow = isHorizontal ? x === hx : y === hy;
                        const isStern = isHorizontal ? x === hx + length - 1 : y === hy + length - 1;
                        const hoverShipPart = { color, isBow, isStern, isHorizontal };
                        hoverPreviewElement = (
                            <div className={`absolute inset-0.5 z-10 flex items-center justify-center ${hoverShipPart.color} ${(activeAction?.shipType !== 'Decoyship') ? ( hoverShipPart.isHorizontal ? `${hoverShipPart.isBow ? 'rounded-l-full' : ''} ${hoverShipPart.isStern ? 'rounded-r-full' : ''}` : `${hoverShipPart.isBow ? 'rounded-t-full' : ''} ${hoverShipPart.isStern ? 'rounded-b-full' : ''}` ) : 'rounded-md'}`}>
                              {activeAction?.type === 'SKILL' && activeAction.shipType === 'Decoyship' && (<DecoyBeaconIcon className="w-5 h-5 text-purple-200 opacity-70" />)}
                            </div>
                        );
                    }
                 }
              }
              
              const isAnimated = animatedShot && animatedShot.coords?.x === x && animatedShot.coords?.y === y;
              let isShipTargetable = false;
              if (!isDimmed && onShipPartClick && isPlayerTurn && activeAction?.type === 'SKILL' && shipPart && !shipPart.ship.isSunk) {
                  if (activeAction.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP' && !shipPart.ship.isDamaged && !shipPart.ship.hasBeenRelocated) {
                      isShipTargetable = true;
                  }
              }
              const isRelocateIneligible = !isDimmed && isPlayerTurn && activeAction?.type === 'SKILL' && activeAction.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP' && shipPart && !shipPart.ship.isSunk && (shipPart.ship.isDamaged || shipPart.ship.hasBeenRelocated);
              const isShipJammedOnGrid = !isOpponentGrid && player?.jamTurnsRemaining && player.jamTurnsRemaining > 0 && shipPart && shipPart.ship.positions.some(p => player.jammedPositions?.some(jp => jp.x === p.x && jp.y === p.y));

              return (
              <div key={`${x}-${y}`} className="aspect-square" ref={isFlagshipBow ? mothershipBowRef : null}>
                <button
                  data-coords={`${x},${y}`}
                  className={`${baseClass}`}
                  onClick={(e) => !isDimmed && onCellClick && onCellClick(x, y, e)}
                  onMouseEnter={isOpponentGrid ? (e) => onCellMouseEnter && onCellMouseEnter(x, y, e) : (isSetup || isPlacingMode) ? () => onCellMouseEnter && onCellMouseEnter(x, y, null!) : undefined}
                  onMouseLeave={onCellMouseLeave}
                  onDrop={(e) => { e.preventDefault(); onCellDrop && onCellDrop(x,y); }}
                  onDragOver={(e) => onCellDragOver && onCellDragOver(e, x, y)}
                  disabled={isDisabled || isDimmed}
                  aria-label={`Cell ${headers[x]}${y + 1}, state: ${cell}`}
                >
                  {isJammed && <JamOverlay className="absolute inset-0 w-full h-full opacity-70 z-20 pointer-events-none" />}
                  {isGlitching && <div className="absolute inset-0 electric-cell-effect z-20 pointer-events-none" style={{ '--rot': `${glitchRotation}deg` } as React.CSSProperties} />}
                  {isTargetLocked && <div className="target-lock-reticle" />}
                  {isShielded && <div className="shield-overlay shield-overlay-animated"><ShieldIcon className="w-full h-full text-cyan-400 opacity-80" /></div>}

                   {shipPart && shipPart.partIndex === 0 && (
                      <div className="absolute top-0 left-0" style={{ width: shipPart.isHorizontal ? `${shipPart.ship.length * 100}%` : '100%', height: shipPart.isHorizontal ? '100%' : `${shipPart.ship.length * 100}%`, zIndex: 5, pointerEvents: 'none' }}>
                          <div className={`w-full h-full ship-container ${isShipJammedOnGrid ? 'jam-electric-ui' : ''}`} style={{ '--animation-delay': `${(((x * 7) + y) % 10) * 0.3}s` } as React.CSSProperties}>
                           {shipPart.ship.isSunk ? (
                              <div className="absolute inset-0.5 bg-slate-800 border border-slate-700 rounded-full opacity-80" />
                            ) : (
                              <>
                                <div className={`w-full h-full ship-body ${shipPart.isHorizontal ? 'is-horizontal' : 'is-vertical'} ${isSetup && selectedShipName === shipPart.ship.name ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-800' : ''} ${isShipTargetable ? 'ship-active-glow' : ''}`} />
                                {shipPart.ship.positions.map((pos, index) => (grid[pos.y][pos.x] === CellState.HIT) && (
                                  <div key={index} className="damage-overlay" style={{ left: shipPart.isHorizontal ? `${(index / shipPart.ship.length) * 100}%` : '0', top: shipPart.isHorizontal ? '0' : `${(index / shipPart.ship.length) * 100}%`, width: shipPart.isHorizontal ? `${100 / shipPart.ship.length}%` : '100%', height: shipPart.isHorizontal ? '100%' : `${100 / shipPart.ship.length}%` }} />
                                ))}
                                {isRelocateIneligible && (
                                    <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center z-10 pointer-events-none rounded-full">
                                        <XIcon className="w-8 h-8 text-red-300" />
                                    </div>
                                )}
                              </>
                            )}
                          </div>
                          {(isSetup || isShipTargetable) && !shipPart.ship.isSunk && (
                            <div
                              className="ship-interactive-layer" style={{ cursor: isShipTargetable ? 'pointer' : 'grab' }} title={shipPart.ship.name} draggable={isSetup && selectedShipName === shipPart.ship.name}
                              onDragStart={(e) => { e.stopPropagation(); if (!isSetup || !onShipDragStart) return; const rect = e.currentTarget.getBoundingClientRect(); let partIndex = 0; if (shipPart.isHorizontal) { const offsetX = e.clientX - rect.left; const cellWidth = rect.width / shipPart.ship.length; partIndex = Math.floor(offsetX / cellWidth); } else { const offsetY = e.clientY - rect.top; const cellHeight = rect.height / shipPart.ship.length; partIndex = Math.floor(offsetY / cellHeight); } onShipDragStart(shipPart.ship, partIndex); }}
                              onDragEnd={(e) => { e.stopPropagation(); onShipDragEnd && onShipDragEnd(); }}
                              onClick={(e) => { e.stopPropagation(); if (isDimmed) return; if (isShipTargetable && onShipPartClick) onShipPartClick(shipPart.ship); }}
                            />
                          )}
                      </div>
                   )}
                  {shipPart && shipPart.partIndex === 0 && !shipPart.ship.isSunk && (
                      <div className="absolute top-0 left-0 flex items-center justify-center pointer-events-none" style={{ width: shipPart.isHorizontal ? `${shipPart.ship.length * 100}%` : '100%', height: shipPart.isHorizontal ? '100%' : `${shipPart.ship.length * 100}%`, zIndex: 25 }}>
                          <ShipTypeIcon type={shipPart.ship.type} className="w-6 h-6 text-slate-200" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }}/>
                      </div>
                  )}
                  {isFlagshipBow && (
                     <div ref={mothershipRef} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                        <div className="w-6 h-6 bg-slate-700 rounded-full shadow-md border-2 border-slate-500">
                           <div ref={cannonBarrelRef} className="absolute bottom-1/2 left-1/2 w-3 h-10 bg-gradient-to-t from-slate-600 to-slate-500 rounded-t-md -translate-x-1/2 origin-bottom transition-transform duration-200 ease-out shadow-lg" style={{transform: 'rotate(0deg)'}}>
                              <div ref={cannonTipRef} className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-slate-800 rounded-sm" />
                           </div>
                        </div>
                     </div>
                  )}
                  {hoverPreviewElement}
                  {isPendingJamTarget && (
                    <div className="absolute inset-0.5 z-10 bg-purple-600/50 ring-2 ring-purple-300 jam-electric-ui pointer-events-none flex items-center justify-center">
                        <JamshipIcon className="w-full h-full p-2 text-purple-200/80" />
                    </div>
                  )}
                  {isPendingRadarTarget && (
                    <div className="absolute inset-0.5 z-10 bg-cyan-600/50 ring-2 ring-cyan-300 pointer-events-none flex items-center justify-center">
                        <RadarshipIcon className="w-full h-full p-2 text-cyan-200/80" />
                    </div>
                  )}
                  {isPendingTargetLockTarget && (
                    <div className="absolute inset-0.5 z-10 bg-red-600/50 ring-2 ring-red-300 pointer-events-none flex items-center justify-center">
                        <TargetIcon className="w-full h-full p-2 text-red-200/80" />
                    </div>
                  )}
                  <div className="relative z-20">{getCellContent(displayCellState, shipPart)}</div>
                </button>
              </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Grid;
