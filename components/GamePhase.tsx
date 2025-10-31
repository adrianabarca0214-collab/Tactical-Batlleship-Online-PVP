
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GameState, Player, GameLogEntry, Ship, ShipType, CellState, GamePhase } from '../types';
import Grid from './Grid';
import ShipStatus from './ShipStatus';
import ExitIcon from './icons/ExitIcon';
import { createEmptyGrid, canPlaceShip } from '../services/gameLogic';
import GameLog from './GameLog';
import CancelIcon from './icons/CancelIcon';
import HelpTab from './HelpTab';
import InfoIcon from './icons/InfoIcon';
import ActionHub from './ActionHub';
import FullscreenIcon from './icons/FullscreenIcon';
import RepairEffect from './RepairEffect';
import ShieldEffect from './ShieldEffect';
import RotateIcon from './icons/RotateIcon';
import MobileIcon from './icons/MobileIcon';
import DesktopIcon from './icons/DesktopIcon';
import HelpIcon from './icons/HelpIcon';
import ConfirmationModal from './ConfirmationModal';
import ShieldIcon from './icons/ShieldIcon';

const Cannonball: React.FC<{ startRect: DOMRect, endRect: DOMRect }> = ({ startRect, endRect }) => {
  const [styles, setStyles] = useState<React.CSSProperties & { [key: string]: any }>({});
  useEffect(() => {
    const startX = startRect.left + startRect.width / 2 - 8;
    const startY = startRect.top + startRect.height / 2 - 8;
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    setStyles({
      position: 'fixed',
      left: `${startX}px`,
      top: `${startY}px`,
      '--delta-x': `${deltaX}px`,
      '--delta-y': `${deltaY}px`,
    });
  }, [startRect, endRect]);

  if (!styles.left) return null;
  return <div className="cannonball" style={styles}></div>;
};

const Explosion: React.FC<{ rect: DOMRect }> = ({ rect }) => {
    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
    };

    const NUM_PARTICLES = 12;
    const particles = useMemo(() => {
        return Array.from({ length: NUM_PARTICLES }).map((_, i) => {
            const angle = (i / NUM_PARTICLES) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
            const distance = 40 + Math.random() * 30;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const delay = Math.random() * 0.1;

            const style: React.CSSProperties & { [key: string]: any } = {
                '--particle-x': `${x}px`,
                '--particle-y': `${y}px`,
                animationDelay: `${delay}s`,
            };
            return <div key={i} className="explosion-particle" style={style}></div>;
        });
    }, []);

    return (
        <div style={containerStyle} className="explosion-container">
            <div className="explosion-flash"></div>
            <div className="explosion-shockwave"></div>
            {particles}
        </div>
    );
};

// --- Skill Animation Components ---
const RadarSweepEffect: React.FC<{ rect: DOMRect }> = ({ rect }) => {
    const style: React.CSSProperties = {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
    };
    return (
        <div className="scan-area" style={style}>
            <div className="scan-line"></div>
        </div>
    );
};
const JamWaveEffect: React.FC<{ rect: DOMRect }> = ({ rect }) => {
    const style: React.CSSProperties = {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top + rect.height / 2}px`,
    };
    return <div className="jam-wave" style={style}></div>;
};

const StaticBurstEffect: React.FC<{ rect: DOMRect }> = ({ rect }) => {
    const style: React.CSSProperties = {
        position: 'fixed',
        left: `${rect.left - rect.width}px`,
        top: `${rect.top - rect.height}px`,
        width: `${rect.width * 3}px`,
        height: `${rect.height * 3}px`,
        zIndex: 102,
        pointerEvents: 'none',
    };
    return <div className="static-burst-effect" style={style}></div>;
};

const ActiveActionInfo: React.FC<{ 
    activeAction: any, 
    onSetActiveAction: (action: any) => void,
    onRotatePlacement?: () => void,
    isPlacementHorizontal?: boolean,
}> = ({ activeAction, onSetActiveAction, onRotatePlacement, isPlacementHorizontal }) => {
    let title = '';
    let description = '';

    if (activeAction.type === 'ATTACK') {
        title = 'Attack Mode';
        description = "Select a coordinate to fire.";
    } else { // It's a skill
        switch (activeAction.shipType) {
            case 'Mothership':
                title = 'Escape Maneuver';
                description = `Relocate your Mothership. Press 'R' to rotate.`;
                break;
            case 'Radarship':
                title = 'Deploy Radar Bots';
                const radarBotsLeft = 4 - (activeAction.radarTargets?.length || 0);
                description = `Select ${radarBotsLeft} more cell${radarBotsLeft !== 1 ? 's' : ''} to scan. Click again to deselect.`;
                break;
            case 'Repairship':
                title = 'Repair Mode';
                description = "Select a damaged ship part.";
                break;
            case 'Shieldship':
                title = 'Deploy Shield';
                description = "Select a healthy ship part or empty water to shield.";
                break;
            case 'Commandship':
                if (activeAction.stage === 'PLACE_SHIP') {
                    title = 'Relocate Ship';
                    description = `Place the ${activeAction.shipToMove.name}. Press 'R' to rotate.`;
                } else {
                    title = 'Relocate Skill';
                    description = "Select a friendly, non-damaged ship (on grid or status bar) to move.";
                }
                break;
            case 'Decoyship':
                title = 'Deploy Decoy';
                description = "Select a cell for a decoy.";
                break;
            case 'Jamship':
                title = 'Deploy Jam Bots';
                const jamBotsLeft = 4 - (activeAction.jamTargets?.length || 0);
                description = `Select ${jamBotsLeft} more cell${jamBotsLeft !== 1 ? 's' : ''} to jam. Click again to deselect.`;
                break;
            case 'Camoship':
                title = 'Place Camouflage Field';
                description = 'Select the top-left corner of the 4x4 area to conceal.';
                break;
            case 'Scoutship':
                title = 'Target Lock';
                const targetsLeft = 4 - (activeAction.targetLockTargets?.length || 0);
                description = `Select ${targetsLeft} more cell${targetsLeft !== 1 ? 's' : ''} to lock. Click again to deselect.`;
                break;
        }
    }
    
    const isPlacingShip = activeAction.stage === 'PLACE_SHIP' && (activeAction.shipType === 'Mothership' || activeAction.shipType === 'Commandship');

    return (
        <div className="flex items-center justify-center gap-4 p-2 bg-slate-900/50 border border-cyan-500 command-panel action-panel-throb fade-in-down">
            <InfoIcon className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div className="text-left">
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-300">{description}</p>
            </div>
            {isPlacingShip && onRotatePlacement && (
                <button 
                    onClick={onRotatePlacement}
                    className="btn-angular flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3"
                >
                    <RotateIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Rotate ({isPlacementHorizontal ? 'H' : 'V'})</span>
                </button>
            )}
            <button onClick={() => onSetActiveAction(null)} className="btn-angular flex items-center gap-2 btn-red text-white font-semibold py-2 px-3">
                <CancelIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Cancel</span>
            </button>
        </div>
    );
};


interface GamePhaseProps {
  game: GameState;
  playerId: string;
  onFireShot: (targetPlayerId: string | null, x: number, y: number) => void;
  onSurrender: () => void;
  onSetActiveAction: (action: any) => void;
  onUseSkill: (skillType: ShipType, options: any) => Promise<boolean>;
  onEndTurn: () => void;
  onActivateMothershipEscape: () => void;
  onSelectShipForRelocation: (ship: Ship) => void;
  viewMode: 'desktop' | 'mobile';
  setViewMode: (mode: 'desktop' | 'mobile') => void;
  showToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

const GamePhaseComponent: React.FC<GamePhaseProps> = ({ 
    game, playerId, onFireShot, onSurrender, 
    onSetActiveAction, onUseSkill, onEndTurn, 
    onActivateMothershipEscape, onSelectShipForRelocation,
    viewMode, setViewMode, showToast 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  
  const [shotAnimation, setShotAnimation] = useState<{ startRect: DOMRect, endRect: DOMRect } | null>(null);
  const [explosion, setExplosion] = useState<DOMRect | null>(null);
  const [incomingShotExplosion, setIncomingShotExplosion] = useState<{ rect: DOMRect; key: number } | null>(null);
  const [repairAnimation, setRepairAnimation] = useState<{ rect: DOMRect; key: number } | null>(null);
  const [skillAnimation, setSkillAnimation] = useState<{ type: string; rect?: DOMRect; rects?: DOMRect[]; key: number } | null>(null);
  const [staticBurst, setStaticBurst] = useState<{ rect: DOMRect; key: number } | null>(null);
  const [bluffAnimation, setBluffAnimation] = useState<{ x: number; y: number; key: number } | null>(null);
  const [hoveredCellEl, setHoveredCellEl] = useState<HTMLElement | null>(null);
  const isAnimating = useRef(false);
  const mothershipRef = useRef<HTMLDivElement>(null);
  const cannonTipRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isPlacementHorizontal, setIsPlacementHorizontal] = useState(true);
  const endTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState(false);

  // --- Player and Turn Logic ---
  const localPlayer = useMemo(() => game.players.find(p => p.id === playerId)!, [game.players, playerId]);
  const opponent = useMemo(() => game.players.find(p => p.id !== playerId)!, [game.players, playerId]);
  const turnPlayer = game.players.find(p => p.id === game.currentPlayerId);

  if (!turnPlayer || !localPlayer || !opponent) return null;

  const isMyTurn = game.currentPlayerId === playerId;
  const isAITurn = !!turnPlayer.isAI;
  const canTakeAction = isMyTurn && localPlayer.actionPoints > 0;
  const showEndTurnButton = isMyTurn && localPlayer.actionPoints <= 0 && game.phase === GamePhase.PLAYING;
  const turnIndicatorColor = isMyTurn ? 'text-green-400' : 'text-orange-400';
  
  const [animatedShot, setAnimatedShot] = useState<GameLogEntry | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  // Auto End Turn Logic
  useEffect(() => {
    if (endTurnTimerRef.current) {
        clearTimeout(endTurnTimerRef.current);
    }

    if (showEndTurnButton) {
        endTurnTimerRef.current = setTimeout(() => {
            onEndTurn();
        }, 5000);
    }

    return () => {
        if (endTurnTimerRef.current) {
            clearTimeout(endTurnTimerRef.current);
        }
    };
  }, [showEndTurnButton, onEndTurn]);

  useEffect(() => {
    setShotAnimation(null);
    setExplosion(null);
    setRepairAnimation(null);
    setSkillAnimation(null);
    setStaticBurst(null);
    setAnimatedShot(null);
    setBluffAnimation(null);
    isAnimating.current = false;
  }, [game.turn, game.currentPlayerId]);

  const activeAction = game.activeAction;

  useEffect(() => {
    if (activeAction?.stage === 'PLACE_SHIP') setIsPlacementHorizontal(activeAction.isHorizontal ?? true);
  }, [activeAction]);

  // Log-driven animations
  useEffect(() => {
    // Incoming shot animation for the player at the start of their turn.
    if (isMyTurn && game.lastShot && game.lastShot.targetId === localPlayer.id) {
        const gridEl = gameContainerRef.current?.querySelector('.player-grid-container .grid');
        if (gridEl) {
            const { x, y } = game.lastShot.coords;
            const cellEl = gridEl.querySelector(`button[data-coords='${x},${y}']`) as HTMLElement;
            if (cellEl) {
                const rect = cellEl.getBoundingClientRect();
                setIncomingShotExplosion({ rect, key: Date.now() });
                setTimeout(() => setIncomingShotExplosion(null), 1000); // Animation duration
            }
        }
    }
    
    // Skill animations driven by the log to ensure they play correctly after state updates
    if (game.log.length > 0) {
        const lastLog = game.log[0];
        
        const triggerAnimationOnGrid = (coords: { x: number; y: number }, onRectFound: (rect: DOMRect) => void) => {
            const gridSelector = lastLog.playerId === localPlayer.id ? '.player-grid-container .grid' : '.opponent-grid-container .grid';
             if (lastLog.targetId && lastLog.targetId !== localPlayer.id) { // Shot fired by me
                const gridEl = gameContainerRef.current?.querySelector('.opponent-grid-container .grid');
                if (gridEl) {
                    const cellEl = gridEl.querySelector(`button[data-coords='${coords.x},${coords.y}']`) as HTMLElement;
                    if (cellEl) onRectFound(cellEl.getBoundingClientRect());
                }
            } else { // Skill used by me on my grid, or shot at me
                const gridEl = gameContainerRef.current?.querySelector('.player-grid-container .grid');
                if (gridEl) {
                    const cellEl = gridEl.querySelector(`button[data-coords='${coords.x},${coords.y}']`) as HTMLElement;
                    if (cellEl) onRectFound(cellEl.getBoundingClientRect());
                }
            }
        };
        
        if (lastLog.result === 'SHIELD_BROKEN' && lastLog.coords) {
             triggerAnimationOnGrid(lastLog.coords, (rect) => {
                setSkillAnimation({ type: 'shield_break', rect, key: Date.now() });
                setTimeout(() => setSkillAnimation(null), 600);
            });
        }

        // Shield form animation
        if (lastLog.result === 'SKILL_USED' && lastLog.message?.includes('deployed a shield') && lastLog.coords) {
            triggerAnimationOnGrid(lastLog.coords, (rect) => {
                setSkillAnimation({ type: 'shield_form', rect, key: Date.now() });
                setTimeout(() => setSkillAnimation(null), 600);
            });
        }
    }
  }, [game.log, localPlayer.id, isMyTurn, game.lastShot]);

  useEffect(() => {
    const isPlacingShip = activeAction?.stage === 'PLACE_SHIP' && (activeAction.shipType === 'Mothership' || activeAction.shipType === 'Commandship');
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isPlacingShip && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            setIsPlacementHorizontal(p => !p);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAction]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (game.log.length > 0) {
        const latestLog = game.log[0];
        if (animatedShot?.turn !== latestLog.turn || (animatedShot.coords?.x !== latestLog.coords?.x || animatedShot.coords?.y !== latestLog.coords?.y)) {
            setAnimatedShot(latestLog);
        }
    }
  }, [game.log]);

  let statusMessage = '';
  if (isAnimating.current) statusMessage = "Executing action...";
  else if (isAITurn) statusMessage = "AI is calculating its next move...";
  else if (canTakeAction) statusMessage = `Your turn. ${localPlayer.actionPoints} AP remaining.`;
  else if (showEndTurnButton) statusMessage = "Turn complete. Ending turn automatically...";
  else statusMessage = `Waiting for ${turnPlayer?.name || 'player'}...`;
  
  const handleSurrender = () => {
    setIsSurrenderModalOpen(true);
  };

  const handleActionSelect = (actionType: ShipType | 'ATTACK') => {
     if (!isMyTurn) {
        showToast("It's not your turn.", "error");
        return;
    }
     if (localPlayer.actionPoints <= 0) {
        showToast("You have no Action Points left.", "error");
        return;
    }
    if (activeAction && (activeAction.shipType === actionType || (actionType === 'ATTACK' && activeAction.type === 'ATTACK'))) {
        onSetActiveAction(null); return;
    }
    if (actionType === 'ATTACK') {
        if(localPlayer.actionPoints < 1) {
            showToast("Not enough Action Points to attack.", "error");
            return;
        }
        onSetActiveAction({ playerId, type: 'ATTACK' }); return;
    }
    if (localPlayer.actionPoints < 2) {
        showToast("Not enough Action Points to use a skill.", "error");
        return;
    }

    const ship = localPlayer.ships.find(s => s.type === actionType);
    if (!ship || ship.isSunk) {
        showToast(`${ship?.name || 'Ship'} is sunk.`, "error");
        return;
    }
     if ((actionType === 'Camoship' || actionType === 'Shieldship') && ship.isDamaged) {
        showToast(`${ship.name} is damaged and cannot use its skill.`, "error");
        return;
    }

    const cooldown = localPlayer.skillCooldowns[actionType] ?? 0;
    const uses = localPlayer.skillUses[actionType] ?? 1;
    if (cooldown > 0) {
        showToast(`${ship.name} skill is on cooldown for ${cooldown} turn(s).`, "error");
        return;
    }
    if (uses <= 0) {
        showToast(`${ship.name} skill has no uses left.`, "error");
        return;
    }
    if (actionType === 'Mothership') { onActivateMothershipEscape(); return; }
    
    let newAction: any = { playerId, type: 'SKILL' as const, shipType: actionType };
    if (actionType === 'Commandship') newAction = { ...newAction, stage: 'SELECT_SHIP' };
    else if (actionType === 'Decoyship') newAction = { ...newAction, stage: 'PLACE_DECOY' };
    else if (actionType === 'Jamship') newAction = { ...newAction, stage: 'SELECT_J_TARGETS', jamTargets: [] };
    else if (actionType === 'Radarship') newAction = { ...newAction, stage: 'SELECT_R_TARGETS', radarTargets: [] };
    else if (actionType === 'Camoship') newAction = { ...newAction, stage: 'PLACE_CAMO' };
    else if (actionType === 'Scoutship') newAction = { ...newAction, stage: 'SELECT_TARGET_LOCK', targetLockTargets: [] };
    else if (actionType === 'Shieldship') newAction = { ...newAction, stage: 'SELECT_SHIELD_TARGET' };
    
    onSetActiveAction(newAction);
  }

  const handleAttack = (targetPlayerId: string | null, x: number, y: number, targetEl: HTMLElement) => {
    if (!canTakeAction || !activeAction || activeAction.type !== 'ATTACK' || isAnimating.current) return;
    const cannonEl = cannonTipRef.current;
    if (!cannonEl) {
        onFireShot(targetPlayerId, x, y); return;
    }
    isAnimating.current = true;
    const startRect = cannonEl.getBoundingClientRect();
    const endRect = targetEl.getBoundingClientRect();
    setShotAnimation({ startRect, endRect });
    setTimeout(() => {
        setExplosion(endRect);
        onFireShot(targetPlayerId, x, y);
        gameContainerRef.current?.focus({ preventScroll: true });
        setTimeout(() => {
            setShotAnimation(null);
            setExplosion(null);
            isAnimating.current = false;
        }, 500);
    }, 700);
  };

  const handleOpponentGridClick = async (targetPlayerId: string | null, x: number, y: number, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (!isMyTurn) { showToast("It's not your turn.", "error"); return; }
    if (!event || !event.currentTarget) return;
    if (!activeAction) { showToast("Select an action first (e.g., Attack).", "error"); return; }
    
    const friendlySkills = ['Repairship', 'Decoyship', 'Commandship', 'Mothership', 'Camoship', 'Shieldship'];
    if (activeAction.type === 'SKILL' && friendlySkills.includes(activeAction.shipType)) {
        showToast("This skill can only be used on your own grid.", "error");
        return;
    }
    const targetEl = event.currentTarget;

    if (activeAction.type === 'ATTACK') {
        const opponentShots = localPlayer.shots[opponent.id] || createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols);
        const cellState = opponentShots[y][x];
        if (cellState !== CellState.EMPTY && cellState !== CellState.RADAR_CONTACT && cellState !== CellState.SHIELD_HIT) {
            showToast("You have already fired at this coordinate.", "error");
            return;
        }
        handleAttack(targetPlayerId, x, y, targetEl);
    } else if (activeAction.type === 'SKILL') {
        if (activeAction.shipType === 'Jamship') {
            const currentTargets = activeAction.jamTargets || [];
            const existingTargetIndex = currentTargets.findIndex(t => t.x === x && t.y === y);
            let newTargets;

            if (existingTargetIndex > -1) {
                newTargets = currentTargets.filter((_, index) => index !== existingTargetIndex);
            } else {
                newTargets = [...currentTargets, { x, y }];
            }

            if (newTargets.length >= 4) {
                const success = await onUseSkill('Jamship', { jamTargets: newTargets });
                if (success) {
                    const rect = targetEl.getBoundingClientRect();
                    const now = Date.now();
                    setSkillAnimation({ type: 'jam', rect, key: now });
                    setTimeout(() => setStaticBurst({ rect, key: now + 1 }), 300);
                    setTimeout(() => { setSkillAnimation(null); setStaticBurst(null); }, 900);
                }
            } else {
                onSetActiveAction({ ...activeAction, jamTargets: newTargets });
            }
            return;
        }

        if (activeAction.shipType === 'Radarship') {
            const currentTargets = activeAction.radarTargets || [];
            const existingTargetIndex = currentTargets.findIndex(t => t.x === x && t.y === y);
            let newTargets;

            if (existingTargetIndex > -1) {
                newTargets = currentTargets.filter((_, index) => index !== existingTargetIndex);
            } else {
                newTargets = [...currentTargets, { x, y }];
            }
            
            if (newTargets.length >= 4) {
                const success = await onUseSkill('Radarship', { radarTargets: newTargets });
                if (success) {
                    const gridEl = targetEl.closest('.grid-container');
                    if (gridEl) {
                        const rects = newTargets.map(target => {
                            const cellEl = gridEl.querySelector(`[data-coords='${target.x},${target.y}']`);
                            return cellEl?.getBoundingClientRect();
                        }).filter((r): r is DOMRect => !!r);
                
                        if (rects.length > 0) {
                            const now = Date.now();
                            setSkillAnimation({ type: 'radar', rects, key: now });
                            setTimeout(() => setSkillAnimation(null), 1000);
                        }
                    }
                }
            } else {
                onSetActiveAction({ ...activeAction, radarTargets: newTargets });
            }
            return;
        }

        if (activeAction.shipType === 'Scoutship') {
            const currentTargets = activeAction.targetLockTargets || [];
            const existingTargetIndex = currentTargets.findIndex(t => t.x === x && t.y === y);
            let newTargets;

            if (existingTargetIndex > -1) {
                newTargets = currentTargets.filter((_, index) => index !== existingTargetIndex);
            } else {
                newTargets = [...currentTargets, { x, y }];
            }
            
            if (newTargets.length >= 4) {
                await onUseSkill('Scoutship', { targets: newTargets });
            } else {
                onSetActiveAction({ ...activeAction, targetLockTargets: newTargets });
            }
            return;
        }
    }
  }
  
  const handleOwnGridClick = async (x: number, y: number, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (!isMyTurn) { showToast("It's not your turn.", "error"); return; }
    if (!event?.currentTarget) return;
    if (!activeAction) { showToast("Select a skill to use on your grid.", "error"); return; }

    const enemySkills = ['Radarship', 'Jamship', 'Scoutship'];
    if (activeAction.type === 'ATTACK' || (activeAction.type === 'SKILL' && enemySkills.includes(activeAction.shipType))) {
        showToast("This action can only be used on the opponent's grid.", "error");
        return;
    }

    const targetEl = event.currentTarget;
    if (activeAction.type === 'SKILL') {
        let success = false;
        if (['Repairship', 'Decoyship', 'Camoship', 'Shieldship'].includes(activeAction.shipType)) {
             success = await onUseSkill(activeAction.shipType, { x, y });
        } else if (['Mothership', 'Commandship'].includes(activeAction.shipType) && activeAction.stage === 'PLACE_SHIP') {
             success = await onUseSkill(activeAction.shipType, { x, y, isHorizontal: isPlacementHorizontal });
        }
        if (success) {
            if (activeAction.shipType === 'Repairship') {
                const rect = targetEl.getBoundingClientRect();
                setRepairAnimation({ rect, key: Date.now() });
            }
        }
    }
  };

  const handleShipClick = async (ship: Ship) => {
    if (canTakeAction && activeAction?.type === 'SKILL' && activeAction.shipType === 'Commandship' && activeAction.stage === 'SELECT_SHIP') {
      if (ship.isDamaged) {
          showToast("Cannot relocate a damaged ship.", "error");
          return;
      }
      if (ship.hasBeenRelocated) {
          showToast(`${ship.name} has already been relocated once.`, "error");
          return;
      }
      onSelectShipForRelocation(ship);
    }
  };

  const gridForPlacementCheck = useMemo(() => {
    if (activeAction?.stage === 'PLACE_SHIP' && activeAction.shipToMove) {
        const gridCopy = createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols);
        localPlayer.ships.forEach(ship => {
            if (ship.name !== activeAction.shipToMove.name && ship.positions.length > 0) {
                ship.positions.forEach(pos => { gridCopy[pos.y][pos.x] = CellState.SHIP; });
            }
        });
        return gridCopy;
    }
    return localPlayer.grid;
  }, [localPlayer, activeAction, game.gridDimensions]);
  
  const hoverPreview = useMemo(() => {
    if (!hoveredCell || !activeAction || !canTakeAction) return null;
    let shipLength: number | undefined;
    const isRelocating = activeAction.type === 'SKILL' && ['Mothership', 'Commandship'].includes(activeAction.shipType) && activeAction.stage === 'PLACE_SHIP';
    const isPlacingDecoy = activeAction.type === 'SKILL' && activeAction.shipType === 'Decoyship' && activeAction.stage === 'PLACE_DECOY';
    const isPlacingCamo = activeAction.type === 'SKILL' && activeAction.shipType === 'Camoship' && activeAction.stage === 'PLACE_CAMO';

    if (isRelocating && activeAction.shipToMove) shipLength = activeAction.shipToMove.length;
    else if (isPlacingDecoy) shipLength = 1;
    
    if (isPlacingCamo) {
        return { x: hoveredCell.x, y: hoveredCell.y, area: { width: 4, height: 4 }, isValid: true };
    }

    if (shipLength === undefined) return null;
    return { x: hoveredCell.x, y: hoveredCell.y, length: shipLength, isHorizontal: isPlacementHorizontal, isValid: canPlaceShip(gridForPlacementCheck, { length: shipLength }, hoveredCell.x, hoveredCell.y, isPlacementHorizontal, game.gridDimensions)};
  }, [hoveredCell, activeAction, gridForPlacementCheck, game.gridDimensions, canTakeAction, isPlacementHorizontal]);

  const playerGrid = useMemo(() => {
    const newGrid = localPlayer.grid.map(row => [...row]);
    localPlayer.decoyPositions.forEach(pos => {
        if (newGrid[pos.y][pos.x] === CellState.EMPTY) newGrid[pos.y][pos.x] = CellState.DECOY;
    });
    return newGrid;
  }, [localPlayer.grid, localPlayer.decoyPositions]);

  const isOpponentGridDimmed = isMyTurn && activeAction && activeAction.type === 'SKILL' && ['Repairship', 'Decoyship', 'Commandship', 'Mothership', 'Camoship', 'Shieldship'].includes(activeAction.shipType);
  const isOwnGridDimmed = isMyTurn && activeAction && (activeAction.type === 'ATTACK' || (activeAction.type === 'SKILL' && ['Radarship', 'Jamship', 'Scoutship'].includes(activeAction.shipType)));

  const opponentGridContent = (
      <div className={`grid-container opponent-grid-container command-panel p-2 sm:p-4 transition-all duration-300 ${opponent.isEliminated ? 'opacity-70' : ''} ${canTakeAction && activeAction && !isOwnGridDimmed ? 'grid-active-turn' : ''}`}>
        <div className="bg-slate-900/50 p-2 text-center command-panel-header mb-4">
            <h2 className="text-2xl font-semibold text-white">{`${opponent.name}${opponent.isAI ? ' (AI)' : ''} ${opponent.isEliminated ? '- ELIMINATED' : ''}`}</h2>
        </div>
        <Grid
          grid={localPlayer.shots[opponent.id] || createEmptyGrid(game.gridDimensions.rows, game.gridDimensions.cols)}
          onCellClick={(x, y, e) => handleOpponentGridClick(opponent.id, x, y, e)}
          isOpponentGrid={true}
          isPlayerTurn={isMyTurn}
          gridDimensions={game.gridDimensions}
          animatedShot={animatedShot?.targetId === opponent.id ? animatedShot : null}
          radarOverlay={game.radarScanResult?.playerId === localPlayer.id ? game.radarScanResult.results : []}
          jammedOverlay={game.jammedArea?.playerId === opponent.id ? game.jammedArea.coords : []}
          camoOverlay={opponent.camoArea}
          targetLockOverlay={localPlayer.targetLocks?.[opponent.id]}
          activeAction={activeAction}
          isDimmed={isOpponentGridDimmed}
          onCellMouseEnter={(_, __, e) => setHoveredCellEl(e.currentTarget)}
          onCellMouseLeave={() => setHoveredCellEl(null)}
        />
        <ShipStatus ships={opponent.ships} isOpponent={true} gameMode={game.gameMode} player={opponent} />
      </div>
  );

  const playerGridContent = (
      <div className={`grid-container player-grid-container command-panel p-2 sm:p-4 transition-all duration-300 ${!canTakeAction && !isOwnGridDimmed && isMyTurn ? 'grid-active-turn' : ''}`}>
         <div className="bg-slate-900/50 p-2 text-center command-panel-header mb-4">
            <h2 className="text-2xl font-semibold text-white">{`${localPlayer.name} (Your Fleet)`}</h2>
        </div>
        <Grid 
            grid={playerGrid} 
            ships={localPlayer.ships}
            gridDimensions={game.gridDimensions}
            activeAction={activeAction}
            isPlayerTurn={isMyTurn}
            onCellClick={handleOwnGridClick}
            onShipPartClick={handleShipClick}
            shieldedOverlay={localPlayer.shieldedPositions}
            hoverPreview={hoverPreview}
            camoOverlay={localPlayer.camoArea}
            targetLockOverlay={opponent.targetLocks?.[localPlayer.id]}
            onCellMouseEnter={(x, y) => setHoveredCell({x, y})}
            onCellMouseLeave={() => setHoveredCell(null)}
            isDimmed={isOwnGridDimmed}
            mothershipRef={mothershipRef}
            cannonTipRef={cannonTipRef}
            isPlayerGrid={true}
            hoveredCellEl={hoveredCellEl}
            gameMode={game.gameMode}
        />
        {bluffAnimation && (
            <div
                key={bluffAnimation.key}
                className="shield-overlay shield-break-effect"
                style={{
                    left: `${(bluffAnimation.x / game.gridDimensions.cols) * 100}%`,
                    top: `${(bluffAnimation.y / game.gridDimensions.rows) * 100}%`,
                    width: `${(1 / game.gridDimensions.cols) * 100}%`,
                    height: `${(1 / game.gridDimensions.rows) * 100}%`,
                }}
            >
                <ShieldIcon className="w-full h-full text-cyan-300" />
            </div>
        )}
        <ShipStatus 
          ships={localPlayer.ships} player={localPlayer} grid={localPlayer.grid} gameMode={game.gameMode} 
          onPodClick={handleShipClick} activeAction={activeAction}
        />
      </div>
  );
  
  const centerHubContent = (
      <div className="flex-1 flex justify-center items-center px-2 min-h-[80px]">
           {isMyTurn && !isAnimating.current && canTakeAction && game.gameMode === 'TACTICAL' && (
            activeAction ? (
               <ActiveActionInfo 
                  activeAction={activeAction} onSetActiveAction={onSetActiveAction}
                  onRotatePlacement={() => setIsPlacementHorizontal(p => !p)} isPlacementHorizontal={isPlacementHorizontal}
               />
            ) : ( <div className="action-hub-container"><ActionHub player={localPlayer} activeAction={game.activeAction} onActionSelect={handleActionSelect} /></div> )
          )}
          {isMyTurn && !isAnimating.current && canTakeAction && game.gameMode !== 'TACTICAL' && (
               <div className="flex justify-center">
                  <button 
                    onClick={() => onSetActiveAction({ playerId, type: 'ATTACK' })}
                    disabled={localPlayer.actionPoints < 1}
                    className={`btn-angular px-6 py-2 text-base font-bold transition-colors ${activeAction?.type === 'ATTACK' ? 'selected' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                    Select Target
                  </button>
               </div>
          )}
          {showEndTurnButton && (
              <div className="flex justify-center">
                  <button onClick={onEndTurn} className="relative overflow-hidden btn-angular btn-start text-white font-bold py-2 px-6 text-base transition-transform transform hover:scale-105 end-turn-countdown">
                      End Turn
                  </button>
              </div>
          )}
      </div>
  );

  return (
    <>
      <GameLog log={game.log} players={game.players} currentUserId={playerId} gameMode={game.gameMode} />
      {incomingShotExplosion && <Explosion key={incomingShotExplosion.key} rect={incomingShotExplosion.rect} />}
      <div ref={gameContainerRef} tabIndex={-1} className={`min-h-screen w-full command-background text-white p-2 sm:p-4 md:p-6 fade-in outline-none in-game-view ${viewMode === 'mobile' ? 'mobile-view' : ''}`}>
        <div className="command-background-dots"></div>
        {shotAnimation && <Cannonball startRect={shotAnimation.startRect} endRect={shotAnimation.endRect} />}
        {explosion && <Explosion rect={explosion} />}
        {repairAnimation && <RepairEffect key={repairAnimation.key} rect={repairAnimation.rect} />}
        {skillAnimation?.type === 'shield_form' && skillAnimation.rect && <ShieldEffect key={skillAnimation.key} rect={skillAnimation.rect} type="form" />}
        {skillAnimation?.type === 'shield_break' && skillAnimation.rect && <ShieldEffect key={skillAnimation.key} rect={skillAnimation.rect} type="break" />}
        {skillAnimation?.type === 'radar' && skillAnimation.rects && skillAnimation.rects.map((rect, i) => (
            <RadarSweepEffect key={`${skillAnimation.key}-${i}`} rect={rect} />
        ))}
        {skillAnimation?.type === 'jam' && skillAnimation.rect && <JamWaveEffect key={skillAnimation.key} rect={skillAnimation.rect} />}
        {staticBurst && <StaticBurstEffect key={staticBurst.key} rect={staticBurst.rect} />}
        {game.gameMode === 'TACTICAL' && <HelpTab isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />}
        <div className="max-w-screen-2xl mx-auto">
          <header className="relative z-30 flex items-center justify-between mb-4 command-panel p-2 gap-2">
              <div className="flex items-center gap-3 flex-shrink-0">
                  <div>
                      <h1 className="text-xl font-bold text-cyan-400 tracking-wider whitespace-nowrap command-title">
                          {game.gameMode === 'CLASSIC' ? 'CLASSIC BATTLE' : 'TACTICAL COMMAND'}
                      </h1>
                      <p className="text-xs text-slate-400 mt-0.5 min-h-[18px]">{statusMessage}</p>
                  </div>
                  <div className="text-center p-1.5 rounded-md bg-slate-900/50 border border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Turn {game.turn}</p>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                          {isAITurn && canTakeAction && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-50"></div>}
                          <h2 className={`text-base font-bold truncate max-w-[100px] ${turnIndicatorColor}`}>
                              {turnPlayer?.name || 'Unknown'}
                          </h2>
                      </div>
                  </div>
              </div>
              
              {viewMode === 'desktop' && centerHubContent}

              <div className="flex items-center gap-2 flex-shrink-0">
                  {game.gameMode === 'TACTICAL' && (
                      <button
                          onClick={() => setIsHelpOpen(true)}
                          className="btn-angular bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 p-3"
                          aria-label="Open Tactical Guide"
                      >
                          <HelpIcon className="w-6 h-6" />
                      </button>
                  )}
                  <button
                      onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
                      className="btn-angular bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 p-3"
                      aria-label={`Switch to ${viewMode === 'desktop' ? 'mobile' : 'desktop'} view`}
                  >
                      {viewMode === 'desktop' ? <MobileIcon className="w-6 h-6" /> : <DesktopIcon className="w-6 h-6" />}
                  </button>
                  <button
                      onClick={toggleFullscreen}
                      className="btn-angular bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 p-3"
                      aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                      <FullscreenIcon className="w-6 h-6" isFullscreen={isFullscreen} />
                  </button>
                  <button 
                      onClick={handleSurrender} 
                      className="btn-angular btn-red flex items-center gap-2 p-3"
                      aria-label="Surrender Game"
                  >
                      <ExitIcon className="w-6 h-6" />
                      <span className="hidden sm:inline font-bold">Surrender</span>
                  </button>
              </div>
          </header>
          
          <div className="main-game-layout flex flex-col lg:flex-row gap-6 mt-2">
              {viewMode === 'desktop' ? (
                  <>
                      <div className="lg:w-1/2 player-grid-container">{playerGridContent}</div>
                      <div className="lg:w-1/2 opponent-grid-container">{opponentGridContent}</div>
                  </>
              ) : (
                  <>
                      <div className="opponent-grid-container">{opponentGridContent}</div>
                      {centerHubContent}
                      <div className="player-grid-container">{playerGridContent}</div>
                  </>
              )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isSurrenderModalOpen}
        onConfirm={() => {
          onSurrender();
          setIsSurrenderModalOpen(false);
        }}
        onCancel={() => setIsSurrenderModalOpen(false)}
        title="Confirm Surrender"
        message="Are you sure you wish to forfeit the match? This action cannot be undone."
        confirmText="Surrender"
        confirmButtonClass="btn-red"
      />
    </>
  );
};

export default GamePhaseComponent;
